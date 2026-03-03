import crypto from 'crypto'
import { TRPCError } from '@trpc/server'
import type { PrismaClient, SharedLink } from '@prisma/client'

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i
const INVALID_LINK_MESSAGE = 'Link tidak valid atau sudah kedaluwarsa.'

export function isGuardianTokenFormatValid(token: string): boolean {
    return TOKEN_PATTERN.test(token)
}

export function hashGuardianToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
}

export function createGuardianToken(): { token: string; tokenHash: string } {
    const token = crypto.randomBytes(32).toString('hex')
    return { token, tokenHash: hashGuardianToken(token) }
}

export function assertGuardianTokenFormat(token: string): void {
    if (!isGuardianTokenFormatValid(token)) {
        throw new TRPCError({ code: 'NOT_FOUND', message: INVALID_LINK_MESSAGE })
    }
}

export async function resolveActiveGuardianLink(prisma: PrismaClient, token: string): Promise<Pick<SharedLink, 'id' | 'santriId'>> {
    assertGuardianTokenFormat(token)
    const now = new Date()
    const tokenHash = hashGuardianToken(token)

    const link = await prisma.sharedLink.findFirst({
        where: {
            tokenHash,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { id: true, santriId: true },
    })

    if (!link) {
        throw new TRPCError({ code: 'NOT_FOUND', message: INVALID_LINK_MESSAGE })
    }

    await prisma.sharedLink.update({
        where: { id: link.id },
        data: { lastAccessAt: now },
    })

    return link
}

export const GUARDIAN_LINK_INVALID_MESSAGE = INVALID_LINK_MESSAGE
