/**
 * RBAC Helper Functions
 * 
 * Utility functions for role-based and scope-based access control.
 * Works with the session.user.roles[] and session.user.scopes[] arrays
 * injected by NextAuth at login.
 */

type SessionUser = {
    role?: string // legacy fallback
    roles?: string[]
    scopes?: { roleCode: string; scopeType: string; scopeId: string }[]
}

/** Check if user has a specific role code */
export function hasRole(user: SessionUser, roleCode: string): boolean {
    const roles = user.roles ?? (user.role ? [user.role] : [])
    return roles.includes(roleCode)
}

/** Check if user has ANY of the specified roles */
export function hasAnyRole(user: SessionUser, ...roleCodes: string[]): boolean {
    const roles = user.roles ?? (user.role ? [user.role] : [])
    return roleCodes.some(r => roles.includes(r))
}

/** Check if user has a specific scoped assignment */
export function hasRoleScope(
    user: SessionUser,
    roleCode: string,
    scopeType: string,
    scopeId: string
): boolean {
    return user.scopes?.some(
        s => s.roleCode === roleCode && s.scopeType === scopeType && s.scopeId === scopeId
    ) ?? false
}

/** Get all scope IDs for a given role+type combination */
export function getScopeIds(
    user: SessionUser,
    roleCode: string,
    scopeType: string
): string[] {
    return (user.scopes ?? [])
        .filter(s => s.roleCode === roleCode && s.scopeType === scopeType)
        .map(s => s.scopeId)
}

/** Check if user is ADMIN (convenience) */
export function isAdmin(user: SessionUser): boolean {
    return hasRole(user, 'ADMIN')
}
