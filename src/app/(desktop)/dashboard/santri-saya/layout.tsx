'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { trpc } from '@/utils/trpc'

const navItems = [
    {
        href: '/dashboard/santri-saya/data',
        label: 'Data Santri',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        href: '/dashboard/santri-saya/permintaan',
        label: 'Permintaan',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
        ),
        badge: true,
    },
]

export default function SantriSayaLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { data: myRequests } = trpc.santriRequest.myRequests.useQuery()
    const pendingCount = myRequests?.filter((r: any) => r.status === 'PENDING' || r.status === 'IN_DISCUSSION').length ?? 0

    return (
        <div className="flex gap-4 min-h-0">
            {/* Sidebar */}
            <aside className="w-52 flex-shrink-0">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-4">
                    {/* Sidebar Header */}
                    <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/80">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Santri Saya</p>
                    </div>

                    {/* Nav Items */}
                    <nav className="p-2 space-y-0.5">
                        {navItems.map(item => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                            return (
                                <Link key={item.href} href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                            ? 'bg-teal-50 text-teal-700 border border-teal-100 shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                                        }`}>
                                    <span className={isActive ? 'text-teal-600' : 'text-slate-400'}>{item.icon}</span>
                                    <span className="flex-1">{item.label}</span>
                                    {item.badge && pendingCount > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{pendingCount}</span>
                                    )}
                                    {isActive && (
                                        <svg className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {children}
            </main>
        </div>
    )
}
