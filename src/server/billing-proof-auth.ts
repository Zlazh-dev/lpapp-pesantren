export type BillingProofViewerSession = {
    user?: {
        role?: string
        roleCodes?: string[]
        roles?: string[]
    }
} | null

export function hasBillingProofViewerAccess(session: BillingProofViewerSession): boolean {
    if (!session?.user) return false
    const roleCodes = session.user.roleCodes ?? session.user.roles ?? [session.user.role]
    return roleCodes.includes('ADMIN')
}
