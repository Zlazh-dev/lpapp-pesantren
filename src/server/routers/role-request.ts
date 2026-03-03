import { z } from 'zod'
import { Role, type Prisma, type RoleRequestStatus } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { pageProtectedProcedure, hasRole, protectedProcedure, publicProcedure, router, type Context } from '../trpc'
import {
    roleRequestTokenReasonToMessage,
    validateRoleRequestToken,
} from '../invite-link'

const userManagementProcedure = pageProtectedProcedure('/user-management/users')
const adminProcedure = userManagementProcedure.use(({ ctx, next }) => {
    if (!hasRole(ctx, 'ADMIN')) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Akses ditolak. Role yang diperlukan: ADMIN',
        })
    }
    return next({ ctx })
})

function toLegacyRoleOrFallback(roleCode: string, fallback: Role): Role {
    const legacyRoles = Object.values(Role)
    return legacyRoles.includes(roleCode as Role) ? (roleCode as Role) : fallback
}

async function createRoleRequestForUser(
    tx: Prisma.TransactionClient,
    userId: string,
    requestedRoleCodesInput: string[],
    note?: string
) {
    const requestedCodes = [...new Set(requestedRoleCodesInput.map((code) => code.toUpperCase().trim()))]
    if (requestedCodes.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pilih minimal satu role.' })
    }

    const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, isEnabled: true },
    })
    if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pengguna tidak ditemukan.' })
    }
    if (user.isEnabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Akun sudah diaktifkan admin.' })
    }

    const existingPending = await tx.roleRequest.findFirst({
        where: { userId, status: 'PENDING' },
        select: { id: true },
    })
    if (existingPending) {
        throw new TRPCError({
            code: 'CONFLICT',
            message: 'Permintaan role masih menunggu verifikasi admin.',
        })
    }

    const roles = await tx.roleEntry.findMany({
        where: { code: { in: requestedCodes } },
        select: { code: true },
    })
    const validCodes = roles.map((role) => role.code)
    if (validCodes.length !== requestedCodes.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Role yang dipilih tidak valid.' })
    }

    const request = await tx.roleRequest.create({
        data: {
            userId,
            requestedRoleCodes: validCodes,
            note: note?.trim() || null,
            status: 'PENDING',
        },
        select: {
            id: true,
            status: true,
            requestedRoleCodes: true,
            createdAt: true,
        },
    })

    return request
}

type SubmitByTokenInput = {
    requestToken: string
    requestedRoleCodes: string[]
    note?: string
}

type ListRoleRequestsInput = {
    page?: number
    limit?: number
    search?: string
    status?: RoleRequestStatus
} | undefined

type ReviewRoleRequestInput = {
    id: string
    action: 'APPROVE' | 'REJECT'
    note?: string
}

async function submitRoleRequestByTokenImpl(ctx: Context, input: SubmitByTokenInput) {
    const initialValidation = await validateRoleRequestToken(ctx.prisma, input.requestToken)
    if (!initialValidation.valid) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: roleRequestTokenReasonToMessage(initialValidation.reason),
        })
    }

    const result = await ctx.prisma.$transaction(async (tx) => {
        const tokenValidation = await validateRoleRequestToken(tx, input.requestToken)
        if (!tokenValidation.valid) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: roleRequestTokenReasonToMessage(tokenValidation.reason),
            })
        }

        const request = await createRoleRequestForUser(
            tx,
            tokenValidation.tokenRecord.userId,
            input.requestedRoleCodes,
            input.note
        )

        await tx.roleRequestToken.update({
            where: { id: tokenValidation.tokenRecord.id },
            data: { usedAt: new Date() },
        })

        return request
    })

    return {
        success: true,
        requestId: result.id,
        status: result.status,
    }
}

async function listRoleRequestsImpl(ctx: Context, input: ListRoleRequestsInput) {
    const page = input?.page ?? 1
    const limit = input?.limit ?? 20
    const status = input?.status as RoleRequestStatus | undefined
    const search = input?.search

    const where: Prisma.RoleRequestWhereInput = {
        ...(status ? { status } : {}),
        ...(search
            ? {
                user: {
                    OR: [
                        { fullName: { contains: search, mode: 'insensitive' as const } },
                        { username: { contains: search, mode: 'insensitive' as const } },
                    ],
                },
            }
            : {}),
    }

    const [rows, total] = await Promise.all([
        ctx.prisma.roleRequest.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        isEnabled: true,
                    },
                },
                reviewedBy: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                    },
                },
            },
            skip: (page - 1) * limit,
            take: limit,
        }),
        ctx.prisma.roleRequest.count({ where }),
    ])

    return {
        data: rows,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    }
}

async function reviewRoleRequestImpl(ctx: Context, input: ReviewRoleRequestInput) {
    return ctx.prisma.$transaction(async (tx) => {
        const request = await tx.roleRequest.findUnique({
            where: { id: input.id },
            include: {
                user: {
                    select: {
                        id: true,
                        role: true,
                    },
                },
            },
        })

        if (!request) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Permintaan role tidak ditemukan.' })
        }
        if (request.status !== 'PENDING') {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Permintaan role sudah diproses.' })
        }

        const now = new Date()
        const reviewNote = input.note?.trim() || null

        if (input.action === 'APPROVE') {
            const roleEntries = await tx.roleEntry.findMany({
                where: { code: { in: request.requestedRoleCodes } },
                select: { id: true, code: true },
            })
            if (roleEntries.length === 0) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Role yang diminta tidak valid.' })
            }

            const roleByCode = new Map(roleEntries.map((role) => [role.code, role]))
            const orderedRoleEntries = request.requestedRoleCodes
                .map((code) => roleByCode.get(code))
                .filter((role): role is { id: string; code: string } => Boolean(role))

            if (orderedRoleEntries.length === 0) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Role yang diminta tidak tersedia.' })
            }

            await tx.userRole.deleteMany({
                where: { userId: request.userId },
            })

            await tx.userRole.createMany({
                data: orderedRoleEntries.map((role) => ({
                    userId: request.userId,
                    roleId: role.id,
                })),
            })

            await tx.user.update({
                where: { id: request.userId },
                data: {
                    isEnabled: true,
                    enabledAt: now,
                    enabledByUserId: ctx.session!.user.id,
                    disabledReason: null,
                    role: toLegacyRoleOrFallback(orderedRoleEntries[0].code, request.user.role),
                },
            })

            const approved = await tx.roleRequest.update({
                where: { id: request.id },
                data: {
                    status: 'APPROVED',
                    reviewerUserId: ctx.session!.user.id,
                    reviewedAt: now,
                    reviewNote,
                },
                include: {
                    user: { select: { id: true, fullName: true, username: true, isEnabled: true } },
                },
            })

            await tx.roleRequest.updateMany({
                where: {
                    userId: request.userId,
                    status: 'PENDING',
                    id: { not: request.id },
                },
                data: {
                    status: 'REJECTED',
                    reviewerUserId: ctx.session!.user.id,
                    reviewedAt: now,
                    reviewNote: 'Permintaan role lain sudah disetujui.',
                },
            })

            return approved
        }

        await tx.user.update({
            where: { id: request.userId },
            data: {
                isEnabled: false,
                disabledReason: reviewNote ?? 'Permintaan role ditolak.',
            },
        })

        return tx.roleRequest.update({
            where: { id: request.id },
            data: {
                status: 'REJECTED',
                reviewerUserId: ctx.session!.user.id,
                reviewedAt: now,
                reviewNote,
            },
            include: {
                user: { select: { id: true, fullName: true, username: true, isEnabled: true } },
            },
        })
    })
}

export const roleRequestRouter = router({
    getPublicFormContext: publicProcedure
        .input(z.object({ requestToken: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const tokenValidation = await validateRoleRequestToken(ctx.prisma, input.requestToken)
            if (!tokenValidation.valid) {
                return {
                    valid: false,
                    reason: roleRequestTokenReasonToMessage(tokenValidation.reason),
                }
            }

            const [user, roles, pendingRequest] = await Promise.all([
                ctx.prisma.user.findUnique({
                    where: { id: tokenValidation.tokenRecord.userId },
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        isEnabled: true,
                    },
                }),
                ctx.prisma.roleEntry.findMany({
                    orderBy: { code: 'asc' },
                    select: { code: true, name: true },
                }),
                ctx.prisma.roleRequest.findFirst({
                    where: {
                        userId: tokenValidation.tokenRecord.userId,
                        status: 'PENDING',
                    },
                    select: {
                        id: true,
                        requestedRoleCodes: true,
                        note: true,
                        createdAt: true,
                    },
                }),
            ])

            if (!user) {
                return {
                    valid: false,
                    reason: 'Data pengguna tidak ditemukan.',
                }
            }

            return {
                valid: true,
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    username: user.username,
                    isEnabled: user.isEnabled,
                },
                roles,
                pendingRequest,
            }
        }),

    // Final API (pending user authenticated via session).
    submitRoleRequest: protectedProcedure
        .input(
            z.object({
                requestedRoleCodes: z.array(z.string().trim().min(1)).min(1),
                note: z.string().max(500).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const result = await ctx.prisma.$transaction((tx) =>
                createRoleRequestForUser(tx, ctx.session.user.id, input.requestedRoleCodes, input.note)
            )

            return {
                success: true,
                requestId: result.id,
                status: result.status,
            }
        }),

    // Public token flow used directly after invite registration.
    submitRoleRequestByToken: publicProcedure
        .input(
            z.object({
                requestToken: z.string().min(1),
                requestedRoleCodes: z.array(z.string().trim().min(1)).min(1),
                note: z.string().max(500).optional(),
            })
        )
        .mutation(({ ctx, input }) => submitRoleRequestByTokenImpl(ctx, input)),

    listRoleRequests: adminProcedure
        .input(
            z
                .object({
                    page: z.number().int().min(1).default(1),
                    limit: z.number().int().min(1).max(100).default(20),
                    search: z.string().trim().optional(),
                    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
                })
                .optional()
        )
        .query(({ ctx, input }) => listRoleRequestsImpl(ctx, input)),

    reviewRoleRequest: adminProcedure
        .input(
            z.object({
                id: z.string().min(1),
                action: z.enum(['APPROVE', 'REJECT']),
                note: z.string().max(500).optional(),
            })
        )
        .mutation(({ ctx, input }) => reviewRoleRequestImpl(ctx, input)),

    // Backward compatibility.
    createPublic: publicProcedure
        .input(
            z.object({
                requestToken: z.string().min(1),
                requestedRoleCodes: z.array(z.string().trim().min(1)).min(1),
                note: z.string().max(500).optional(),
            })
        )
        .mutation(({ ctx, input }) => submitRoleRequestByTokenImpl(ctx, input)),

    listPending: adminProcedure
        .input(
            z
                .object({
                    page: z.number().int().min(1).default(1),
                    limit: z.number().int().min(1).max(100).default(20),
                    search: z.string().trim().optional(),
                    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
                })
                .optional()
        )
        .query(({ ctx, input }) => listRoleRequestsImpl(ctx, {
            page: input?.page,
            limit: input?.limit,
            search: input?.search,
            status: input?.status,
        })),

    review: adminProcedure
        .input(
            z.object({
                requestId: z.string().min(1),
                action: z.enum(['APPROVE', 'REJECT']),
                reviewNote: z.string().max(500).optional(),
            })
        )
        .mutation(({ ctx, input }) =>
            reviewRoleRequestImpl(ctx, {
                id: input.requestId,
                action: input.action,
                note: input.reviewNote,
            })
        ),
})
