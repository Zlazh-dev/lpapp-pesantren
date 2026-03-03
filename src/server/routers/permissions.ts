import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, pageProtectedProcedure, hasRole, type Context } from '../trpc'
import { computePermissionSnapshot } from '../page-permissions'
import { canonicalizeAllowedPagePaths } from '@/lib/page-groups'
import { DESKTOP_SIDEBAR_MODEL, getSidebarFilterReport } from '@/lib/sidebar-navigation'

async function resolveLiveRoleCodes(ctx: Pick<Context, 'session' | 'prisma'>): Promise<string[]> {
    if (!ctx.session?.user) return []

    const roleRows = await ctx.prisma.userRole.findMany({
        where: { userId: ctx.session.user.id },
        select: { role: { select: { code: true } } },
    })

    if (roleRows.length > 0) {
        return [...new Set(roleRows.map((row) => row.role.code))]
    }

    const fallback = ctx.session.user.roleCodes ?? ctx.session.user.roles ?? [ctx.session.user.role]
    return [...new Set(fallback.filter(Boolean))]
}

const adminPageAccessProcedure = pageProtectedProcedure('/user-management/page-access')
const adminProcedure = adminPageAccessProcedure.use(({ ctx, next }) => {
    if (!hasRole(ctx, 'ADMIN')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Akses ditolak. Role yang diperlukan: ADMIN' })
    }
    return next({ ctx })
})

export const permissionsRouter = router({
    pageGroup: router({
        list: adminProcedure.query(async ({ ctx }) => {
            return ctx.prisma.pageGroup.findMany({
                orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
                include: {
                    _count: { select: { pages: true, roleAccess: true } },
                },
            })
        }),

        create: adminProcedure
            .input(
                z.object({
                    code: z.string().min(1).max(40).transform((s) => s.toUpperCase().trim().replace(/\s+/g, '_')),
                    name: z.string().min(1).max(120).transform((s) => s.trim()),
                    sortOrder: z.number().int().default(0),
                })
            )
            .mutation(async ({ ctx, input }) => {
                try {
                    return await ctx.prisma.pageGroup.create({ data: input })
                } catch (error: any) {
                    if (error.code === 'P2002') {
                        throw new TRPCError({ code: 'CONFLICT', message: `Group code "${input.code}" sudah ada` })
                    }
                    throw error
                }
            }),

        update: adminProcedure
            .input(
                z.object({
                    id: z.string(),
                    code: z.string().min(1).max(40).transform((s) => s.toUpperCase().trim().replace(/\s+/g, '_')).optional(),
                    name: z.string().min(1).max(120).transform((s) => s.trim()).optional(),
                    sortOrder: z.number().int().optional(),
                })
            )
            .mutation(async ({ ctx, input }) => {
                const { id, ...data } = input
                try {
                    return await ctx.prisma.pageGroup.update({ where: { id }, data })
                } catch (error: any) {
                    if (error.code === 'P2002') {
                        throw new TRPCError({ code: 'CONFLICT', message: 'Code group sudah digunakan' })
                    }
                    throw error
                }
            }),

        toggleActive: adminProcedure
            .input(z.object({ id: z.string(), isActive: z.boolean() }))
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.pageGroup.update({
                    where: { id: input.id },
                    data: { isActive: input.isActive },
                })
            }),

        delete: adminProcedure
            .input(z.string())
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.pageGroup.delete({ where: { id: input } })
            }),
    }),

    page: router({
        listByGroup: adminProcedure
            .input(z.string())
            .query(async ({ ctx, input }) => {
                return ctx.prisma.page.findMany({
                    where: { groupId: input },
                    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
                })
            }),

        create: adminProcedure
            .input(
                z.object({
                    groupId: z.string(),
                    code: z.string().min(1).max(60).transform((s) => s.toUpperCase().trim().replace(/\s+/g, '_')),
                    name: z.string().min(1).max(120).transform((s) => s.trim()),
                    path: z.string().min(1).max(255).transform((s) => s.trim()),
                    sortOrder: z.number().int().default(0),
                })
            )
            .mutation(async ({ ctx, input }) => {
                try {
                    return await ctx.prisma.page.create({ data: input })
                } catch (error: any) {
                    if (error.code === 'P2002') {
                        throw new TRPCError({ code: 'CONFLICT', message: `Page code "${input.code}" sudah ada` })
                    }
                    throw error
                }
            }),

        update: adminProcedure
            .input(
                z.object({
                    id: z.string(),
                    groupId: z.string().optional(),
                    code: z.string().min(1).max(60).transform((s) => s.toUpperCase().trim().replace(/\s+/g, '_')).optional(),
                    name: z.string().min(1).max(120).transform((s) => s.trim()).optional(),
                    path: z.string().min(1).max(255).transform((s) => s.trim()).optional(),
                    sortOrder: z.number().int().optional(),
                })
            )
            .mutation(async ({ ctx, input }) => {
                const { id, ...data } = input
                try {
                    return await ctx.prisma.page.update({ where: { id }, data })
                } catch (error: any) {
                    if (error.code === 'P2002') {
                        throw new TRPCError({ code: 'CONFLICT', message: 'Code halaman sudah digunakan' })
                    }
                    throw error
                }
            }),

        toggleActive: adminProcedure
            .input(z.object({ id: z.string(), isActive: z.boolean() }))
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.page.update({
                    where: { id: input.id },
                    data: { isActive: input.isActive },
                })
            }),

        delete: adminProcedure
            .input(z.string())
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.page.delete({ where: { id: input } })
            }),
    }),

    access: router({
        getMatrix: adminProcedure.query(async ({ ctx }) => {
            const [roles, groups] = await Promise.all([
                ctx.prisma.roleEntry.findMany({
                    orderBy: { code: 'asc' },
                    select: { id: true, code: true, name: true },
                }),
                ctx.prisma.pageGroup.findMany({
                    where: { isActive: true },
                    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
                    select: { id: true, code: true, name: true },
                }),
            ])

            return { roles, groups }
        }),

        getRoleAccess: adminProcedure
            .input(z.object({ roleId: z.string() }))
            .query(async ({ ctx, input }) => {
                const [role, groups, rolePageAccess] = await Promise.all([
                    ctx.prisma.roleEntry.findUnique({
                        where: { id: input.roleId },
                        select: { id: true, code: true },
                    }),
                    ctx.prisma.pageGroup.findMany({
                        where: { isActive: true },
                        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            pages: {
                                where: {
                                    isActive: true,
                                    path: { not: { contains: '[' } },
                                },
                                orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
                                select: { id: true, code: true, name: true, path: true },
                            },
                        },
                    }),
                    ctx.prisma.rolePage.findMany({
                        where: { roleId: input.roleId, page: { isActive: true, group: { isActive: true } } },
                        select: { pageId: true },
                    }),
                ])

                if (!role) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'Role tidak ditemukan' })
                }

                const allPageIds = groups.flatMap((group) => group.pages.map((page) => page.id))

                return {
                    groups,
                    rolePageAllowed: role.code === 'ADMIN'
                        ? allPageIds
                        : rolePageAccess.map((row) => row.pageId),
                }
            }),

        setRoleAccess: adminProcedure
            .input(
                z.object({
                    roleId: z.string(),
                    pageIds: z.array(z.string()).default([]),
                })
            )
            .mutation(async ({ ctx, input }) => {
                const role = await ctx.prisma.roleEntry.findUnique({
                    where: { id: input.roleId },
                    select: { code: true },
                })
                if (!role) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'Role tidak ditemukan' })
                }

                if (role.code === 'ADMIN') {
                    return { success: true, skipped: true, reason: 'ADMIN otomatis memiliki akses ke semua halaman' }
                }

                const requestedPageIds = [...new Set(input.pageIds)]
                const validPages = requestedPageIds.length === 0
                    ? []
                    : await ctx.prisma.page.findMany({
                        where: {
                            id: { in: requestedPageIds },
                            isActive: true,
                            group: { isActive: true },
                        },
                        select: { id: true },
                    })
                const validPageIds = validPages.map((page) => page.id)

                await ctx.prisma.$transaction(async (tx) => {
                    // Keep legacy table empty for new page-level assignments.
                    await tx.rolePageGroupAccess.deleteMany({ where: { roleId: input.roleId } })
                    await tx.rolePage.deleteMany({ where: { roleId: input.roleId } })

                    if (validPageIds.length > 0) {
                        await tx.rolePage.createMany({
                            data: validPageIds.map((pageId) => ({ roleId: input.roleId, pageId })),
                        })
                    }
                })

                return { success: true, savedCount: validPageIds.length }
            }),
    }),

    me: router({
        permissions: protectedProcedure
            .input(z.object({ pathname: z.string().optional() }).optional())
            .query(async ({ ctx, input }) => {
            const roleCodes = await resolveLiveRoleCodes(ctx)
            const [snapshot, catalogPages] = await Promise.all([
                computePermissionSnapshot(ctx.prisma, roleCodes),
                ctx.prisma.page.findMany({
                    where: { isActive: true, group: { isActive: true } },
                    select: { path: true },
                }),
            ])
            const canonicalCatalogPagePaths = canonicalizeAllowedPagePaths(catalogPages.map((p) => p.path))
            const sidebarReport = getSidebarFilterReport(DESKTOP_SIDEBAR_MODEL, snapshot.allowedPagePaths)
            const sidebarMenuItems = DESKTOP_SIDEBAR_MODEL.flatMap((item) => {
                const parent = [{ key: item.key, label: item.label, href: item.href ?? null, pagePath: item.pagePath ?? null }]
                const children = (item.children ?? []).map((child) => ({
                    key: child.key,
                    label: child.label,
                    href: child.href ?? null,
                    pagePath: child.pagePath ?? null,
                    parentKey: item.key,
                }))
                return [...parent, ...children]
            })

            if (roleCodes.includes('ADMIN')) {
                console.info('[SIDEBAR_DEBUG][server]', {
                    userId: ctx.session.user.id,
                    username: ctx.session.user.username,
                    pathname: input?.pathname ?? null,
                    allowedGroupCodes: snapshot.allowedGroupCodes,
                    allowedPagePaths: snapshot.allowedPagePaths,
                    menuItems: sidebarMenuItems,
                    filterDecisions: sidebarReport.decisions,
                })
            }

            return {
                ...snapshot,
                catalogPagePaths: canonicalCatalogPagePaths,
            }
            }),

        // Backward-compatible endpoint used in older UI parts.
        allowedGroups: protectedProcedure.query(async ({ ctx }) => {
            const roleCodes = await resolveLiveRoleCodes(ctx)
            const snapshot = await computePermissionSnapshot(ctx.prisma, roleCodes)
            return snapshot.allowedGroupCodes
        }),
    }),
})
