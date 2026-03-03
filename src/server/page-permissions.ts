import type { PrismaClient } from '@prisma/client'
import { canonicalizeAllowedPagePaths } from '@/lib/page-groups'

export type PermissionSnapshot = {
    allowedGroupCodes: string[]
    allowedPagePaths: string[]
}

export async function computePermissionSnapshot(
    prisma: PrismaClient,
    roleCodes: string[]
): Promise<PermissionSnapshot> {
    const uniqueRoleCodes = [...new Set(roleCodes)]
    if (uniqueRoleCodes.length === 0) {
        return { allowedGroupCodes: [], allowedPagePaths: [] }
    }

    // ADMIN role always gets all active groups + pages.
    if (uniqueRoleCodes.includes('ADMIN')) {
        const [groups, pages] = await Promise.all([
            prisma.pageGroup.findMany({
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
                select: { code: true },
            }),
            prisma.page.findMany({
                where: { isActive: true, group: { isActive: true } },
                orderBy: [{ group: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
                select: { path: true },
            }),
        ])

        return {
            allowedGroupCodes: groups.map((g) => g.code),
            allowedPagePaths: canonicalizeAllowedPagePaths(pages.map((p) => p.path)),
        }
    }

    const roleEntries = await prisma.roleEntry.findMany({
        where: { code: { in: uniqueRoleCodes } },
        select: { id: true },
    })
    const roleIds = roleEntries.map((r) => r.id)
    if (roleIds.length === 0) {
        return { allowedGroupCodes: [], allowedPagePaths: [] }
    }

    const rolePages = await prisma.rolePage.findMany({
        where: {
            roleId: { in: roleIds },
            page: { isActive: true, group: { isActive: true } },
        },
        select: {
            page: {
                select: {
                    path: true,
                    group: { select: { code: true, sortOrder: true } },
                },
            },
        },
        orderBy: [
            { page: { group: { sortOrder: 'asc' } } },
            { page: { sortOrder: 'asc' } },
        ],
    })

    if (rolePages.length === 0) {
        return { allowedGroupCodes: [], allowedPagePaths: [] }
    }

    const allowedPathSet = new Set<string>()
    const allowedGroupsByCode = new Map<string, number>()
    for (const row of rolePages) {
        allowedPathSet.add(row.page.path)
        allowedGroupsByCode.set(row.page.group.code, row.page.group.sortOrder)
    }

    const allowedGroupCodes = [...allowedGroupsByCode.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([code]) => code)

    return {
        allowedGroupCodes,
        allowedPagePaths: canonicalizeAllowedPagePaths([...allowedPathSet]),
    }
}
