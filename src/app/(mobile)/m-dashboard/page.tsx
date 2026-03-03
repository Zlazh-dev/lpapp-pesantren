'use client'

import { useSession, signOut } from 'next-auth/react'
import { trpc } from '@/utils/trpc'
import Link from 'next/link'

function greeting() {
    const h = new Date().getHours()
    if (h < 11) return "Selamat Pagi"
    if (h < 15) return "Selamat Siang"
    if (h < 18) return "Selamat Sore"
    return "Selamat Malam"
}

export default function MobileDashboard() {
    const { data: session } = useSession()
    const role = session?.user?.role ?? ''
    const fullName = session?.user?.fullName ?? 'Pengguna'

    const isPembimbing = role === 'PEMBIMBING_KAMAR'
    const isWaliKelas = role === 'WALI_KELAS'
    const isKnownRole = isPembimbing || isWaliKelas

    // Scope / assignment info
    const myScopeQuery = trpc.santriRequest.listMyScope.useQuery(
        { search: undefined },
        { enabled: isKnownRole, retry: false }
    )
    const myRequests = trpc.santriRequest.myRequests.useQuery(undefined, { enabled: isKnownRole, retry: false })

    const scopeData = myScopeQuery.data
    const santriList = scopeData?.santri ?? []
    const totalSantri = santriList.length
    const putra = santriList.filter((s: any) => s.gender === 'L').length
    const putri = santriList.filter((s: any) => s.gender === 'P').length
    const pendingReq = myRequests.data?.filter((r: any) => r.status === 'PENDING').length ?? 0
    const notAssigned = scopeData?.scopeType === 'NONE'

    // Scope label
    const scopeLabel = (() => {
        if (!scopeData || notAssigned) return 'Belum ada penugasan'
        if (isPembimbing) {
            // Find room info from first santri
            const room = (santriList[0] as any)?.dormRoom
            if (room) {
                const bldg = room.floor?.building?.name ?? ''
                const lt = room.floor?.number ? `Lantai ${room.floor.number}` : ''
                return `Kamar ${room.name}${bldg ? ` · ${bldg}` : ''}${lt ? ` · ${lt}` : ''}`
            }
            return 'Pembimbing Kamar'
        }
        if (isWaliKelas) {
            const cg = (santriList[0] as any)?.classGroup
            if (cg) {
                const level = cg.grade?.level?.name ?? ''
                return `Kelas ${cg.name}${level ? ` · ${level}` : ''}`
            }
            return 'Wali Kelas'
        }
        return ''
    })()

    const stats = [
        {
            label: 'Total Santri', value: totalSantri, color: 'bg-emerald-500', icon: (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            )
        },
        {
            label: 'Putra', value: putra, color: 'bg-sky-500', icon: (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )
        },
        {
            label: 'Putri', value: putri, color: 'bg-pink-500', icon: (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )
        },
        {
            label: 'Permintaan', value: pendingReq, color: 'bg-amber-500', icon: (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            )
        },
    ]

    const menus = [
        {
            label: 'Anak Didik Saya',
            desc: `${totalSantri} santri`,
            href: '/m-dashboard/santri-saya',
            color: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            ),
        },
        {
            label: 'Permintaan',
            desc: pendingReq > 0 ? `${pendingReq} menunggu` : 'Riwayat perubahan',
            href: '/m-dashboard/santri-saya',
            color: 'bg-amber-50',
            iconColor: 'text-amber-600',
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            ),
        },
        {
            label: 'Profil Saya',
            desc: 'Ubah akun',
            href: '/m-profile',
            color: 'bg-violet-50',
            iconColor: 'text-violet-600',
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            ),
        },
    ]

    // For unknown roles, fall back to simple dashboard
    if (!isKnownRole) {
        return (
            <div className="space-y-5 animate-fade-in">
                <div>
                    <p className="text-slate-400 text-sm">{greeting()}</p>
                    <h1 className="text-xl font-bold text-slate-800 mt-0.5">{fullName}</h1>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center">
                    <p className="text-sm text-slate-500">Selamat datang!</p>
                    <p className="text-xs text-slate-400 mt-1">Gunakan menu di bawah untuk navigasi.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in -mx-4 -mt-4">
            {/* ── Hero Header ── */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white px-4 pt-6 pb-20">
                <div className="flex justify-between items-start mb-5">
                    <div>
                        <p className="text-emerald-100 text-xs mb-0.5">{greeting()},</p>
                        <h1 className="text-2xl font-bold leading-tight">{fullName}</h1>
                        <p className="text-emerald-200 text-sm mt-1">
                            {isPembimbing ? 'Pembimbing Kamar' : 'Wali Kelas'}
                        </p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center active:scale-95 transition"
                        title="Keluar"
                    >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>

                {/* Scope badge */}
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3">
                    {isPembimbing ? (
                        <svg className="w-5 h-5 text-emerald-100 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-emerald-100 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    )}
                    <span className="text-sm text-white font-medium">
                        {myScopeQuery.isLoading ? 'Memuat...' : scopeLabel}
                    </span>
                </div>
            </div>

            <div className="px-4 space-y-5">
                {/* ── Stat Cards (float over hero) ── */}
                <div className="-mt-12 grid grid-cols-2 gap-3">
                    {myScopeQuery.isLoading
                        ? [1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-white rounded-2xl shadow-lg animate-pulse" />
                        ))
                        : stats.map((s, i) => (
                            <div key={i} className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50">
                                <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
                                    {s.icon}
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                            </div>
                        ))
                    }
                </div>

                {/* ── Not Assigned Warning ── */}
                {notAssigned && !myScopeQuery.isLoading && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="text-sm font-semibold text-amber-800">Belum ada penugasan</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                                Hubungi Admin untuk di-assign ke {isPembimbing ? 'kamar' : 'kelas'} Anda.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Menu Grid ── */}
                <div>
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Menu Utama</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {menus.map((m, i) => (
                            <Link
                                key={i}
                                href={m.href}
                                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3 active:scale-95 transition-transform hover:shadow-md"
                            >
                                <div className={`w-14 h-14 ${m.color} rounded-2xl flex items-center justify-center ${m.iconColor}`}>
                                    {m.icon}
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-slate-800">{m.label}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ── Info Banner ── */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 mb-4">
                    <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold text-emerald-800">Panduan</p>
                        <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                            Gunakan menu <strong>Santri Saya</strong> untuk melihat daftar santri dan mengajukan perubahan data kepada Admin.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
