'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { trpc } from '@/utils/trpc'
import { formatDate, getGenderLabel, formatRupiah, getBillStatusLabel, getBillStatusColor } from '@/utils/format'

// ─── Types ───────────────────────────────────────────────────
type Variant = 'akademik' | 'keuangan' | 'master-data'

const SECTION_CONFIG: Record<Variant, {
    label: string
    badge: string
    gradient: string
    backHref: string
    requestHref: (id: string) => string
}> = {
    'akademik': {
        label: 'Madrasah',
        badge: 'bg-blue-50 border-blue-200 text-blue-700',
        gradient: 'from-blue-400 via-blue-500 to-indigo-600',
        backHref: '/m-akademik/santri',
        requestHref: (id) => `/m-akademik/santri/${id}/request`,
    },
    'keuangan': {
        label: 'Perbendaharaan',
        badge: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        gradient: 'from-teal-400 via-teal-500 to-emerald-600',
        backHref: '/m-keuangan/santri',
        requestHref: (id) => `/m-keuangan/santri/${id}/request`,
    },
    'master-data': {
        label: 'Data Pusat',
        badge: 'bg-slate-50 border-slate-300 text-slate-700',
        gradient: 'from-slate-400 via-slate-500 to-slate-600',
        backHref: '/m-master-data/santri/manage',
        requestHref: (id) => `/m-master-data/santri/manage/${id}`,
    },
}

// ─── Shared Sections ─────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm text-slate-700 mt-0.5 font-medium">{value}</p>
        </div>
    )
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-50">
                {icon}
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>
    )
}

// ─── Finance section (keuangan only) ─────────────────────────
function FinanceSection({ santriId }: { santriId: string }) {
    const { data: finance } = trpc.billing.getSantriFinancialSummary.useQuery({ santriId }, { enabled: !!santriId })
    const { data: bills } = trpc.billing.listBySantri.useQuery({ santriId }, { enabled: !!santriId })

    if (!finance && !bills) return null

    return (
        <>
            {finance && (
                <SectionCard
                    icon={<div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>}
                    title="Ringkasan Keuangan"
                >
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-slate-400 font-medium">Total Tagihan</p>
                            <p className="text-xs font-bold text-slate-700 mt-1">{formatRupiah(finance.totalInvoiced)}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-emerald-600 font-medium">Dibayar</p>
                            <p className="text-xs font-bold text-emerald-700 mt-1">{formatRupiah(finance.totalPaid)}</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center ${finance.outstanding > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                            <p className={`text-[10px] font-medium ${finance.outstanding > 0 ? 'text-red-500' : 'text-slate-400'}`}>Tunggakan</p>
                            <p className={`text-xs font-bold mt-1 ${finance.outstanding > 0 ? 'text-red-700' : 'text-slate-700'}`}>{formatRupiah(finance.outstanding)}</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        {[{ label: '✓ Lunas', count: finance.paidInvoiceCount, color: 'text-emerald-600' },
                        { label: '~ Sebagian', count: finance.partialInvoiceCount, color: 'text-amber-600' },
                        { label: '✗ Belum', count: finance.pendingInvoiceCount, color: 'text-red-500' }].map(s => (
                            <span key={s.label} className={`text-xs font-medium ${s.color}`}>{s.label}: <strong>{s.count}</strong></span>
                        ))}
                    </div>
                </SectionCard>
            )}

            {bills && bills.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-50">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">Riwayat Tagihan</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {bills.map((bill: any) => (
                            <div key={bill.id} className="px-4 py-3 flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-800 truncate">{bill.type}{bill.billingModel ? ` — ${bill.billingModel.name}` : ''}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{bill.period ?? ''}{bill.dueDate ? ` • Jatuh tempo: ${formatDate(bill.dueDate)}` : ''}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-semibold text-slate-800">{formatRupiah(bill.amount)}</p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getBillStatusColor(bill.status)}`}>
                                    {getBillStatusLabel(bill.status)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}

// ─── Main Component ───────────────────────────────────────────
export default function MobileSantriDetailPage({ params, variant }: {
    params: Promise<{ id: string }>
    variant: Variant
}) {
    const { id } = use(params)
    const config = SECTION_CONFIG[variant]

    const { data: santri, isLoading, error } = trpc.santri.getById.useQuery(id)
    const { data: requests } = trpc.santriRequest.listBySantri.useQuery({ santriId: id }, { enabled: !!id })

    const [showPhotoModal, setShowPhotoModal] = useState(false)

    // ── Loading ────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
                    <div className="h-5 w-32 bg-slate-100 rounded animate-pulse" />
                </div>
                {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
            </div>
        )
    }

    if (error || !santri) {
        return (
            <div className="space-y-4">
                <Link href={config.backHref} className="h-10 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </Link>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                    <p className="text-sm font-semibold text-red-700">Gagal memuat data santri</p>
                    <p className="text-xs text-red-400 mt-1">{error?.message}</p>
                </div>
            </div>
        )
    }

    // ── Derived data ───────────────────────────────────────────
    const cg = (santri as any).classGroup
    const jenjang = cg?.grade?.level?.name ?? '-'
    const grade = cg?.grade?.name ?? '-'
    const kelas = cg?.name ?? '-'
    const schoolYear = cg?.schoolYear?.name ?? '-'
    const dr = (santri as any).dormRoom
    const kamarName = dr ? (dr.floor?.building?.name ? `${dr.floor.building.name} — ${dr.name}` : dr.name) : '-'
    const addr = santri.address as Record<string, string> | null
    const initial = santri.fullName.charAt(0).toUpperCase()
    const pendingCount = (requests ?? []).filter((r: any) => r.status === 'PENDING').length

    const calcAge = (bd: string | Date | null | undefined) => {
        if (!bd) return '-'
        const birth = new Date(bd), now = new Date()
        let age = now.getFullYear() - birth.getFullYear()
        if (now.getMonth() - birth.getMonth() < 0 || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
        return `${age} tahun`
    }

    return (
        <div className="space-y-4 animate-fade-in pb-4">
            {/* ── Back + Section badge ─────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link href={config.backHref}
                        className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 active:bg-slate-50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${config.badge}`}>{config.label}</span>
                </div>

                {/* Request link */}
                <Link href={config.requestHref(id)}
                    className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                    Request
                    {pendingCount > 0 && (
                        <span className="min-w-[16px] h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1">{pendingCount}</span>
                    )}
                </Link>
            </div>

            {/* ── Hero card ────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {/* Photo banner */}
                <div className="relative h-48" onClick={() => santri.photoUrl && setShowPhotoModal(true)}>
                    {santri.photoUrl ? (
                        <Image src={santri.photoUrl} alt={santri.fullName} fill className="object-cover object-top" />
                    ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                            <span className="text-white/90 text-6xl font-bold">{initial}</span>
                        </div>
                    )}
                    {santri.photoUrl && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent flex items-end justify-end p-3">
                            <span className="text-white/80 text-xs bg-black/30 px-2 py-1 rounded-lg backdrop-blur-sm">Ketuk untuk perbesar</span>
                        </div>
                    )}
                </div>

                {/* Name + NIS */}
                <div className="px-4 py-3 border-b border-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">{santri.fullName}</h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">NIS: {santri.nis}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${santri.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span className="text-xs text-slate-500">{santri.isActive ? 'Aktif' : 'Nonaktif'}</span>
                    </div>
                </div>

                {/* Quick info pills */}
                <div className="flex gap-2 flex-wrap px-4 py-3">
                    {[
                        { label: getGenderLabel(santri.gender) },
                        { label: calcAge(santri.birthDate) },
                        { label: kelas !== '-' ? kelas : null },
                        { label: kamarName !== '-' ? kamarName : null },
                    ].filter(p => p.label).map((p, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{p.label}</span>
                    ))}
                </div>
            </div>

            {/* ── Data Pribadi ──────────────────────────────── */}
            <SectionCard
                icon={<div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center"><svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>}
                title="Data Pribadi"
            >
                <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Nama Lengkap" value={santri.fullName} />
                    <InfoRow label="NIS" value={santri.nis} />
                    <InfoRow label="Jenis Kelamin" value={getGenderLabel(santri.gender)} />
                    <InfoRow label="Umur" value={calcAge(santri.birthDate)} />
                    <InfoRow label="Tempat Lahir" value={santri.birthPlace ?? '-'} />
                    <InfoRow label="Tanggal Lahir" value={santri.birthDate ? formatDate(santri.birthDate) : '-'} />
                    <InfoRow label="No. HP" value={santri.phone ?? '-'} />
                    <InfoRow label="Tgl. Masuk" value={santri.enrollmentDate ? formatDate(santri.enrollmentDate) : '-'} />
                </div>
            </SectionCard>

            {/* ── Akademik & Asrama ─────────────────────────── */}
            <SectionCard
                icon={<div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>}
                title="Akademik & Asrama"
            >
                {/* Akademik grid cards */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                        { label: 'Jenjang', value: jenjang, color: 'bg-blue-50' },
                        { label: 'Tingkat', value: grade, color: 'bg-indigo-50' },
                        { label: 'Kelas / Rombel', value: kelas, color: 'bg-emerald-50' },
                        { label: 'Tahun Ajaran', value: schoolYear, color: 'bg-amber-50' },
                    ].map(card => (
                        <div key={card.label} className={`${card.color} rounded-xl p-3`}>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{card.label}</p>
                            <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{card.value}</p>
                        </div>
                    ))}
                </div>
                <div className="border-t border-slate-50 pt-3">
                    <InfoRow label="Kamar" value={kamarName} />
                </div>
            </SectionCard>

            {/* ── Orang Tua ─────────────────────────────────── */}
            <SectionCard
                icon={<div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>}
                title="Data Orang Tua"
            >
                <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Nama Ayah" value={(santri as any).fatherName ?? '-'} />
                    <InfoRow label="Nama Ibu" value={(santri as any).motherName ?? '-'} />
                    <InfoRow label="HP Ayah" value={(santri as any).fatherPhone ?? '-'} />
                    <InfoRow label="HP Ibu" value={(santri as any).motherPhone ?? '-'} />
                    {(santri as any).waliName && <InfoRow label="Wali" value={(santri as any).waliName} />}
                    {(santri as any).waliPhone && <InfoRow label="HP Wali" value={(santri as any).waliPhone} />}
                </div>
            </SectionCard>

            {/* ── Alamat ────────────────────────────────────── */}
            {addr && Object.values(addr).some(v => v) && (
                <SectionCard
                    icon={<div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center"><svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>}
                    title="Alamat"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <InfoRow label="Jalan" value={addr.jalan || '-'} />
                        <InfoRow label="RT/RW" value={addr.rt_rw || '-'} />
                        <InfoRow label="Kelurahan" value={addr.kelurahan || '-'} />
                        <InfoRow label="Kecamatan" value={addr.kecamatan || '-'} />
                        <InfoRow label="Kota / Kab." value={addr.kota || '-'} />
                        <InfoRow label="Provinsi" value={addr.provinsi || '-'} />
                    </div>
                </SectionCard>
            )}

            {/* ── Finance Section (keuangan only) ──────────── */}
            {variant === 'keuangan' && <FinanceSection santriId={id} />}

            {/* ── Photo modal ───────────────────────────────── */}
            {showPhotoModal && santri.photoUrl && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
                    <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <Image src={santri.photoUrl} alt={santri.fullName} width={400} height={533} className="w-full rounded-2xl object-contain" />
                        <button onClick={() => setShowPhotoModal(false)}
                            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center text-lg">✕</button>
                    </div>
                </div>
            )}
        </div>
    )
}
