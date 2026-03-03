'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { trpc } from '@/utils/trpc'
import { formatDate, getGenderLabel } from '@/utils/format'

export default function SantriSayaDetailPage({ params }: { params: Promise<{ santriId: string }> }) {
    const { santriId } = use(params)
    const { data: santri, isLoading, error } = trpc.santriRequest.getSantriDetail.useQuery(santriId)
    const [showPhotoModal, setShowPhotoModal] = useState(false)

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

    if (error) {
        return (
            <div className="max-w-5xl mx-auto">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
                    <p className="text-lg font-semibold text-red-700">Gagal memuat data santri</p>
                    <p className="text-sm text-red-500 mt-1">{error.message}</p>
                    <Link href="/dashboard/santri-saya" className="mt-5 inline-flex px-5 py-2.5 rounded-xl border border-red-300 bg-white text-sm font-medium text-red-700 hover:bg-red-50 transition-all">
                        Kembali
                    </Link>
                </div>
            </div>
        )
    }

    if (!santri) return null

    const cg = (santri as any).classGroup
    const jenjang = cg?.grade?.level?.name ?? '-'
    const grade = cg?.grade?.name ?? '-'
    const kelas = cg?.name ?? '-'
    const schoolYear = cg?.schoolYear?.name ?? '-'
    const kamarName = (() => {
        const dr = (santri as any).dormRoom
        if (!dr) return '-'
        const gedung = dr.floor?.building?.name
        return gedung ? `${gedung} — ${dr.name}` : dr.name
    })()
    const initial = santri.fullName.charAt(0).toUpperCase()
    const displayPhoto = santri.photoUrl
    const addr = santri.address as Record<string, string> | null

    const calcAge = (bd: string | Date | null | undefined): string => {
        if (!bd) return '-'
        const birth = new Date(bd)
        const now = new Date()
        let age = now.getFullYear() - birth.getFullYear()
        const m = now.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
        return `${age} tahun`
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header Bar */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard/santri-saya" className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:shadow-sm transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 className="text-2xl font-bold text-slate-800">Detail Santri</h1>
                <span className="rounded-full bg-violet-50 border border-violet-200 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">Read-only</span>
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
                                <div className="w-full aspect-[3/4] bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 flex items-center justify-center">
                                    <span className="text-white/90 text-7xl font-bold">{initial}</span>
                                </div>
                            )}
                            {displayPhoto && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-5">
                                    <button onClick={() => setShowPhotoModal(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 text-sm font-medium transition-all shadow-lg backdrop-blur-sm">
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

                    {/* Info Akademik */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">Informasi Akademik</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <AcademicCard label="Jenjang" value={jenjang} icon={
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            } />
                            <AcademicCard label="Tingkat" value={grade} icon={
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            } />
                            <AcademicCard label="Kelas / Rombel" value={kelas} icon={
                                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            } />
                            <AcademicCard label="Tahun Ajaran" value={schoolYear} icon={
                                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            } />
                        </div>
                    </div>

                    {/* Asrama */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">Asrama</h3>
                        </div>
                        <InfoRow label="Kamar" value={kamarName} />
                    </div>

                    {/* Alamat */}
                    {addr && Object.values(addr).some(v => v) && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">Alamat</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <InfoRow label="Jalan" value={addr.jalan || '-'} />
                                <InfoRow label="RT/RW" value={addr.rt_rw || '-'} />
                                <InfoRow label="Kelurahan" value={addr.kelurahan || '-'} />
                                <InfoRow label="Kecamatan" value={addr.kecamatan || '-'} />
                                <InfoRow label="Kota/Kabupaten" value={addr.kota || '-'} />
                                <InfoRow label="Provinsi" value={addr.provinsi || '-'} />
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
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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

function AcademicCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{value}</p>
            </div>
        </div>
    )
}
