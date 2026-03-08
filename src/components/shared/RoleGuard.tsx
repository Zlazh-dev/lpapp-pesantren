'use client'

import { useSession } from 'next-auth/react'
import type { ReactNode } from 'react'

/**
 * Returns true jika user punya salah satu dari allowedRoles.
 * Cek di roleCodes (array), bukan role (string legacy).
 */
export function useRoleCheck(allowedRoles: string[]): boolean {
    const { data: session } = useSession()
    const roleCodes = session?.user?.roleCodes ?? []
    return allowedRoles.some(r => roleCodes.includes(r))
}

interface RoleGuardProps {
    /** Role codes yang diizinkan, e.g. ['ADMIN', 'STAF_PENDATAAN'] */
    allowedRoles: string[]
    children: ReactNode
    /** Optional fallback jika user tidak punya role yang diperlukan */
    fallback?: ReactNode
}

/**
 * Render children hanya jika user session memiliki salah satu allowedRoles.
 * Jika tidak, render fallback (default: null / invisible).
 *
 * @example
 * <RoleGuard allowedRoles={['ADMIN']}>
 *   <SensitiveField />
 * </RoleGuard>
 */
export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
    const allowed = useRoleCheck(allowedRoles)
    return allowed ? <>{children}</> : <>{fallback}</>
}
