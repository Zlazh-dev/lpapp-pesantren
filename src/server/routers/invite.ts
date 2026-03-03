import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { pageProtectedProcedure, hasRole, publicProcedure, router } from '../trpc'
import {
    createSecureToken,
    inviteValidationReasonToMessage,
    validateInviteToken,
} from '../invite-link'

const userManagementProcedure = pageProtectedProcedure('/user-management/invite-links')
const adminProcedure = userManagementProcedure.use(({ ctx, next }) => {
    if (!hasRole(ctx, 'ADMIN')) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Akses ditolak. Role yang diperlukan: ADMIN',
        })
    }
    return next({ ctx })
})

function resolvePublicBaseUrl(headers: Headers): string {
    const explicitOrigin = headers.get('origin')
    if (explicitOrigin) return explicitOrigin

    const forwardedHost = headers.get('x-forwarded-host') ?? headers.get('host')
    if (forwardedHost) {
        const forwardedProto = headers.get('x-forwarded-proto') ?? 'http'
        return `${forwardedProto}://${forwardedHost}`
    }

    return process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
}

export const inviteRouter = router({
    createInviteLink: adminProcedure
        .input(
            z.object({
                expiry: z.coerce.date(),
                useLimit: z.number().int().min(1).max(1000).nullable().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            if (input.expiry <= new Date()) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Masa berlaku link harus di masa depan.' })
            }

            const { token, tokenHash } = createSecureToken()
            const created = await ctx.prisma.userInviteLink.create({
                data: {
                    tokenHash,
                    createdByUserId: ctx.session.user.id,
                    expiry: input.expiry,
                    useLimit: input.useLimit ?? null,
                },
                select: {
                    id: true,
                    expiry: true,
                    useLimit: true,
                    usedCount: true,
                    isRevoked: true,
                },
            })

            const baseUrl = resolvePublicBaseUrl(ctx.headers)
            return {
                ...created,
                token,
                url: `${baseUrl}/register/${token}`,
            }
        }),

    revokeInviteLink: adminProcedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.userInviteLink.update({
                where: { id: input.id },
                data: { isRevoked: true },
                select: {
                    id: true,
                    isRevoked: true,
                    expiry: true,
                    usedCount: true,
                    useLimit: true,
                },
            })
        }),

    listInviteLinks: adminProcedure
        .query(async ({ ctx }) => {
            const rows = await ctx.prisma.userInviteLink.findMany({
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    expiry: true,
                    isRevoked: true,
                    useLimit: true,
                    usedCount: true,
                    createdAt: true,
                    createdBy: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                        },
                    },
                },
            })

            const now = Date.now()
            return rows.map((row) => ({
                ...row,
                isExpired: row.expiry.getTime() <= now,
                isLimitReached: row.useLimit !== null && row.usedCount >= row.useLimit,
            }))
        }),

    validateInviteToken: publicProcedure
        .input(z.object({ token: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const validation = await validateInviteToken(ctx.prisma, input.token)
            if (!validation.valid) {
                return {
                    valid: false,
                    reason: inviteValidationReasonToMessage(validation.reason),
                }
            }

            return {
                valid: true,
                expiry: validation.invite.expiry,
                useLimit: validation.invite.useLimit,
                usedCount: validation.invite.usedCount,
            }
        }),

    // Backward compatibility.
    generate: adminProcedure
        .input(
            z.object({
                expiresInDays: z.number().int().min(1).max(90),
                maxUses: z.number().int().min(1).max(1000).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const now = new Date()
            const expiry = new Date(now)
            expiry.setDate(expiry.getDate() + input.expiresInDays)
            const { token, tokenHash } = createSecureToken()

            await ctx.prisma.userInviteLink.create({
                data: {
                    tokenHash,
                    createdByUserId: ctx.session.user.id,
                    expiry,
                    useLimit: input.maxUses ?? null,
                },
            })

            const baseUrl = resolvePublicBaseUrl(ctx.headers)
            return {
                url: `${baseUrl}/register/${token}`,
                expiry,
                maxUses: input.maxUses ?? null,
            }
        }),

    validateToken: publicProcedure
        .input(z.object({ token: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const validation = await validateInviteToken(ctx.prisma, input.token)
            if (!validation.valid) {
                return {
                    valid: false,
                    reason: inviteValidationReasonToMessage(validation.reason),
                }
            }
            return { valid: true }
        }),
})
