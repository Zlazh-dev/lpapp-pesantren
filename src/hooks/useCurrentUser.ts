'use client'

import { useSession } from 'next-auth/react'

const ADMIN_ROLES = ['ADMIN'] as const
const DATA_ROLES = ['ADMIN', 'STAF_PENDATAAN'] as const
const KEUANGAN_ROLES = ['ADMIN', 'STAF_KEUANGAN'] as const
const ASRAMA_ROLES = ['ADMIN', 'PENGURUS_ASRAMA'] as const

export const ROLES = {
    ADMIN: 'ADMIN',
    STAF_PENDATAAN: 'STAF_PENDATAAN',
    STAF_KEUANGAN: 'STAF_KEUANGAN',
    PENGURUS_ASRAMA: 'PENGURUS_ASRAMA',
    WALI_KELAS: 'WALI_KELAS',
    WALI_SANTRI: 'WALI_SANTRI',
    SANTRI: 'SANTRI',
} as const

export type RoleCode = (typeof ROLES)[keyof typeof ROLES]

/**
 * Thin wrapper around useSession() yang expose:
 * - roleCodes: string[]
 * - Helper checkers: isAdmin, canManageData, canManageKeuangan, canManageAsrama
 */
export function useCurrentUser() {
    const { data: session, status } = useSession()
    const roleCodes = session?.user?.roleCodes ?? []

    const hasRole = (...codes: string[]) => codes.some(c => roleCodes.includes(c))

    return {
        user: session?.user ?? null,
        roleCodes,
        status,
        isLoading: status === 'loading',
        isAuthenticated: status === 'authenticated',
        hasRole,
        /** Admin penuh */
        isAdmin: hasRole(...ADMIN_ROLES),
        /** Bisa manage data santri (input/edit/upload) */
        canManageData: hasRole(...DATA_ROLES),
        /** Bisa kelola keuangan/billing */
        canManageKeuangan: hasRole(...KEUANGAN_ROLES),
        /** Bisa kelola asrama/kamar */
        canManageAsrama: hasRole(...ASRAMA_ROLES),
        /** Bisa lihat field PII (NIK, No KK, No HP santri) */
        canViewPII: hasRole('ADMIN', 'STAF_PENDATAAN'),
    }
}
