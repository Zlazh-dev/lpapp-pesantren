import type { AppIconName } from '@/components/icons'

export type SidebarNavItem = {
    key: string
    label: string
    icon: AppIconName
    href?: string
    pagePath?: string
    children?: SidebarNavItem[]
}

export type SidebarFilterDecision = {
    key: string
    label: string
    href?: string
    pagePath?: string
    visible: boolean
    reason: string
    matchedAllowedPath?: string
    children?: SidebarFilterDecision[]
}

export const DESKTOP_SIDEBAR_MODEL: SidebarNavItem[] = [
    {
        key: 'beranda',
        label: 'Beranda',
        icon: 'beranda',
        href: '/dashboard',
        pagePath: '/dashboard',
    },
    {
        key: 'santri-saya',
        label: 'Data Santri Saya',
        icon: 'manageSantri',
        href: '/dashboard/santri-saya',
        pagePath: '/dashboard/santri-saya',
    },
    {
        key: 'master-data',
        label: 'Data Pusat',
        icon: 'masterData',
        children: [
            {
                key: 'master-data-santri-manage',
                label: 'Data Santri Aktif',
                icon: 'manageSantri',
                href: '/master-data/santri/manage',
                pagePath: '/master-data/santri/manage',
            },
            {
                key: 'master-data-santri-arsip',
                label: 'Santri Alumni',
                icon: 'manageSantri',
                href: '/master-data/santri/arsip',
                pagePath: '/master-data/santri/arsip',
            },
            {
                key: 'master-data-kamar-manage',
                label: 'Data Kamar',
                icon: 'manageKamar',
                href: '/master-data/kamar/manage',
                pagePath: '/master-data/kamar/manage',
            },
            {
                key: 'master-data-permintaan',
                label: 'Permintaan',
                icon: 'receipt',
                href: '/master-data/santri/permintaan',
                pagePath: '/master-data/santri/permintaan',
            },
        ],
    },
    {
        key: 'keuangan',
        label: 'Perbendaharaan',
        icon: 'keuangan',
        children: [
            {
                key: 'keuangan-santri',
                label: 'Data Santri',
                icon: 'manageSantri',
                href: '/keuangan/santri',
                pagePath: '/keuangan/santri',
            },
            {
                key: 'keuangan-home',
                label: 'Perbendaharaan',
                icon: 'keuangan',
                href: '/keuangan',
                pagePath: '/keuangan',
            },
        ],
    },
    {
        key: 'akademik',
        label: 'Madrasah',
        icon: 'akademikMenu',
        children: [
            {
                key: 'akademik-santri',
                label: 'Data Santri',
                icon: 'manageSantri',
                href: '/akademik/santri',
                pagePath: '/akademik/santri',
            },
            {
                key: 'akademik-kelas-manage',
                label: 'Data Kelas',
                icon: 'manageKelas',
                href: '/akademik/kelas/manage',
                pagePath: '/akademik/kelas/manage',
            },
        ],
    },
    {
        key: 'user-management',
        label: 'Manajemen User',
        icon: 'userManagement',
        href: '/user-management/users',
        pagePath: '/user-management/users',
    },
    {
        key: 'settings',
        label: 'Pengaturan',
        icon: 'settings',
        href: '/settings',
        pagePath: '/settings',
    },
]

type PathMatch = {
    visible: boolean
    reason: string
    matchedAllowedPath?: string
}

function normalizePath(path: string): string {
    const clean = path.split('?')[0].split('#')[0]
    if (clean.length > 1 && clean.endsWith('/')) {
        return clean.slice(0, -1)
    }
    return clean
}

function matchMenuPath(targetPath: string | undefined, allowedPagePaths: string[]): PathMatch {
    if (!targetPath) {
        return { visible: false, reason: 'Menu tidak memiliki path target' }
    }

    const normalizedTarget = normalizePath(targetPath)
    for (const candidate of allowedPagePaths) {
        const normalizedCandidate = normalizePath(candidate)

        if (normalizedCandidate === normalizedTarget) {
            return {
                visible: true,
                reason: `Exact match: "${normalizedCandidate}" === "${normalizedTarget}"`,
                matchedAllowedPath: candidate,
            }
        }

        if (normalizedCandidate.startsWith(`${normalizedTarget}/`)) {
            return {
                visible: true,
                reason: `Prefix match: "${normalizedCandidate}".startsWith("${normalizedTarget}/")`,
                matchedAllowedPath: candidate,
            }
        }
    }

    return {
        visible: false,
        reason: `Tidak ada exact/prefix match untuk "${normalizedTarget}"`,
    }
}

export function getSidebarFilterReport(
    model: SidebarNavItem[],
    allowedPagePaths: string[]
): { filteredItems: SidebarNavItem[]; decisions: SidebarFilterDecision[] } {
    const filteredItems: SidebarNavItem[] = []
    const decisions: SidebarFilterDecision[] = []

    for (const item of model) {
        const itemTargetPath = item.pagePath ?? item.href
        const directMatch = matchMenuPath(itemTargetPath, allowedPagePaths)

        const childDecisions: SidebarFilterDecision[] = []
        const visibleChildren: SidebarNavItem[] = []

        for (const child of item.children ?? []) {
            const childTargetPath = child.pagePath ?? child.href
            const childMatch = matchMenuPath(childTargetPath, allowedPagePaths)
            const childDecision: SidebarFilterDecision = {
                key: child.key,
                label: child.label,
                href: child.href,
                pagePath: child.pagePath,
                visible: childMatch.visible,
                reason: childMatch.reason,
                matchedAllowedPath: childMatch.matchedAllowedPath,
            }

            childDecisions.push(childDecision)
            if (childMatch.visible) {
                visibleChildren.push(child)
            }
        }

        const isVisible = directMatch.visible || visibleChildren.length > 0
        const parentReason = directMatch.visible
            ? directMatch.reason
            : visibleChildren.length > 0
                ? `Parent tampil karena ${visibleChildren.length} child visible`
                : `Parent disembunyikan: direct=false, childVisible=0`

        decisions.push({
            key: item.key,
            label: item.label,
            href: item.href,
            pagePath: item.pagePath,
            visible: isVisible,
            reason: parentReason,
            matchedAllowedPath: directMatch.matchedAllowedPath,
            children: childDecisions,
        })

        if (!isVisible) {
            continue
        }

        filteredItems.push({
            ...item,
            children: item.children ? visibleChildren : undefined,
        })
    }

    return { filteredItems, decisions }
}

export function filterSidebarByAllowedPages(
    model: SidebarNavItem[],
    allowedPagePaths: string[]
): SidebarNavItem[] {
    return getSidebarFilterReport(model, allowedPagePaths).filteredItems
}
