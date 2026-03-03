'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import { getRoleLabel } from '@/utils/format'
import { hasPathAccess, resolveFirstAccessibleRoute } from '@/lib/access-routing'
import { DESKTOP_SIDEBAR_MODEL, getSidebarFilterReport } from '@/lib/sidebar-navigation'
import { Icon } from '@/components/icons'
import { useResponsiveRedirect } from '@/hooks/useResponsiveRedirect'
import TabSessionGuard from '@/components/TabSessionGuard'

function isPathActive(pathname: string, href?: string, _pagePath?: string, exactOnly = false): boolean {
    if (!href) return false
    const target = _pagePath ?? href
    if (pathname === target) return true
    if (target === '/dashboard') return pathname === '/dashboard'
    // For leaf/child items, only exact match counts
    if (exactOnly) return false
    return pathname.startsWith(`${target}/`)
}

function DesktopPageGuard({
    pathname,
    allowedPagePaths,
    fallbackRoute,
}: {
    pathname: string
    allowedPagePaths: string[]
    fallbackRoute: string
}) {
    const router = useRouter()
    const { status } = useSession()
    const [forbidden, setForbidden] = useState(false)

    useEffect(() => {
        if (status !== 'authenticated') return

        const allowed = hasPathAccess(pathname, allowedPagePaths)
        if (allowed) {
            setForbidden(false)
            return
        }

        if (pathname !== fallbackRoute) {
            setForbidden(false)
            router.replace(fallbackRoute)
            return
        }

        setForbidden(true)
    }, [allowedPagePaths, fallbackRoute, pathname, router, status])

    if (!forbidden) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95">
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
                <p className="text-xl font-semibold text-slate-800">403</p>
                <p className="mt-1 text-sm text-slate-500">Anda tidak memiliki akses ke halaman ini.</p>
            </div>
        </div>
    )
}

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession()
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

    // Fetch logo from AppSetting
    const { data: logoUrl } = trpc.settings.get.useQuery('logo_url')

    // Auto-redirect to mobile if screen < 720px
    useResponsiveRedirect('desktop')

    const { data: livePermissions } = trpc.permissions.me.permissions.useQuery({ pathname }, {
        enabled: !!session?.user,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    })

    const allowedPagePaths = useMemo(
        () => livePermissions?.allowedPagePaths ?? session?.user?.allowedPagePaths ?? [],
        [livePermissions?.allowedPagePaths, session?.user?.allowedPagePaths]
    )
    const roleCodes = useMemo(
        () => session?.user?.roleCodes ?? session?.user?.roles ?? (session?.user?.role ? [session.user.role] : []),
        [session?.user?.role, session?.user?.roleCodes, session?.user?.roles]
    )
    const fallbackRoute = useMemo(
        () => resolveFirstAccessibleRoute({ roleCodes, allowedPagePaths }),
        [allowedPagePaths, roleCodes]
    )

    const sidebarFilterReport = useMemo(
        () => getSidebarFilterReport(DESKTOP_SIDEBAR_MODEL, allowedPagePaths),
        [allowedPagePaths]
    )

    const sidebarItems = sidebarFilterReport.filteredItems

    useEffect(() => {
        if (!session?.user) return

        const menuItems = DESKTOP_SIDEBAR_MODEL.flatMap((item) => {
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

        console.info('[SIDEBAR_DEBUG][client]', {
            pathname,
            allowedGroupCodes: livePermissions?.allowedGroupCodes ?? session.user.allowedGroupCodes ?? [],
            allowedPagePaths,
            menuItems,
            filterDecisions: sidebarFilterReport.decisions,
        })
    }, [
        allowedPagePaths,
        livePermissions?.allowedGroupCodes,
        pathname,
        session?.user,
        sidebarFilterReport.decisions,
    ])

    useEffect(() => {
        const nextOpen: Record<string, boolean> = {}
        for (const section of sidebarItems) {
            if (!section.children) continue
            nextOpen[section.key] = section.children.some((child) => isPathActive(pathname, child.href))
        }
        setOpenGroups((prev) => ({ ...prev, ...nextOpen }))
    }, [pathname, sidebarItems])

    return (
        <div className="flex min-h-screen">
            <TabSessionGuard />
            <DesktopPageGuard pathname={pathname} allowedPagePaths={allowedPagePaths} fallbackRoute={fallbackRoute} />

            <aside className={`sticky top-0 flex h-screen flex-col bg-white border-r border-slate-200 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
                {/* Logo */}
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
                    {logoUrl ? (
                        <Image
                            src={logoUrl}
                            alt="Logo"
                            width={36}
                            height={36}
                            className="w-9 h-9 flex-shrink-0 object-contain"
                        />
                    ) : (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 shadow-sm">
                            <Icon name="akademik" size={20} className="text-white" />
                        </div>
                    )}
                    {!collapsed && (
                        <div>
                            <h1 className="text-sm font-bold text-emerald-600">LpApp.</h1>
                            <p className="text-[10px] text-slate-400">Beta Version</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                    {sidebarItems.map((item) => {
                        const hasChildren = Boolean(item.children?.length)
                        const active = hasChildren
                            ? item.children!.some((child) => isPathActive(pathname, child.href))
                            : isPathActive(pathname, item.href)

                        return (
                            <div key={item.key}>
                                {item.href ? (
                                    <Link
                                        href={item.href}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${active
                                            ? 'bg-teal-50 text-teal-700 font-semibold border-l-[3px] border-teal-500 ml-0 pl-[9px]'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                            }`}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        <Icon name={item.icon} size={18} className={active ? 'text-teal-600' : 'text-slate-400'} />
                                        {!collapsed && <span>{item.label}</span>}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setOpenGroups((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${active
                                            ? 'bg-teal-50 text-teal-700 font-semibold'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                            }`}
                                    >
                                        <Icon name={item.icon} size={18} className={active ? 'text-teal-600' : 'text-slate-400'} />
                                        {!collapsed && (
                                            <>
                                                <span className="flex-1 text-left">{item.label}</span>
                                                <span className={`text-slate-400 text-xs font-normal transition-transform`}>
                                                    {openGroups[item.key] ? '−' : '+'}
                                                </span>
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Children with tree-line connector */}
                                {!collapsed && hasChildren && openGroups[item.key] && (
                                    <div className="relative ml-[22px] mt-0.5 mb-1">
                                        {/* Vertical tree line */}
                                        <div className="absolute left-0 top-0 bottom-2 w-px bg-slate-200" />
                                        {item.children!.map((child, idx) => {
                                            const childActive = isPathActive(pathname, child.href, child.pagePath, true)
                                            const isLast = idx === item.children!.length - 1
                                            return (
                                                <div key={child.key} className="relative flex items-center">
                                                    {/* Horizontal branch line */}
                                                    <div className={`absolute left-0 w-4 border-t border-slate-200 ${isLast ? 'top-1/2' : 'top-1/2'}`}
                                                        style={isLast ? { borderLeft: '1px solid rgb(226 232 240)', borderBottomLeftRadius: '6px', height: '50%', top: 0, borderTop: 'none', borderBottom: '1px solid rgb(226 232 240)' } : {}} />
                                                    {isLast && <div className="absolute left-0 top-1/2 bottom-0 w-px bg-white" />}
                                                    <Link
                                                        href={child.href!}
                                                        className={`ml-5 flex-1 rounded-md px-2.5 py-1.5 text-[13px] transition-all ${childActive
                                                            ? 'text-teal-700 font-semibold bg-teal-50'
                                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
                                                            }`}
                                                    >
                                                        {child.label}
                                                    </Link>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </nav>

                {/* Bottom section */}
                <div className="border-t border-slate-100 p-3 space-y-2">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="flex w-full items-center justify-center rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600"
                        aria-label={collapsed ? 'Perluas sidebar' : 'Perkecil sidebar'}
                    >
                        <Icon name="collapse" size={18} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
                    </button>

                    {session?.user && (
                        <div className={`flex items-center gap-3 rounded-lg px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                                {session.user.fullName.charAt(0)}
                            </div>
                            {!collapsed && (
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-700">{session.user.fullName}</p>
                                    <p className="text-[11px] text-slate-400">{getRoleLabel(session.user.role)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 transition-all hover:bg-red-50 ${collapsed ? 'justify-center' : ''}`}
                    >
                        <Icon name="logout" size={16} className="text-current" />
                        {!collapsed && <span>Keluar</span>}
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-x-hidden bg-slate-50/50">
                <div className="w-full p-6">{children}</div>
            </main>
        </div>
    )
}
