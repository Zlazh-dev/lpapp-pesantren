import crypto from 'crypto'
import { TRPCError } from '@trpc/server'
import type { Prisma, PrismaClient, RoleRequestToken, UserInviteLink } from '@prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i

export type InviteValidationReason = 'INVALID' | 'REVOKED' | 'EXPIRED' | 'MAX_USES_REACHED'
export type RoleRequestTokenValidationReason = 'INVALID' | 'USED' | 'EXPIRED'

type InviteLinkShape = Pick<UserInviteLink, 'id' | 'createdByUserId' | 'expiry' | 'isRevoked' | 'useLimit' | 'usedCount'>
type RoleRequestTokenShape = Pick<RoleRequestToken, 'id' | 'userId' | 'expiresAt' | 'usedAt'>

export function isSecureTokenFormatValid(token: string): boolean {
    return TOKEN_PATTERN.test(token)
}

export function assertSecureTokenFormat(token: string, message = 'Token tidak valid.'): void {
    if (!isSecureTokenFormatValid(token)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message })
    }
}

export function hashSecureToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
}

export function createSecureToken(): { token: string; tokenHash: string } {
    const token = crypto.randomBytes(32).toString('hex')
    return { token, tokenHash: hashSecureToken(token) }
}

export function inviteValidationReasonToMessage(reason: InviteValidationReason): string {
    switch (reason) {
        case 'REVOKED':
            return 'Link undangan sudah dicabut.'
        case 'EXPIRED':
            return 'Link undangan sudah kedaluwarsa.'
        case 'MAX_USES_REACHED':
            return 'Link undangan sudah mencapai batas penggunaan.'
        default:
            return 'Link undangan tidak valid.'
    }
}

export function roleRequestTokenReasonToMessage(reason: RoleRequestTokenValidationReason): string {
    switch (reason) {
        case 'USED':
            return 'Token permintaan role sudah digunakan.'
        case 'EXPIRED':
            return 'Token permintaan role sudah kedaluwarsa.'
        default:
            return 'Token permintaan role tidak valid.'
    }
}

export async function validateInviteToken(
    prisma: DbClient,
    token: string
): Promise<{ valid: true; invite: InviteLinkShape } | { valid: false; reason: InviteValidationReason }> {
    if (!isSecureTokenFormatValid(token)) {
        return { valid: false, reason: 'INVALID' }
    }

    const tokenHash = hashSecureToken(token)
    const now = new Date()
    const invite = await prisma.userInviteLink.findUnique({
        where: { tokenHash },
        select: {
            id: true,
            createdByUserId: true,
            expiry: true,
            isRevoked: true,
            useLimit: true,
            usedCount: true,
        },
    })

    if (!invite) {
        return { valid: false, reason: 'INVALID' }
    }
    if (invite.isRevoked) {
        return { valid: false, reason: 'REVOKED' }
    }
    if (invite.expiry <= now) {
        return { valid: false, reason: 'EXPIRED' }
    }
    if (invite.useLimit !== null && invite.usedCount >= invite.useLimit) {
        return { valid: false, reason: 'MAX_USES_REACHED' }
    }

    return { valid: true, invite }
}

export async function validateRoleRequestToken(
    prisma: DbClient,
    token: string
): Promise<{ valid: true; tokenRecord: RoleRequestTokenShape } | { valid: false; reason: RoleRequestTokenValidationReason }> {
    if (!isSecureTokenFormatValid(token)) {
        return { valid: false, reason: 'INVALID' }
    }

    const tokenHash = hashSecureToken(token)
    const now = new Date()
    const tokenRecord = await prisma.roleRequestToken.findUnique({
        where: { tokenHash },
        select: {
            id: true,
            userId: true,
            expiresAt: true,
            usedAt: true,
        },
    })

    if (!tokenRecord) {
        return { valid: false, reason: 'INVALID' }
    }
    if (tokenRecord.usedAt) {
        return { valid: false, reason: 'USED' }
    }
    if (tokenRecord.expiresAt <= now) {
        return { valid: false, reason: 'EXPIRED' }
    }

    return { valid: true, tokenRecord }
}
