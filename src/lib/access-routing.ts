import { normalizePagePath } from '@/lib/page-groups'

export const POST_LOGIN_ROUTE_PRIORITY = [
    '/dashboard',
    '/dashboard/santri-saya',
    '/master-data/santri/manage',
    '/keuangan',
    '/akademik/kelas',
    '/settings',
] as const

function cleanPath(pathname: string): string {
    const clean = pathname.split('?')[0].split('#')[0]
    if (clean.length > 1 && clean.endsWith('/')) {
        return clean.slice(0, -1)
    }
    return clean
}

function canonicalPath(pathname: string): string {
    const clean = cleanPath(pathname)
    return normalizePagePath(clean) ?? clean
}

/**
 * Mobile-to-desktop route prefix mapping.
 * Used to normalize mobile paths before checking access.
 */
const MOBILE_PREFIX_MAP: [string, string][] = [
    ['/m-dashboard', '/dashboard'],
    ['/m-master-data', '/master-data'],
    ['/m-keuangan', '/keuangan'],
    ['/m-akademik', '/akademik'],
    ['/m-users', '/user-management'],
    ['/m-settings', '/settings'],
    ['/m-santri', '/master-data/santri/manage'],
    ['/m-billing', '/keuangan'],
    ['/m-scan', '/dashboard'],
    ['/m-profile', '/dashboard'],
]

function normalizeToDesktopPath(path: string): string {
    for (const [mobilePrefix, desktopPrefix] of MOBILE_PREFIX_MAP) {
        if (path === mobilePrefix) return desktopPrefix
        if (path.startsWith(mobilePrefix + '/')) {
            return desktopPrefix + path.slice(mobilePrefix.length)
        }
    }
    return path
}

export function hasPathAccess(targetPath: string, allowedPagePaths: string[]): boolean {
    const desktopTarget = normalizeToDesktopPath(targetPath)
    const normalizedTarget = canonicalPath(desktopTarget)

    for (const allowedPath of allowedPagePaths) {
        const normalizedAllowed = canonicalPath(allowedPath)

        if (normalizedAllowed === normalizedTarget) return true
    }

    return false
}

export function resolveFirstAccessibleRoute(params: {
    roleCodes: string[]
    allowedPagePaths: string[]
}): string {
    const roleCodes = params.roleCodes ?? []
    const allowedPagePaths = params.allowedPagePaths ?? []

    if (roleCodes.includes('ADMIN')) {
        return '/dashboard'
    }

    for (const candidate of POST_LOGIN_ROUTE_PRIORITY) {
        if (hasPathAccess(candidate, allowedPagePaths)) {
            return candidate
        }
    }

    const firstConcrete = allowedPagePaths
        .map((path) => canonicalPath(path))
        .find((path) => path.startsWith('/') && !path.includes('['))

    return firstConcrete ?? '/dashboard'
}
