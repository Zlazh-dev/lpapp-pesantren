export const PAGE_GROUP_CODES = [
    'DASHBOARD',
    'MASTER_DATA',
    'KEUANGAN',
    'AKADEMIK',
    'USER_MANAGEMENT',
    'SETTINGS',
] as const

export type PageGroupCode = (typeof PAGE_GROUP_CODES)[number]

export const LOCKED_PAGE_GROUP_DEFAULTS = [
    { code: 'DASHBOARD', name: 'Dashboard', sortOrder: 0 },
    { code: 'MASTER_DATA', name: 'Master Data', sortOrder: 1 },
    { code: 'KEUANGAN', name: 'Keuangan', sortOrder: 2 },
    { code: 'AKADEMIK', name: 'Akademik', sortOrder: 3 },
    { code: 'USER_MANAGEMENT', name: 'User Management', sortOrder: 4 },
    { code: 'SETTINGS', name: 'Settings', sortOrder: 5 },
] as const

export const LOCKED_PAGE_DEFAULTS = [
    { groupCode: 'DASHBOARD', code: 'DASHBOARD', name: 'Beranda', path: '/dashboard', sortOrder: 0 },

    { groupCode: 'MASTER_DATA', code: 'MASTER_SANTRI_MANAGE', name: 'Manajemen Data Santri', path: '/master-data/santri/manage', sortOrder: 0 },
    { groupCode: 'MASTER_DATA', code: 'MASTER_SANTRI_ARSIP', name: 'Arsip Santri', path: '/master-data/santri/arsip', sortOrder: 1 },
    { groupCode: 'MASTER_DATA', code: 'MASTER_KAMAR_MANAGE', name: 'Manajemen Kamar', path: '/master-data/kamar/manage', sortOrder: 2 },
    { groupCode: 'MASTER_DATA', code: 'MASTER_SANTRI_PERMINTAAN', name: 'Permintaan Perubahan', path: '/master-data/santri/permintaan', sortOrder: 3 },

    { groupCode: 'MASTER_DATA', code: 'MASTER_KAMAR_DETAIL', name: 'Detail Kamar', path: '/master-data/kamar/[roomId]', sortOrder: 4 },

    { groupCode: 'KEUANGAN', code: 'KEUANGAN_SANTRI', name: 'Data Santri (Keuangan)', path: '/keuangan/santri', sortOrder: 0 },
    { groupCode: 'KEUANGAN', code: 'KEUANGAN_MANAGEMENT', name: 'Manajemen Keuangan', path: '/keuangan', sortOrder: 1 },
    { groupCode: 'KEUANGAN', code: 'KEUANGAN_PROOF_DETAIL', name: 'Detail Bukti Pembayaran', path: '/keuangan/proofs/[proofId]', sortOrder: 2 },
    { groupCode: 'KEUANGAN', code: 'KEUANGAN_PAYMENT_PROOF_DETAIL', name: 'Detail Bukti Pembayaran Transfer', path: '/keuangan/payments/[paymentId]/proof', sortOrder: 3 },

    { groupCode: 'AKADEMIK', code: 'AKADEMIK_SANTRI', name: 'Data Santri (Akademik)', path: '/akademik/santri', sortOrder: 0 },
    { groupCode: 'AKADEMIK', code: 'AKADEMIK_KELAS_MANAGE', name: 'Manajemen Kelas', path: '/akademik/kelas/manage', sortOrder: 1 },
    { groupCode: 'AKADEMIK', code: 'AKADEMIK_KELAS_LIST', name: 'Kelas', path: '/akademik/kelas', sortOrder: 2 },
    { groupCode: 'AKADEMIK', code: 'AKADEMIK_KELAS_DETAIL', name: 'Detail Kelas', path: '/akademik/kelas/[classGroupId]', sortOrder: 3 },

    { groupCode: 'USER_MANAGEMENT', code: 'USER_MANAGEMENT_USERS', name: 'Manajemen User', path: '/user-management/users', sortOrder: 0 },
    { groupCode: 'USER_MANAGEMENT', code: 'USER_MANAGEMENT_USER_DETAIL', name: 'Detail User', path: '/user-management/users/[userId]', sortOrder: 1 },

    { groupCode: 'SETTINGS', code: 'PENGATURAN_GLOBAL', name: 'Pengaturan', path: '/settings', sortOrder: 0 },
] as const

export const LOCKED_ROUTE_CATALOG: Record<PageGroupCode, string[]> = {
    DASHBOARD: ['/dashboard', '/dashboard/santri-saya', '/dashboard/santri-saya/[santriId]'],
    MASTER_DATA: [
        '/master-data/santri/manage',
        '/master-data/santri/arsip',
        '/master-data/kamar/manage',
        '/master-data/kamar/[roomId]',
        '/master-data/santri/permintaan',
    ],
    KEUANGAN: ['/keuangan/santri', '/keuangan', '/keuangan/proofs/[proofId]', '/keuangan/payments/[paymentId]/proof'],
    AKADEMIK: ['/akademik/santri', '/akademik/kelas/manage', '/akademik/kelas', '/akademik/kelas/[classGroupId]'],
    USER_MANAGEMENT: [
        '/user-management/users',
        '/user-management/users/[userId]',
    ],
    SETTINGS: ['/settings'],
}

const CANONICAL_PARENT_PATHS = ['/master-data', '/keuangan', '/akademik', '/user-management'] as const

export function normalizePagePath(pathname: string): string | null {
    const clean = pathname.split('?')[0].split('#')[0]

    if (clean === '/dashboard') return '/dashboard'
    if (clean === '/dashboard/santri-saya') return '/dashboard/santri-saya'
    if (clean.startsWith('/dashboard/santri-saya/')) return '/dashboard/santri-saya/[santriId]'

    if (clean === '/master-data/santri/manage') return '/master-data/santri/manage'
    if (clean === '/master-data/santri/arsip') return '/master-data/santri/arsip'
    if (clean.startsWith('/master-data/santri/arsip/')) return '/master-data/santri/arsip'
    if (clean === '/master-data/kamar/manage') return '/master-data/kamar/manage'
    if (clean === '/master-data/santri') return '/master-data/santri/manage'
    if (clean === '/master-data/santri/permintaan') return '/master-data/santri/permintaan'
    if (clean === '/master-data/santri/upload') return '/master-data/santri/upload'
    if (clean.startsWith('/master-data/santri/')) return '/master-data/santri/manage'
    if (clean.startsWith('/master-data/kamar/')) return '/master-data/kamar/manage'

    // Legacy aliases.
    if (clean === '/santri') return '/master-data/santri/manage'
    if (clean.startsWith('/santri/')) return '/master-data/santri/manage'
    if (clean === '/kamar') return '/master-data/kamar/manage'
    if (clean.startsWith('/kamar/')) return '/master-data/kamar/manage'

    if (clean === '/keuangan/santri') return '/keuangan/santri'
    if (clean.startsWith('/keuangan/santri/')) return '/keuangan/santri'
    if (clean === '/keuangan') return '/keuangan'
    if (clean.startsWith('/keuangan/activate/')) return '/keuangan'
    if (clean.startsWith('/keuangan/proofs/')) return '/keuangan'
    if (/^\/keuangan\/payments\/[^/]+\/proof$/.test(clean)) return '/keuangan'
    if (clean === '/billing' || clean === '/billing/models' || clean === '/billing/rekap') return '/keuangan'

    if (clean === '/akademik/santri') return '/akademik/santri'
    if (clean === '/akademik/santri/upload') return '/akademik/santri/upload'
    if (clean.startsWith('/akademik/santri/')) return '/akademik/santri'
    if (clean === '/akademik/kelas/manage') return '/akademik/kelas/manage'
    if (clean === '/akademik/kelas') return '/akademik/kelas'
    if (clean.startsWith('/akademik/kelas/')) return '/akademik/kelas'
    if (clean === '/akademik') return '/akademik/kelas/manage'
    if (clean === '/kelas') return '/akademik/kelas'
    if (clean.startsWith('/kelas/')) return '/akademik/kelas'

    if (clean === '/user-management/users') return '/user-management/users'
    if (clean.startsWith('/user-management/users/')) return '/user-management/users'
    if (clean === '/admin/users') return '/user-management/users'

    if (clean === '/settings') return '/settings'

    return null
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function patternToRegex(pattern: string): RegExp {
    const withWildcards = escapeRegex(pattern).replace(/\\\[.+?\\\]/g, '[^/]+')
    return new RegExp(`^${withWildcards}$`)
}

export function resolveCatalogPath(pathname: string, catalogPagePaths: string[]): string | null {
    const clean = pathname.split('?')[0].split('#')[0]
    const catalogSet = new Set(catalogPagePaths)

    const normalized = normalizePagePath(clean)
    if (normalized && catalogSet.has(normalized)) {
        return normalized
    }

    if (catalogSet.has(clean)) {
        return clean
    }

    for (const pattern of catalogPagePaths) {
        if (!pattern.includes('[')) continue
        if (patternToRegex(pattern).test(clean)) {
            return pattern
        }
    }

    return normalized
}

export function canonicalizeAllowedPagePaths(paths: string[]): string[] {
    const canonicalSet = new Set<string>()
    const explicitSet = new Set<string>()

    for (const rawPath of paths) {
        const clean = rawPath.split('?')[0].split('#')[0]
        if (!clean.startsWith('/')) continue

        const normalized = normalizePagePath(clean) ?? clean
        canonicalSet.add(normalized)
        explicitSet.add(normalized)

        if (normalized.startsWith('/master-data/')) canonicalSet.add('/master-data')
        if (normalized === '/keuangan' || normalized.startsWith('/keuangan/')) canonicalSet.add('/keuangan')
        if (normalized.startsWith('/akademik/')) canonicalSet.add('/akademik')
        if (normalized.startsWith('/user-management/')) canonicalSet.add('/user-management')
    }

    // Keep only parents that are relevant to current accessible pages.
    for (const parent of CANONICAL_PARENT_PATHS) {
        const hasDescendant = [...canonicalSet].some((path) => path !== parent && path.startsWith(`${parent}/`))
        if (!hasDescendant && !explicitSet.has(parent)) {
            canonicalSet.delete(parent)
        }
    }

    return [...canonicalSet]
}
