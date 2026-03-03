'use client'

import { trpc } from '@/utils/trpc'

export default function DashboardPage() {
    const statsQuery = trpc.santri.dashboardStats.useQuery(undefined, { retry: false })

    const isLoading = statsQuery.isLoading
    const stats = statsQuery.data

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                        <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
                    ))}
                </div>
            </div>
        )
    }

    if (statsQuery.error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Beranda</h1>
                    <p className="mt-1 text-sm text-slate-500">Ringkasan data utama sistem pesantren.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <p className="text-slate-600 font-medium">Selamat datang!</p>
                    <p className="text-sm text-slate-400 mt-1">Gunakan menu di sidebar untuk mengakses fitur yang tersedia.</p>
                </div>
            </div>
        )
    }

    const cards = [
        {
            title: 'Total Santri',
            value: (stats?.total ?? 0).toLocaleString('id-ID'),
            bgIcon: 'bg-teal-50',
            textIcon: 'text-teal-600',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            title: 'Santri Putra',
            value: (stats?.putra ?? 0).toLocaleString('id-ID'),
            bgIcon: 'bg-blue-50',
            textIcon: 'text-blue-600',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
        },
        {
            title: 'Santri Putri',
            value: (stats?.putri ?? 0).toLocaleString('id-ID'),
            bgIcon: 'bg-pink-50',
            textIcon: 'text-pink-600',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
        },
        {
            title: "Ma'had Aly",
            value: (stats?.mahadAly ?? 0).toLocaleString('id-ID'),
            bgIcon: 'bg-emerald-50',
            textIcon: 'text-emerald-600',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            ),
        },
        {
            title: 'Tahfidz',
            value: (stats?.tahfidz ?? 0).toLocaleString('id-ID'),
            bgIcon: 'bg-amber-50',
            textIcon: 'text-amber-600',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            ),
        },
        {
            title: 'Formal',
            value: (stats?.formal ?? 0).toLocaleString('id-ID'),
            bgIcon: 'bg-violet-50',
            textIcon: 'text-violet-600',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
        },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Beranda</h1>
                <p className="mt-1 text-sm text-slate-500">Ringkasan data utama sistem pesantren.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {cards.map((card) => (
                    <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">{card.title}</p>
                                <p className="mt-2 text-3xl font-bold text-slate-800">{card.value}</p>
                            </div>
                            <div className={`rounded-xl ${card.bgIcon} p-3 ${card.textIcon}`}>
                                {card.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {stats && stats.total === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                    Belum ada data santri. Tambahkan santri melalui menu Data Pusat → Data Santri Aktif.
                </div>
            )}
        </div>
    )
}
