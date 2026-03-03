'use client'

import { use, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { trpc } from '@/utils/trpc'
import { formatDate, getGenderLabel, formatRupiah, getBillStatusLabel, getBillStatusColor } from '@/utils/format'

export default function KeuanganSantriDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { data: santri, isLoading, error } = trpc.santri.getById.useQuery(id)
    const { data: finance } = trpc.billing.getSantriFinancialSummary.useQuery({ santriId: id }, { enabled: !!id })
    const { data: bills } = trpc.billing.listBySantri.useQuery({ santriId: id }, { enabled: !!id })
    const { data: requests } = trpc.santriRequest.listBySantri.useQuery({ santriId: id }, { enabled: !!id })

    const [showMenu, setShowMenu] = useState(false)
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
        }
        if (showMenu) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showMenu])

    // Loading
    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                        <div className="aspect-[3/4] bg-slate-200 rounded-xl animate-pulse" />
                        <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mx-auto" />
                    </div>
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Error
    if (error) {
        return (
            <div className="max-w-5xl mx-auto">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
                    <p className="text-lg font-semibold text-red-700">Gagal memuat data santri</p>
                    <p className="text-sm text-red-500 mt-1">{error.message}</p>
                    <Link href="/keuangan/santri" className="mt-5 inline-flex px-5 py-2.5 rounded-xl border border-red-300 bg-white text-sm font-medium text-red-700 hover:bg-red-50 transition-all">
                        ← Kembali ke List
                    </Link>
                </div>
            </div>
        )
    }

    if (!santri) return null

    const cg = (santri as any).classGroup
    const jenjang = cg?.grade?.level?.name ?? '-'
    const kelas = cg?.name ?? '-'
    const kamarName = (() => {
        const dr = (santri as any).dormRoom
        if (!dr) return '-'
        const gedung = dr.floor?.building?.name
        return gedung ? `${gedung} — ${dr.name}` : dr.name
    })()
    const initial = santri.fullName.charAt(0).toUpperCase()
    const displayPhoto = santri.photoUrl

    const calcAge = (bd: string | Date | null | undefined): string => {
        if (!bd) return '-'
        const birth = new Date(bd)
        const now = new Date()
        let age = now.getFullYear() - birth.getFullYear()
        const m = now.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
        return `${age} tahun`
    }

    const pendingCount = (requests ?? []).filter((r: any) => r.status === 'PENDING').length

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/keuangan/santri" className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:shadow-sm transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-800">Detail Santri</h1>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">Perbendaharaan</span>
                </div>
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setShowMenu(!showMenu)}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all"
                        title="Menu">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>
                    {showMenu && (
                        <div data-kebab className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 py-1.5 z-50 animate-fade-in">
                            <Link href={`/keuangan/santri/${id}/request`}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors"
                                onClick={() => setShowMenu(false)}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                Request Perubahan
                                {pendingCount > 0 && (
                                    <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1">{pendingCount}</span>
                                )}
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Layout: Photo LEFT │ Data RIGHT */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
                {/* LEFT: Photo */}
                <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="relative group">
                            {displayPhoto ? (
                                <Image src={displayPhoto} alt={santri.fullName} width={320} height={400}
                                    className="w-full aspect-[3/4] object-cover" />
                            ) : (
                                <div className="w-full aspect-[3/4] bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-600 flex items-center justify-center">
                                    <span className="text-white/90 text-7xl font-bold">{initial}</span>
                                </div>
                            )}
                            {displayPhoto && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-5">
                                    <button onClick={() => setShowPhotoModal(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-teal-600 text-sm font-medium transition-all shadow-lg backdrop-blur-sm">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Lihat
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-5 text-center space-y-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">{santri.fullName}</h2>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">NIS: {santri.nis}</p>
                            </div>
                        </div>
                    </div>

                    {/* Orang Tua */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">Data Orang Tua</h3>
                        </div>
                        <div className="space-y-3">
                            <InfoRow label="Ayah" value={(santri as any).fatherName ?? '-'} />
                            <InfoRow label="Ibu" value={(santri as any).motherName ?? '-'} />
                            <InfoRow label="HP Ayah" value={(santri as any).fatherPhone ?? '-'} />
                            <InfoRow label="HP Ibu" value={(santri as any).motherPhone ?? '-'} />
                        </div>
                    </div>
                </div>

                {/* RIGHT: Data */}
                <div className="space-y-6">
                    {/* Data Pribadi */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">Data Pribadi</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            <InfoRow label="Nama Lengkap" value={santri.fullName} />
                            <InfoRow label="NIS" value={santri.nis} />
                            <InfoRow label="Jenis Kelamin" value={getGenderLabel(santri.gender)} />
                            <InfoRow label="Umur" value={calcAge(santri.birthDate)} />
                            <InfoRow label="Tempat Lahir" value={santri.birthPlace ?? '-'} />
                            <InfoRow label="Tanggal Lahir" value={santri.birthDate ? formatDate(santri.birthDate) : '-'} />
                            <InfoRow label="No. HP" value={santri.phone ?? '-'} />
                            <InfoRow label="Status" value={santri.isActive ? 'Aktif' : 'Nonaktif'} />
                        </div>
                    </div>

                    {/* Akademik & Asrama */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">Akademik & Asrama</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            <InfoRow label="Jenjang" value={jenjang} />
                            <InfoRow label="Kelas" value={kelas} />
                            <InfoRow label="Kamar" value={kamarName} />
                        </div>
                    </div>

                    {/* Ringkasan Keuangan */}
                    {finance && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">Ringkasan Keuangan</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <SummaryCard label="Total Tagihan" value={formatRupiah(finance.totalInvoiced)} color="slate" />
                                <SummaryCard label="Sudah Dibayar" value={formatRupiah(finance.totalPaid)} color="emerald" />
                                <SummaryCard label="Tunggakan" value={formatRupiah(finance.outstanding)} color={finance.outstanding > 0 ? 'red' : 'slate'} />
                            </div>
                            <div className="flex gap-4">
                                <MiniStat label="Lunas" count={finance.paidInvoiceCount} color="emerald" />
                                <MiniStat label="Sebagian" count={finance.partialInvoiceCount} color="amber" />
                                <MiniStat label="Belum bayar" count={finance.pendingInvoiceCount} color="red" />
                            </div>
                        </div>
                    )}

                    {/* Riwayat Tagihan */}
                    {bills && bills.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">Riwayat Tagihan</h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {bills.map((bill: any) => {
                                    const statusColor = getBillStatusColor(bill.status)
                                    return (
                                        <div key={bill.id} className="px-6 py-3.5 flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-800">{bill.type}{bill.billingModel ? ` — ${bill.billingModel.name}` : ''}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{bill.period ?? ''} {bill.dueDate ? `• Jatuh tempo: ${formatDate(bill.dueDate)}` : ''}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-semibold text-slate-800">{formatRupiah(bill.amount)}</p>
                                                {bill.paidAmount > 0 && bill.paidAmount < bill.amount && (
                                                    <p className="text-[11px] text-slate-400">Dibayar: {formatRupiah(bill.paidAmount)}</p>
                                                )}
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusColor}`}>
                                                {getBillStatusLabel(bill.status)}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Modal */}
            {showPhotoModal && displayPhoto && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
                    <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                        <Image src={displayPhoto} alt={santri.fullName} width={600} height={800} className="w-full rounded-2xl object-contain" />
                        <button onClick={() => setShowPhotoModal(false)}
                            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm text-slate-700 mt-0.5">{value}</p>
        </div>
    )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
    const colorMap: Record<string, string> = {
        slate: 'bg-slate-50 text-slate-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        red: 'bg-red-50 text-red-700',
    }
    return (
        <div className={`rounded-xl p-4 ${colorMap[color] ?? colorMap.slate}`}>
            <p className="text-[11px] font-medium opacity-70">{label}</p>
            <p className="text-lg font-bold mt-1">{value}</p>
        </div>
    )
}

function MiniStat({ label, count, color }: { label: string; count: number; color: string }) {
    const dotMap: Record<string, string> = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' }
    return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${dotMap[color] ?? 'bg-slate-400'}`} />
            {label}: <span className="font-semibold text-slate-700">{count}</span>
        </div>
    )
}
