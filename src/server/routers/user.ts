import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { router, protectedProcedure, pageProtectedProcedure, hasRole } from '../trpc'
import { TRPCError } from '@trpc/server'
import { saveFileLocally, deleteLocalFile } from '@/lib/upload'

const adminUsersProcedure = pageProtectedProcedure('/user-management/users').use(({ ctx, next }) => {
    if (!hasRole(ctx, 'ADMIN')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Akses ditolak. Role yang diperlukan: ADMIN' })
    }
    return next({ ctx })
})

export const userRouter = router({
    list: adminUsersProcedure
        .query(async ({ ctx }) => {
            return ctx.prisma.user.findMany({
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    phone: true,
                    photoUrl: true,
                    role: true,
                    isActive: true,
                    isEnabled: true,
                    userRoles: {
                        include: { role: { select: { id: true, code: true, name: true } } },
                    },
                    createdAt: true,
                },
                orderBy: { fullName: 'asc' },
            })
        }),

    getById: adminUsersProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.findUnique({
                where: { id: input },
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    phone: true,
                    photoUrl: true,
                    role: true,
                    isActive: true,
                    isEnabled: true,
                    enabledAt: true,
                    enabledByUserId: true,
                    disabledReason: true,
                    supervisedRooms: { select: { id: true, name: true } },
                    waliKelasOf: { select: { id: true, name: true } },
                    userRoles: {
                        include: { role: { select: { id: true, code: true, name: true } } },
                    },
                    roleScopes: {
                        select: {
                            id: true,
                            roleCode: true,
                            scopeType: true,
                            scopeId: true,
                        },
                    },
                    createdAt: true,
                    updatedAt: true,
                },
            })
            if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User tidak ditemukan' })
            return user
        }),

    create: adminUsersProcedure
        .input(z.object({
            username: z.string().min(3),
            password: z.string().min(6),
            fullName: z.string().min(2),
            phone: z.string().optional(),
            roleIds: z.array(z.string()).min(1, 'Pilih minimal 1 role'),
        }))
        .mutation(async ({ ctx, input }) => {
            const { roleIds, ...rest } = input
            const hashedPassword = await bcrypt.hash(rest.password, 12)

            // Check duplicate username
            const existing = await ctx.prisma.user.findUnique({ where: { username: rest.username } })
            if (existing) throw new TRPCError({ code: 'CONFLICT', message: `Username "${rest.username}" sudah digunakan` })

            // Determine legacy role from the first assigned role entry
            const firstRole = await ctx.prisma.roleEntry.findUnique({ where: { id: roleIds[0] } })
            const legacyRole = firstRole?.code ?? 'STAF_PENDATAAN'

            return ctx.prisma.user.create({
                data: {
                    username: rest.username,
                    password: hashedPassword,
                    fullName: rest.fullName,
                    phone: rest.phone ?? null,
                    role: legacyRole as any,
                    isEnabled: true,
                    enabledAt: new Date(),
                    enabledByUserId: ctx.session.user.id,
                    disabledReason: null,
                    userRoles: {
                        create: roleIds.map(roleId => ({ roleId })),
                    },
                },
            })
        }),

    update: adminUsersProcedure
        .input(z.object({
            id: z.string(),
            fullName: z.string().min(2).optional(),
            phone: z.string().nullable().optional(),
            isActive: z.boolean().optional(),
            isEnabled: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input

            // If enabling, record who/when
            const extra: Record<string, any> = {}
            if (data.isEnabled === true) {
                extra.enabledAt = new Date()
                extra.enabledByUserId = ctx.session.user.id
                extra.disabledReason = null
            }
            if (data.isEnabled === false) {
                extra.enabledAt = null
                extra.enabledByUserId = null
            }

            return ctx.prisma.user.update({ where: { id }, data: { ...data, ...extra } })
        }),

    updateRoles: adminUsersProcedure
        .input(z.object({
            userId: z.string(),
            roleIds: z.array(z.string()),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.$transaction(async (tx) => {
                await tx.userRole.deleteMany({ where: { userId: input.userId } })
                if (input.roleIds.length > 0) {
                    await tx.userRole.createMany({
                        data: input.roleIds.map(roleId => ({ userId: input.userId, roleId })),
                    })
                }

                // Also update legacy role field from first selected role
                if (input.roleIds.length > 0) {
                    const firstRole = await tx.roleEntry.findUnique({ where: { id: input.roleIds[0] } })
                    if (firstRole) {
                        await tx.user.update({
                            where: { id: input.userId },
                            data: { role: firstRole.code as any },
                        })
                    }
                }

                return tx.user.findUnique({
                    where: { id: input.userId },
                    include: {
                        userRoles: { include: { role: true } },
                        roleScopes: true,
                    },
                })
            })
        }),

    resetPassword: adminUsersProcedure
        .input(z.object({
            id: z.string(),
            newPassword: z.string().min(6),
        }))
        .mutation(async ({ ctx, input }) => {
            const hashedPassword = await bcrypt.hash(input.newPassword, 12)
            return ctx.prisma.user.update({
                where: { id: input.id },
                data: { password: hashedPassword },
            })
        }),

    delete: adminUsersProcedure
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            if (input === ctx.session.user.id) throw new Error('Tidak dapat menghapus akun sendiri')
            return ctx.prisma.user.delete({ where: { id: input } })
        }),

    uploadPhoto: adminUsersProcedure
        .input(z.object({
            userId: z.string(),
            base64: z.string(),
            filename: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Delete old photo if exists
            const user = await ctx.prisma.user.findUnique({ where: { id: input.userId }, select: { photoUrl: true } })
            if (user?.photoUrl) {
                await deleteLocalFile(user.photoUrl)
            }

            // Save new photo
            const buffer = Buffer.from(input.base64, 'base64')
            const ext = input.filename.split('.').pop() ?? 'jpg'
            const { url } = await saveFileLocally(buffer, 'photo', ext)

            return ctx.prisma.user.update({
                where: { id: input.userId },
                data: { photoUrl: url },
            })
        }),

    removePhoto: adminUsersProcedure
        .input(z.string()) // userId
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.findUnique({ where: { id: input }, select: { photoUrl: true } })
            if (user?.photoUrl) {
                await deleteLocalFile(user.photoUrl)
            }
            return ctx.prisma.user.update({
                where: { id: input },
                data: { photoUrl: null },
            })
        }),

    changeOwnPassword: protectedProcedure
        .input(z.object({
            currentPassword: z.string(),
            newPassword: z.string().min(6),
        }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.findUnique({
                where: { id: ctx.session.user.id },
            })
            if (!user) throw new Error('User tidak ditemukan')

            const isValid = await bcrypt.compare(input.currentPassword, user.password)
            if (!isValid) throw new Error('Password lama salah')

            const hashedPassword = await bcrypt.hash(input.newPassword, 12)
            return ctx.prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            })
        }),

    // ==================== ROLE MANAGEMENT ====================
    roles: router({
        list: adminUsersProcedure.query(async ({ ctx }) => {
            return ctx.prisma.roleEntry.findMany({
                include: { _count: { select: { userRoles: true } } },
                orderBy: { code: 'asc' },
            })
        }),

        create: adminUsersProcedure
            .input(z.object({
                code: z.string().min(1),
                name: z.string().min(1),
            }))
            .mutation(async ({ ctx, input }) => {
                const existing = await ctx.prisma.roleEntry.findUnique({ where: { code: input.code } })
                if (existing) throw new TRPCError({ code: 'CONFLICT', message: `Role "${input.code}" sudah ada` })
                return ctx.prisma.roleEntry.create({ data: input })
            }),

        delete: adminUsersProcedure
            .input(z.string()) // roleId
            .mutation(async ({ ctx, input }) => {
                const role = await ctx.prisma.roleEntry.findUnique({
                    where: { id: input },
                    include: { _count: { select: { userRoles: true } } },
                })
                if (!role) throw new TRPCError({ code: 'NOT_FOUND', message: 'Role tidak ditemukan' })
                if (role._count.userRoles > 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Role masih digunakan oleh user' })
                return ctx.prisma.roleEntry.delete({ where: { id: input } })
            }),
    }),

    // ==================== SCOPE MANAGEMENT ====================
    scope: router({
        list: adminUsersProcedure
            .input(z.string()) // userId
            .query(async ({ ctx, input }) => {
                return ctx.prisma.roleScope.findMany({
                    where: { userId: input },
                    orderBy: { createdAt: 'desc' },
                })
            }),

        assign: adminUsersProcedure
            .input(z.object({
                userId: z.string(),
                roleCode: z.string(),
                scopeType: z.enum(['CLASS_GROUP', 'DORM_ROOM', 'DORM_BUILDING', 'DORM_COMPLEX']),
                scopeId: z.string(),
            }))
            .mutation(async ({ ctx, input }) => {
                // Validate roleCode exists
                const role = await ctx.prisma.roleEntry.findFirst({ where: { code: input.roleCode } })
                if (!role) throw new TRPCError({ code: 'NOT_FOUND', message: `Role "${input.roleCode}" tidak ditemukan` })

                // Validate scopeId exists in target table
                if (input.scopeType === 'CLASS_GROUP') {
                    const cg = await ctx.prisma.classGroup.findUnique({ where: { id: input.scopeId } })
                    if (!cg) throw new TRPCError({ code: 'NOT_FOUND', message: 'Rombel tidak ditemukan' })
                } else if (input.scopeType === 'DORM_ROOM') {
                    const room = await ctx.prisma.dormRoom.findUnique({ where: { id: parseInt(input.scopeId) } })
                    if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Kamar tidak ditemukan' })
                } else if (input.scopeType === 'DORM_BUILDING') {
                    const bldg = await ctx.prisma.dormBuilding.findUnique({ where: { id: parseInt(input.scopeId) } })
                    if (!bldg) throw new TRPCError({ code: 'NOT_FOUND', message: 'Gedung tidak ditemukan' })
                } else if (input.scopeType === 'DORM_COMPLEX') {
                    const complex = await ctx.prisma.dormComplex.findUnique({ where: { id: parseInt(input.scopeId) } })
                    if (!complex) throw new TRPCError({ code: 'NOT_FOUND', message: 'Kompleks tidak ditemukan' })
                }

                // Check duplicate
                const existing = await ctx.prisma.roleScope.findFirst({
                    where: {
                        userId: input.userId,
                        roleCode: input.roleCode,
                        scopeType: input.scopeType,
                        scopeId: input.scopeId,
                    },
                })
                if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Scope assignment sudah ada' })

                return ctx.prisma.roleScope.create({ data: input })
            }),

        remove: adminUsersProcedure
            .input(z.string()) // scopeId
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.roleScope.delete({ where: { id: input } })
            }),
    }),
})
