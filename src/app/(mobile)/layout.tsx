'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { getRoleLabel } from '@/utils/format'
import { Icon, type AppIconName } from '@/components/icons'
import { useResponsiveRedirect } from '@/hooks/useResponsiveRedirect'
import { hasPathAccess } from '@/lib/access-routing'
import { trpc } from '@/utils/trpc'
import TabSessionGuard from '@/components/TabSessionGuard'

/* ─── Nav item model ─── */
type MobileNavItem = {
    key: string
    label: string
    icon: AppIconName
    href?: string
    pagePaths?: string[]
    children?: { key: string; label: string; icon: AppIconName; href: string; pagePath?: string }[]
}

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
    {
        key: 'beranda',
        label: 'Beranda',
        icon: 'dashboard',
        href: '/m-dashboard',
        pagePaths: ['/dashboard'],
    },
    {
        key: 'santri-saya',
        label: 'Data Santri Saya',
        icon: 'manageSantri',
        href: '/m-dashboard/santri-saya',
        pagePaths: ['/dashboard/santri-saya'],
    },
    {
        key: 'master-data',
        label: 'Data Pusat',
        icon: 'masterData',
        pagePaths: ['/master-data/santri', '/master-data/santri/manage', '/master-data/kamar'],
        children: [
            { key: 'md-santri', label: 'Data Santri Aktif', icon: 'manageSantri', href: '/m-master-data/santri/manage', pagePath: '/master-data/santri/manage' },
            { key: 'md-alumni', label: 'Santri Alumni', icon: 'manageSantri', href: '/m-master-data/santri/arsip', pagePath: '/master-data/santri/arsip' },
            { key: 'md-kamar', label: 'Data Kamar', icon: 'manageKamar', href: '/m-master-data/kamar/manage', pagePath: '/master-data/kamar/manage' },
            { key: 'md-permintaan', label: 'Permintaan', icon: 'receipt', href: '/m-master-data/santri/permintaan', pagePath: '/master-data/santri/permintaan' },
        ],
    },
    {
        key: 'keuangan',
        label: 'Keuangan',
        icon: 'keuangan',
        pagePaths: ['/keuangan'],
        children: [
            { key: 'keu-santri', label: 'Data Santri', icon: 'manageSantri', href: '/m-keuangan/santri', pagePath: '/keuangan/santri' },
            { key: 'keu-home', label: 'Perbendaharaan', icon: 'keuangan', href: '/m-keuangan', pagePath: '/keuangan' },
        ],
    },
    {
        key: 'akademik',
        label: 'Madrasah',
        icon: 'akademikMenu',
        pagePaths: ['/akademik'],
        children: [
            { key: 'ak-santri', label: 'Data Santri', icon: 'manageSantri', href: '/m-akademik/santri', pagePath: '/akademik/santri' },
            { key: 'ak-kelas', label: 'Data Kelas', icon: 'manageKelas', href: '/m-akademik/kelas/manage', pagePath: '/akademik/kelas' },
        ],
    },
    {
        key: 'user-management',
        label: 'User',
        icon: 'userManagement',
        href: '/m-users/users',
        pagePaths: ['/user-management'],
    },
    {
        key: 'settings',
        label: 'Setting',
        icon: 'settings',
        href: '/m-settings',
        pagePaths: ['/settings'],
    },
]

/* ─── Admin sidebar model — mirrors DESKTOP_SIDEBAR_MODEL ─── */
type AdminSidebarItem = {
    key: string
    label: string
    icon: AppIconName
    href?: string
    children?: { key: string; label: string; icon: AppIconName; href: string }[]
}

const ADMIN_SIDEBAR: AdminSidebarItem[] = [
    { key: 'beranda', label: 'Beranda', icon: 'beranda', href: '/m-dashboard' },
    {
        key: 'data-pusat', label: 'Data Pusat', icon: 'masterData',
        children: [
            { key: 'santri-aktif', label: 'Data Santri Aktif', icon: 'manageSantri', href: '/m-master-data/santri/manage' },
            { key: 'santri-alumni', label: 'Santri Alumni', icon: 'manageSantri', href: '/m-master-data/santri/arsip' },
            { key: 'permintaan', label: 'Permintaan', icon: 'receipt', href: '/m-master-data/santri/permintaan' },
            { key: 'upload', label: 'Upload Excel', icon: 'upload', href: '/m-master-data/santri/upload' },
            { key: 'kamar', label: 'Data Kamar', icon: 'manageKamar', href: '/m-master-data/kamar/manage' },
        ],
    },
    {
        key: 'keuangan', label: 'Perbendaharaan', icon: 'keuangan',
        children: [
            { key: 'keu-santri', label: 'Data Santri', icon: 'manageSantri', href: '/m-keuangan/santri' },
            { key: 'keu-home', label: 'Perbendaharaan', icon: 'keuangan', href: '/m-keuangan' },
        ],
    },
    {
        key: 'akademik', label: 'Madrasah', icon: 'akademikMenu',
        children: [
            { key: 'ak-santri', label: 'Data Santri', icon: 'manageSantri', href: '/m-akademik/santri' },
            { key: 'ak-kelas', label: 'Data Kelas', icon: 'manageKelas', href: '/m-akademik/kelas/manage' },
        ],
    },
    { key: 'users', label: 'Manajemen User', icon: 'userManagement', href: '/m-users/users' },
    { key: 'settings', label: 'Pengaturan', icon: 'settings', href: '/m-settings' },
]

function isAdminItemActive(pathname: string, item: AdminSidebarItem): boolean {
    if (item.href) return pathname === item.href || pathname.startsWith(item.href + '/')
    if (item.children) return item.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'))
    return false
}

/* ─── Helper: check if a path is active ─── */
function isNavActive(pathname: string, item: MobileNavItem): boolean {
    if (item.href) {
        return pathname === item.href || pathname.startsWith(item.href + '/')
    }
    if (item.children) {
        return item.children.some(
            (c) => pathname === c.href || pathname.startsWith(c.href + '/')
        )
    }
    return false
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession()
    const pathname = usePathname()
    const [openDropdown, setOpenDropdown] = useState<string | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const sidebarRef = useRef<HTMLDivElement>(null)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

    // Fetch logo from AppSetting
    const { data: logoUrl } = trpc.settings.get.useQuery('logo_url')

    // Auto-redirect to desktop if screen >= 720px
    useResponsiveRedirect('mobile')

    // Filter nav items based on role access
    const roleCodes: string[] = session?.user?.roleCodes ?? session?.user?.roles ?? [session?.user?.role ?? '']
    const filteredNav = useMemo(() => {
        const allowedPaths: string[] = session?.user?.allowedPagePaths ?? []
        const isAdmin = roleCodes.includes('ADMIN')

        if (isAdmin) return MOBILE_NAV_ITEMS
        if (!session?.user) return []

        return MOBILE_NAV_ITEMS.map((item) => {
            if (item.children) {
                const accessibleChildren = item.children.filter((child) => {
                    if (!child.pagePath) return true
                    return hasPathAccess(child.pagePath, allowedPaths)
                })
                if (accessibleChildren.length === 0) return null
                return { ...item, children: accessibleChildren }
            }

            if (item.pagePaths) {
                const hasAccess = item.pagePaths.some((p) => hasPathAccess(p, allowedPaths))
                if (!hasAccess) return null
            }

            return item
        }).filter(Boolean) as MobileNavItem[]
    }, [session, roleCodes])

    // Close sidebar on route change
    useEffect(() => { setSidebarOpen(false) }, [pathname])

    // Close dropdown on route change
    useEffect(() => {
        setOpenDropdown(null)
    }, [pathname])

    // Auto-open the group that matches current path
    useEffect(() => {
        const activeGroup = ADMIN_SIDEBAR.find(item => isAdminItemActive(pathname, item))
        if (activeGroup?.children) {
            setOpenGroups(prev => ({ ...prev, [activeGroup.key]: true }))
        }
    }, [pathname])

    // Close sidebar on outside tap
    useEffect(() => {
        if (!sidebarOpen) return
        const handler = (e: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
                setSidebarOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [sidebarOpen])

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(null)
            }
        }
        if (openDropdown) {
            document.addEventListener('mousedown', handleClick)
            return () => document.removeEventListener('mousedown', handleClick)
        }
    }, [openDropdown])

    const handleNavClick = (item: MobileNavItem) => {
        if (item.children) {
            setOpenDropdown((prev) => (prev === item.key ? null : item.key))
        } else {
            setOpenDropdown(null)
        }
    }

    const activeDropdown = filteredNav.find(
        (item) => item.key === openDropdown && item.children
    )

    const isAdminSidebarPage = roleCodes.includes('ADMIN') && !!session?.user

    return (
        <div className={`mobile-layout min-h-screen bg-slate-50 ${isAdminSidebarPage ? '' : 'pb-24'}`}>
            <TabSessionGuard />
            {/* ─── Header ─── */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt="Logo"
                                width={36}
                                height={36}
                                className="w-9 h-9 object-contain"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
                                <Icon name="akademik" size={18} className="text-white" />
                            </div>
                        )}
                        <span className="text-lg font-bold text-emerald-600 tracking-tight">LpApp.</span>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors"
                        aria-label="Keluar"
                    >
                        <Icon name="logout" size={18} className="text-current" />
                    </button>
                </div>
            </header>

            {/* ─── Main content ─── */}
            <main className="px-4 py-4">
                {children}
            </main>

            {/* ─── Admin FAB + Sidebar ─── */}
            {isAdminSidebarPage && (
                <>
                    {/* FAB */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Buka menu"
                        className="fixed bottom-6 left-4 z-50 w-12 h-12 rounded-2xl bg-emerald-500 shadow-xl shadow-emerald-500/40 flex items-center justify-center text-white active:scale-95 transition-transform"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Backdrop */}
                    <div
                        aria-hidden
                        onClick={() => setSidebarOpen(false)}
                        className={`fixed inset-0 z-[998] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                            }`}
                    />

                    {/* Slide-in sidebar */}
                    <div
                        ref={sidebarRef}
                        className={`fixed top-0 left-0 h-full w-[80vw] max-w-[310px] z-[999] bg-white shadow-2xl flex flex-col
                            transition-transform duration-300 ease-in-out
                            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                    >
                        {/* Sidebar header */}
                        <div className="flex items-center justify-between px-5 pt-10 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
                                    <Icon name="masterData" size={14} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-emerald-600 tracking-tight">LpApp.</p>
                                    <p className="text-[9px] text-slate-400 leading-none">Pesantren Management</p>
                                </div>
                            </div>
                            <button onClick={() => setSidebarOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                                aria-label="Tutup sidebar"
                            >
                                <Icon name="close" size={18} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Nav */}
                        <nav className="flex-1 overflow-y-auto py-2 px-2">
                            {ADMIN_SIDEBAR.map((item) => {
                                const groupActive = isAdminItemActive(pathname, item)
                                const groupOpen = !!openGroups[item.key]

                                if (!item.children) {
                                    return (
                                        <Link key={item.key} href={item.href!}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mx-1 my-0.5 transition-all
                                                ${groupActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${groupActive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                                <Icon name={item.icon} size={14} className={groupActive ? 'text-emerald-600' : 'text-slate-400'} />
                                            </div>
                                            <span className="flex-1">{item.label}</span>
                                            {groupActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                                        </Link>
                                    )
                                }

                                return (
                                    <div key={item.key} className="my-0.5">
                                        <button
                                            onClick={() => setOpenGroups(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mx-1 transition-all
                                                ${groupActive ? 'text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${groupActive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                                <Icon name={item.icon} size={14} className={groupActive ? 'text-emerald-600' : 'text-slate-400'} />
                                            </div>
                                            <span className="flex-1 text-left">{item.label}</span>
                                            <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${groupOpen ? 'rotate-180' : ''}`}
                                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        <div className={`overflow-hidden transition-all duration-200 ${groupOpen ? 'max-h-96' : 'max-h-0'}`}>
                                            <div className="ml-4 pl-3 border-l-2 border-slate-100 py-1 space-y-0.5">
                                                {item.children.map((child) => {
                                                    const childActive = pathname === child.href || pathname.startsWith(child.href + '/')
                                                    return (
                                                        <Link key={child.key} href={child.href}
                                                            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all
                                                                ${childActive ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-500 hover:bg-slate-50 font-medium'}`}
                                                        >
                                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${childActive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                                                <Icon name={child.icon} size={13} className={childActive ? 'text-emerald-600' : 'text-slate-400'} />
                                                            </div>
                                                            <span className="flex-1">{child.label}</span>
                                                            {childActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </nav>

                        <div className="px-4 py-3 border-t border-slate-100">
                            <p className="text-[10px] text-slate-300 font-medium">Tampilan Admin</p>
                        </div>
                    </div>
                </>
            )}

            {/* ─── Dropdown overlay ─── */}
            {!isAdminSidebarPage && openDropdown && (
                <div
                    className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[1px]"
                    onClick={() => setOpenDropdown(null)}
                    aria-hidden
                />
            )}

            {/* ─── Dropdown panel ─── */}
            {!isAdminSidebarPage && activeDropdown && (
                <div
                    className="fixed bottom-[104px] left-0 right-0 z-50 px-4 pb-3 animate-slide-up"
                    ref={dropdownRef}
                >
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-50">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                {activeDropdown.label}
                            </p>
                        </div>
                        <div className="py-1">
                            {activeDropdown.children!.map((child) => {
                                const childActive = pathname === child.href || pathname.startsWith(child.href + '/')
                                return (
                                    <Link
                                        key={child.key}
                                        href={child.href}
                                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${childActive
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${childActive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                            <Icon name={child.icon} size={16} className={childActive ? 'text-emerald-600' : 'text-slate-400'} />
                                        </div>
                                        <span className={`text-sm ${childActive ? 'font-semibold' : 'font-medium'}`}>
                                            {child.label}
                                        </span>
                                        {childActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Bottom Navigation (Pill Style) — hidden for admin sidebar pages ─── */}
            {!isAdminSidebarPage && (
                <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pt-1">
                    <div className="bg-white rounded-[20px] shadow-[0_-2px_20px_rgba(0,0,0,0.08)] border border-slate-100/80 flex items-center justify-around px-2 py-1.5">
                        {filteredNav.map((item) => {
                            const active = isNavActive(pathname, item)
                            const isOpen = openDropdown === item.key
                            const highlighted = active || isOpen

                            if (item.href && !item.children) {
                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        className="flex flex-col items-center py-1.5 px-1.5 min-w-0 flex-1"
                                        onClick={() => setOpenDropdown(null)}
                                    >
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${highlighted
                                            ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                                            : 'bg-transparent'
                                            }`}
                                        >
                                            <Icon
                                                name={item.icon}
                                                size={20}
                                                className={highlighted ? 'text-white' : 'text-slate-400'}
                                            />
                                        </div>
                                        <span className={`text-[10px] mt-1 font-medium truncate ${highlighted ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {item.label}
                                        </span>
                                    </Link>
                                )
                            }

                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleNavClick(item)}
                                    className="flex flex-col items-center py-1.5 px-1.5 min-w-0 flex-1"
                                >
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${highlighted
                                        ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                                        : 'bg-transparent'
                                        }`}
                                    >
                                        <Icon
                                            name={item.icon}
                                            size={20}
                                            className={highlighted ? 'text-white' : 'text-slate-400'}
                                        />
                                    </div>
                                    <span className={`text-[10px] mt-1 font-medium truncate ${highlighted ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </nav>
            )}
        </div>
    )
}
