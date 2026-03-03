import { z } from 'zod'
import { router, pageProtectedProcedure, hasRole } from '../trpc'
import { TRPCError } from '@trpc/server'

const academicReadProcedure = pageProtectedProcedure(['/akademik/kelas', '/akademik/kelas/manage'])
const academicManageProcedure = pageProtectedProcedure('/akademik/kelas/manage')
const adminProcedure = academicManageProcedure.use(({ ctx, next }) => {
    if (!hasRole(ctx, 'ADMIN')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Akses ditolak. Role yang diperlukan: ADMIN' })
    }
    return next({ ctx })
})

export const academicRouter = router({
    // ==================== ACADEMIC LEVELS ====================
    levels: router({
        list: academicReadProcedure.query(async ({ ctx }) => {
            return ctx.prisma.academicLevel.findMany({
                include: {
                    _count: { select: { grades: true } },
                    grades: {
                        include: { _count: { select: { classGroups: true } } },
                        orderBy: { number: 'asc' },
                    },
                },
                orderBy: { code: 'asc' },
            })
        }),

        create: adminProcedure
            .input(z.object({
                code: z.string().min(1).max(10).transform(s => s.toUpperCase().trim()),
                name: z.string().min(1).max(100).transform(s => s.trim()),
            }))
            .mutation(async ({ ctx, input }) => {
                try {
                    return await ctx.prisma.academicLevel.create({ data: input })
                } catch (e: any) {
                    if (e.code === 'P2002') throw new TRPCError({ code: 'CONFLICT', message: `Jenjang dengan kode "${input.code}" sudah ada` })
                    throw e
                }
            }),

        update: adminProcedure
            .input(z.object({
                id: z.string(),
                code: z.string().min(1).max(10).transform(s => s.toUpperCase().trim()).optional(),
                name: z.string().min(1).max(100).transform(s => s.trim()).optional(),
            }))
            .mutation(async ({ ctx, input }) => {
                const { id, ...data } = input
                try {
                    return await ctx.prisma.academicLevel.update({ where: { id }, data })
                } catch (e: any) {
                    if (e.code === 'P2002') throw new TRPCError({ code: 'CONFLICT', message: `Kode jenjang sudah digunakan` })
                    throw e
                }
            }),

        delete: adminProcedure
            .input(z.string())
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.academicLevel.delete({ where: { id: input } })
            }),
    }),

    // ==================== GRADES ====================
    grades: router({
        listByLevel: academicReadProcedure
            .input(z.string())
            .query(async ({ ctx, input }) => {
                return ctx.prisma.grade.findMany({
                    where: { levelId: input },
                    include: {
                        _count: { select: { classGroups: true } },
                        level: { select: { code: true, name: true } },
                    },
                    orderBy: { number: 'asc' },
                })
            }),

        create: adminProcedure
            .input(z.object({
                levelId: z.string(),
                number: z.number().int().min(1).max(15),
            }))
            .mutation(async ({ ctx, input }) => {
                try {
                    return await ctx.prisma.grade.create({ data: input })
                } catch (e: any) {
                    if (e.code === 'P2002') throw new TRPCError({ code: 'CONFLICT', message: `Tingkat ${input.number} sudah ada di jenjang ini` })
                    throw e
                }
            }),

        delete: adminProcedure
            .input(z.string())
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.grade.delete({ where: { id: input } })
            }),
    }),

    // ==================== CLASS GROUPS ====================
    classes: router({
        listAll: academicReadProcedure
            .query(async ({ ctx }) => {
                return ctx.prisma.classGroup.findMany({
                    where: { isActive: true },
                    include: {
                        _count: { select: { santri: true } },
                        grade: { select: { number: true, level: { select: { code: true, name: true } } } },
                        schoolYear: { select: { name: true } },
                    },
                    orderBy: [
                        { grade: { level: { code: 'asc' } } },
                        { grade: { number: 'asc' } },
                        { suffix: 'asc' },
                    ],
                })
            }),

        listByGrade: academicReadProcedure
            .input(z.object({
                gradeId: z.string(),
                schoolYearId: z.string().optional(),
            }))
            .query(async ({ ctx, input }) => {
                return ctx.prisma.classGroup.findMany({
                    where: {
                        gradeId: input.gradeId,
                        ...(input.schoolYearId ? { schoolYearId: input.schoolYearId } : {}),
                    },
                    include: {
                        _count: { select: { santri: true } },
                        schoolYear: { select: { name: true } },
                        grade: { select: { number: true, level: { select: { code: true } } } },
                        waliKelas: { select: { id: true, fullName: true, photoUrl: true } },
                    },
                    orderBy: { suffix: 'asc' },
                })
            }),

        getDetail: academicReadProcedure
            .input(z.string())
            .query(async ({ ctx, input }) => {
                const cg = await ctx.prisma.classGroup.findUnique({
                    where: { id: input },
                    include: {
                        grade: { select: { number: true, level: { select: { code: true, name: true } } } },
                        schoolYear: { select: { name: true } },
                        santri: {
                            where: { isActive: true },
                            select: { id: true, fullName: true, nis: true, gender: true, photoUrl: true },
                            orderBy: { fullName: 'asc' },
                        },
                    },
                })
                if (!cg) throw new TRPCError({ code: 'NOT_FOUND', message: 'Rombel tidak ditemukan' })
                return cg
            }),

        createOne: adminProcedure
            .input(z.object({
                gradeId: z.string(),
                schoolYearId: z.string().optional(),
                suffix: z.string().min(1).max(5).transform(s => s.toUpperCase().trim()),
                capacity: z.number().int().positive().optional(),
            }))
            .mutation(async ({ ctx, input }) => {
                const grade = await ctx.prisma.grade.findUnique({
                    where: { id: input.gradeId },
                    include: { level: { select: { code: true } } },
                })
                if (!grade) throw new TRPCError({ code: 'NOT_FOUND', message: 'Grade tidak ditemukan' })

                const name = `${grade.number}${input.suffix}`
                try {
                    return await ctx.prisma.classGroup.create({
                        data: { ...input, name },
                    })
                } catch (e: any) {
                    if (e.code === 'P2002') throw new TRPCError({ code: 'CONFLICT', message: `Rombel "${name}" (suffix "${input.suffix}") sudah ada` })
                    throw e
                }
            }),

        createBulk: adminProcedure
            .input(z.object({
                gradeId: z.string(),
                schoolYearId: z.string().optional(),
                suffixes: z.array(z.string().min(1).max(5)).min(1).max(26),
                capacity: z.number().int().positive().optional(),
            }))
            .mutation(async ({ ctx, input }) => {
                const grade = await ctx.prisma.grade.findUnique({
                    where: { id: input.gradeId },
                    include: { level: { select: { code: true } } },
                })
                if (!grade) throw new TRPCError({ code: 'NOT_FOUND', message: 'Grade tidak ditemukan' })

                const normalizedSuffixes = input.suffixes.map(s => s.toUpperCase().trim())

                // Check for existing duplicates
                const existing = await ctx.prisma.classGroup.findMany({
                    where: {
                        gradeId: input.gradeId,
                        schoolYearId: input.schoolYearId ?? null,
                        suffix: { in: normalizedSuffixes },
                    },
                    select: { suffix: true },
                })
                if (existing.length > 0) {
                    const dupes = existing.map(e => e.suffix).join(', ')
                    throw new TRPCError({ code: 'CONFLICT', message: `Suffix berikut sudah ada: ${dupes}` })
                }

                // Bulk create in transaction
                return ctx.prisma.$transaction(
                    normalizedSuffixes.map(suffix =>
                        ctx.prisma.classGroup.create({
                            data: {
                                gradeId: input.gradeId,
                                schoolYearId: input.schoolYearId,
                                suffix,
                                name: `${grade.number}${suffix}`,
                                capacity: input.capacity,
                                isActive: true,
                            },
                        })
                    )
                )
            }),

        update: adminProcedure
            .input(z.object({
                id: z.string(),
                suffix: z.string().min(1).max(5).transform(s => s.toUpperCase().trim()).optional(),
                capacity: z.number().int().positive().nullable().optional(),
                isActive: z.boolean().optional(),
            }))
            .mutation(async ({ ctx, input }) => {
                const { id, ...data } = input

                // If suffix changed, update name
                if (data.suffix) {
                    const cg = await ctx.prisma.classGroup.findUnique({
                        where: { id },
                        include: { grade: true },
                    })
                    if (!cg) throw new TRPCError({ code: 'NOT_FOUND', message: 'Rombel tidak ditemukan' })
                        ; (data as any).name = `${cg.grade.number}${data.suffix}`
                }

                try {
                    return await ctx.prisma.classGroup.update({ where: { id }, data })
                } catch (e: any) {
                    if (e.code === 'P2002') throw new TRPCError({ code: 'CONFLICT', message: `Suffix sudah digunakan` })
                    throw e
                }
            }),

        delete: adminProcedure
            .input(z.string())
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.classGroup.delete({ where: { id: input } })
            }),

        setWaliKelas: academicManageProcedure
            .input(z.object({
                classGroupId: z.string(),
                userId: z.string().nullable(),
            }))
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.classGroup.update({
                    where: { id: input.classGroupId },
                    data: { waliKelasId: input.userId },
                    include: { waliKelas: { select: { id: true, fullName: true, photoUrl: true } } },
                })
            }),

        listWaliCandidates: academicReadProcedure
            .query(async ({ ctx }) => {
                // Get only users with WALI_KELAS role who could be wali kelas
                const users = await ctx.prisma.user.findMany({
                    where: { isActive: true, isEnabled: true, role: 'WALI_KELAS' },
                    select: {
                        id: true, fullName: true, photoUrl: true, role: true,
                        waliKelasOf: { select: { id: true, name: true } },
                    },
                    orderBy: { fullName: 'asc' },
                })
                return users
            }),
    }),

    // ==================== SCHOOL YEARS ====================
    schoolYears: router({
        list: academicReadProcedure.query(async ({ ctx }) => {
            return ctx.prisma.schoolYear.findMany({
                include: { _count: { select: { classGroups: true } } },
                orderBy: { name: 'desc' },
            })
        }),

        create: adminProcedure
            .input(z.object({
                name: z.string().min(1).max(20).transform(s => s.trim()),
                isActive: z.boolean().default(false),
            }))
            .mutation(async ({ ctx, input }) => {
                try {
                    // If setting active, deactivate others
                    if (input.isActive) {
                        await ctx.prisma.schoolYear.updateMany({ data: { isActive: false } })
                    }
                    return await ctx.prisma.schoolYear.create({ data: input })
                } catch (e: any) {
                    if (e.code === 'P2002') throw new TRPCError({ code: 'CONFLICT', message: `Tahun ajaran "${input.name}" sudah ada` })
                    throw e
                }
            }),

        setActive: adminProcedure
            .input(z.string())
            .mutation(async ({ ctx, input }) => {
                await ctx.prisma.schoolYear.updateMany({ data: { isActive: false } })
                return ctx.prisma.schoolYear.update({ where: { id: input }, data: { isActive: true } })
            }),

        delete: adminProcedure
            .input(z.string())
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.schoolYear.delete({ where: { id: input } })
            }),
    }),
})

