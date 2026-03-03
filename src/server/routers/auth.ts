import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { publicProcedure, router } from '../trpc'
import {
    createSecureToken,
    hashSecureToken,
    inviteValidationReasonToMessage,
    validateInviteToken,
} from '../invite-link'

const registerInputSchema = z.object({
    token: z.string().min(1),
    userData: z.object({
        fullName: z.string().min(2).max(120).trim(),
        username: z.string().min(3).max(60).trim().toLowerCase(),
        password: z.string().min(6).max(200),
    }).optional(),
    fullName: z.string().min(2).max(120).trim().optional(),
    username: z.string().min(3).max(60).trim().toLowerCase().optional(),
    password: z.string().min(6).max(200).optional(),
})

export const authRouter = router({
    registerFromInvite: publicProcedure
        .input(registerInputSchema)
        .mutation(async ({ ctx, input }) => {
            const payload = input.userData ?? {
                fullName: input.fullName ?? '',
                username: input.username ?? '',
                password: input.password ?? '',
            }

            if (!payload.fullName || !payload.username || !payload.password) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Data registrasi belum lengkap.' })
            }

            const inviteValidation = await validateInviteToken(ctx.prisma, input.token)
            if (!inviteValidation.valid) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: inviteValidationReasonToMessage(inviteValidation.reason),
                })
            }

            const inviteTokenHash = hashSecureToken(input.token)
            const passwordHash = await bcrypt.hash(payload.password, 12)
            const { token: requestToken, tokenHash: requestTokenHash } = createSecureToken()
            const requestTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24)

            const result = await ctx.prisma.$transaction(async (tx) => {
                const freshInvite = await tx.userInviteLink.findUnique({
                    where: { tokenHash: inviteTokenHash },
                    select: {
                        id: true,
                        expiry: true,
                        isRevoked: true,
                        useLimit: true,
                        usedCount: true,
                    },
                })
                if (!freshInvite) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Link undangan tidak valid.' })
                }
                if (freshInvite.isRevoked) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Link undangan sudah dicabut.' })
                }
                if (freshInvite.expiry <= new Date()) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Link undangan sudah kedaluwarsa.' })
                }
                if (freshInvite.useLimit !== null && freshInvite.usedCount >= freshInvite.useLimit) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Link undangan sudah mencapai batas penggunaan.' })
                }

                const existingUsername = await tx.user.findUnique({
                    where: { username: input.username },
                    select: { id: true },
                })
                if (existingUsername) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'Username sudah digunakan.',
                    })
                }

                const createdUser = await tx.user.create({
                    data: {
                        username: payload.username,
                        password: passwordHash,
                        fullName: payload.fullName,
                        role: Role.STAF_PENDATAAN,
                        isActive: true,
                        isEnabled: false,
                        disabledReason: 'Menunggu persetujuan admin.',
                    },
                    select: { id: true },
                })

                await tx.userInviteLink.update({
                    where: { id: freshInvite.id },
                    data: { usedCount: { increment: 1 } },
                })

                await tx.roleRequestToken.create({
                    data: {
                        userId: createdUser.id,
                        tokenHash: requestTokenHash,
                        expiresAt: requestTokenExpiresAt,
                    },
                })

                return createdUser
            })

            return {
                success: true,
                userId: result.id,
                requestToken,
                requestTokenExpiresAt,
            }
        }),
})
