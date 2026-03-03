import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

const VALID_SECTIONS = ['KEUANGAN', 'AKADEMIK'] as const

export const sectionMemberRouter = router({
    /** Add a santri to a section by NIS lookup */
    addByNis: protectedProcedure
        .input(z.object({
            nis: z.string().min(1, 'NIS tidak boleh kosong'),
            section: z.enum(VALID_SECTIONS),
        }))
        .mutation(async ({ ctx, input }) => {
            // Find santri by NIS
            const santri = await ctx.prisma.santri.findUnique({
                where: { nis: input.nis },
                select: { id: true, fullName: true, nis: true, isActive: true },
            })
            if (!santri) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Santri dengan NIS tersebut tidak ditemukan. Pastikan santri sudah terdaftar di Data Pusat.',
                })
            }
            if (!santri.isActive) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Santri ini sudah tidak aktif (alumni/nonaktif).',
                })
            }

            // Check if already a member
            const existing = await ctx.prisma.sectionMember.findUnique({
                where: { santriId_section: { santriId: santri.id, section: input.section } },
            })
            if (existing) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Santri "${santri.fullName}" sudah terdaftar di bagian ${input.section === 'KEUANGAN' ? 'Perbendaharaan' : 'Madrasah'}.`,
                })
            }

            await ctx.prisma.sectionMember.create({
                data: {
                    santriId: santri.id,
                    section: input.section,
                    addedBy: ctx.session.user.id,
                },
            })

            return { santri }
        }),

    /** Remove a santri from a section */
    remove: protectedProcedure
        .input(z.object({
            santriId: z.string(),
            section: z.enum(VALID_SECTIONS),
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.prisma.sectionMember.deleteMany({
                where: { santriId: input.santriId, section: input.section },
            })
            return { success: true }
        }),

    /** Bulk add santri to a section by NIS, optionally set classGroup */
    bulkAddByNis: protectedProcedure
        .input(z.object({
            section: z.enum(VALID_SECTIONS),
            rows: z.array(z.object({
                nis: z.string().min(1),
                fullName: z.string().min(1),
                className: z.string().optional(),
            })).min(1).max(1000),
        }))
        .mutation(async ({ ctx, input }) => {
            let added = 0
            let skipped = 0
            let classUpdated = 0
            const errors: { row: number; nis: string; message: string }[] = []

            // Pre-fetch class groups for name matching
            const classGroups = await ctx.prisma.classGroup.findMany({
                where: { isActive: true },
                select: { id: true, name: true },
            })
            const classMap = new Map(classGroups.map(c => [c.name.toLowerCase().trim(), c.id]))

            for (let i = 0; i < input.rows.length; i++) {
                const row = input.rows[i]
                try {
                    const santri = await ctx.prisma.santri.findUnique({
                        where: { nis: row.nis.trim() },
                        select: { id: true, fullName: true, isActive: true },
                    })
                    if (!santri) {
                        errors.push({ row: i + 2, nis: row.nis, message: 'NIS tidak ditemukan di Data Pusat' })
                        continue
                    }
                    if (!santri.isActive) {
                        errors.push({ row: i + 2, nis: row.nis, message: 'Santri sudah tidak aktif' })
                        continue
                    }

                    // Add to section (skip if already exists)
                    const existing = await ctx.prisma.sectionMember.findUnique({
                        where: { santriId_section: { santriId: santri.id, section: input.section } },
                    })
                    if (existing) {
                        skipped++
                    } else {
                        await ctx.prisma.sectionMember.create({
                            data: { santriId: santri.id, section: input.section, addedBy: ctx.session.user.id },
                        })
                        added++
                    }

                    // Update class if provided
                    if (row.className) {
                        const classId = classMap.get(row.className.toLowerCase().trim())
                        if (classId) {
                            await ctx.prisma.santri.update({
                                where: { id: santri.id },
                                data: { classGroupId: classId },
                            })
                            classUpdated++
                        }
                    }
                } catch (e: any) {
                    errors.push({ row: i + 2, nis: row.nis, message: e.message?.substring(0, 100) || 'Unknown error' })
                }
            }

            return { added, skipped, classUpdated, errors, total: input.rows.length }
        }),

    /** List santri for a section (with search, pagination, filters) */
    list: protectedProcedure
        .input(z.object({
            section: z.enum(VALID_SECTIONS),
            search: z.string().optional(),
            dormRoomId: z.number().optional(),
            classGroupId: z.string().optional(),
            page: z.number().min(1).default(1),
            limit: z.number().min(1).max(100).default(20),
        }))
        .query(async ({ ctx, input }) => {
            const { section, search, dormRoomId, classGroupId, page, limit } = input

            const memberWhere: any = { section }
            const santriWhere: any = { isActive: true }

            if (search) {
                santriWhere.OR = [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { nis: { contains: search, mode: 'insensitive' } },
                ]
            }
            if (dormRoomId) santriWhere.dormRoomId = dormRoomId
            if (classGroupId) santriWhere.classGroupId = classGroupId

            const where = {
                ...memberWhere,
                santri: santriWhere,
            }

            const [members, total] = await Promise.all([
                ctx.prisma.sectionMember.findMany({
                    where,
                    include: {
                        santri: {
                            include: {
                                dormRoom: {
                                    include: {
                                        floor: {
                                            include: { building: true },
                                        },
                                    },
                                },
                                classGroup: {
                                    include: {
                                        grade: { include: { level: true } },
                                        schoolYear: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { santri: { fullName: 'asc' } },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                ctx.prisma.sectionMember.count({ where }),
            ])

            return {
                items: members.map(m => m.santri),
                total,
                page,
                totalPages: Math.ceil(total / limit),
            }
        }),

    /** Scan QR code (contains NIS) — check section membership, auto-add if needed, return santriId */
    scanQr: protectedProcedure
        .input(z.object({
            nis: z.string().min(1),
            section: z.enum(VALID_SECTIONS),
        }))
        .mutation(async ({ ctx, input }) => {
            const santri = await ctx.prisma.santri.findUnique({
                where: { nis: input.nis },
                select: { id: true, fullName: true, nis: true, isActive: true },
            })
            if (!santri) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Santri dengan NIS "${input.nis}" tidak ditemukan di Data Pusat.`,
                })
            }
            if (!santri.isActive) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Santri "${santri.fullName}" sudah tidak aktif (alumni/nonaktif).`,
                })
            }

            const existing = await ctx.prisma.sectionMember.findUnique({
                where: { santriId_section: { santriId: santri.id, section: input.section } },
            })

            if (!existing) {
                await ctx.prisma.sectionMember.create({
                    data: { santriId: santri.id, section: input.section, addedBy: ctx.session.user.id },
                })
            }

            return { santriId: santri.id, santriName: santri.fullName, wasAdded: !existing }
        }),
})
