'use client'

import { use, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import { formatDate, getGenderLabel } from '@/utils/format'

export default function DetailAlumniPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const utils = trpc.useUtils()
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const [showKkModal, setShowKkModal] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [showReactivateConfirm, setShowReactivateConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const { data: santri, isLoading, error } = trpc.santri.getById.useQuery(id)

    const reactivateMut = trpc.santri.reactivate.useMutation({
        onSuccess: () => {
            utils.santri.listArchived.invalidate()
            utils.santri.listCentralized.invalidate()
            router.push('/master-data/santri/arsip')
        },
    })

    const deleteMut = trpc.santri.delete.useMutation({
        onSuccess: () => {
            utils.santri.listArchived.invalidate()
            router.push('/master-data/santri/arsip')
        },
    })


    // ── Loading ──
    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                        <div className="aspect-[3/4] bg-slate-200 rounded-xl animate-pulse" />
                        <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mx-auto" />
                        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mx-auto" />
                    </div>
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ── Error ──
    if (error) {
        return (
            <div className="max-w-5xl mx-auto">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <p className="text-lg font-semibold text-red-700">Gagal memuat data alumni</p>
                    <p className="text-sm text-red-500 mt-1">{error.message}</p>
                    <Link href="/master-data/santri/arsip" className="mt-5 inline-flex px-5 py-2.5 rounded-xl border border-red-300 bg-white text-sm font-medium text-red-700 hover:bg-red-50 transition-all">
                        ← Kembali ke Arsip
                    </Link>
                </div>
            </div>
        )
    }

    if (!santri) return null

    const jenjang = (santri as any).classGroup?.grade?.level?.name ?? '-'
    const kelas = (santri as any).classGroup?.name ?? '-'
    const kamarName = (santri as any).dormRoom?.name ?? '-'
    const lantaiRaw = (santri as any).dormRoom?.floor?.number ?? null
    const lantaiName = lantaiRaw != null ? `Lantai ${lantaiRaw}` : '-'
    const gedungName = (santri as any).dormRoom?.floor?.building?.name ?? '-'
    const initial = santri.fullName.charAt(0).toUpperCase()
    const displayPhoto = santri.photoUrl

    // Calculate age from birthDate
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/master-data/santri/arsip" className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:shadow-sm transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Detail Alumni</h1>
                        <p className="text-xs text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Status: Nonaktif
                            {(santri as any).deactivatedAt && (
                                <span className="ml-2 text-slate-400">— Keluar: {formatDate((santri as any).deactivatedAt)}</span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                        </svg>
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-full mt-2 z-40 w-56 rounded-xl border border-slate-200 bg-white shadow-xl py-1.5 animate-fade-in">
                                <Link
                                    href={`/master-data/santri/manage/${id}?edit=true`}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                    onClick={() => setShowMenu(false)}
                                >
                                    <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Data
                                </Link>
                                <Link
                                    href={`/master-data/santri/arsip/${id}/finance`}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                    onClick={() => setShowMenu(false)}
                                >
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Finance
                                </Link>
                                <button
                                    onClick={() => {
                                        setShowMenu(false)
                                        setShowReactivateConfirm(true)
                                    }}
                                    disabled={reactivateMut.isPending}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-50"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    {reactivateMut.isPending ? 'Mengaktifkan...' : 'Aktifkan Kembali'}
                                </button>

                                <div className="my-1.5 border-t border-slate-100" />
                                <button
                                    onClick={() => {
                                        setShowMenu(false)
                                        setShowDeleteConfirm(true)
                                    }}
                                    disabled={deleteMut.isPending}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Hapus
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ═══ Main Layout: Photo LEFT │ Data RIGHT ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

                {/* ── LEFT column: Photo + Orang Tua ── */}
                <div className="space-y-6">
                    {/* Photo Profile Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="relative group">
                            {displayPhoto ? (
                                <Image
                                    src={displayPhoto}
                                    alt={santri.fullName}
                                    width={320}
                                    height={400}
                                    className="w-full aspect-[3/4] object-cover"
                                />
                            ) : (
                                <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 flex items-center justify-center">
                                    <span className="text-white/90 text-7xl font-bold">{initial}</span>
                                </div>
                            )}

                            {/* Nonaktif overlay */}
                            <div className="absolute inset-0 bg-black/25 pointer-events-none" />
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-red-600/90 via-red-600/70 to-transparent pt-10 pb-4 pointer-events-none">
                                <p className="text-center text-white font-extrabold text-lg tracking-[0.2em] uppercase drop-shadow-lg">Nonaktif</p>
                            </div>

                            {/* Hover overlay — view only */}
                            {displayPhoto && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-14">
                                    <button
                                        onClick={() => setShowPhotoModal(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-teal-600 text-sm font-medium transition-all shadow-lg backdrop-blur-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Lihat
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Name below photo */}
                        <div className="p-5 text-center space-y-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">{santri.fullName}</h2>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">NIS: {santri.nis}</p>
                            </div>
                        </div>
                    </div>

                    {/* Data Orang Tua */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Data Orang Tua / Wali</h3>
                        </div>
                        <dl className="space-y-3">
                            <Field label="Nama Ayah" value={santri.fatherName} />
                            <Field label="Nama Ibu" value={santri.motherName} />
                            <Field label="No. HP Ayah" value={santri.fatherPhone} />
                            <Field label="No. HP Ibu" value={santri.motherPhone} />
                            <Field label="Nama Wali" value={(santri as any).waliName} />
                            <Field label="No. HP Wali" value={(santri as any).waliPhone} />
                        </dl>
                    </div>
                </div>

                {/* ── RIGHT: Data Cards ── */}
                <div className="space-y-6">
                    {/* Data Pribadi */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                                <svg className="w-4.5 h-4.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Data Pribadi</h3>
                        </div>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                            <Field label="Nama Lengkap" value={santri.fullName} />
                            <Field label="NIS" value={santri.nis} mono />
                            <Field label="Gender" value={getGenderLabel(santri.gender)} />
                            <Field label="Tempat Lahir" value={santri.birthPlace} />
                            <Field label="Tanggal Lahir" value={santri.birthDate ? formatDate(santri.birthDate) : null} />
                            <Field label="Umur" value={calcAge(santri.birthDate)} />
                            <Field label="No. HP" value={santri.phone} />
                            <Field label="Gedung" value={gedungName} />
                            <Field label="Lantai" value={lantaiName} />
                            <Field label="Kamar" value={kamarName} />
                            <Field label="Jenjang" value={jenjang} />
                            <Field label="Kelas" value={kelas} />
                            <Field label="NIK" value={(santri as any).nik} mono />
                            <Field label="No. KK" value={(santri as any).noKK} mono />
                            <Field label="Tanggal Masuk" value={(santri as any).enrollmentDate ? formatDate((santri as any).enrollmentDate) : null} />
                            <Field label="Tanggal Keluar" value={(santri as any).deactivatedAt ? formatDate((santri as any).deactivatedAt) : null} />
                            <Field label="Jenjang Pendidikan" value={(santri as any).educationLevel} />
                        </dl>
                    </div>

                    {/* Alamat */}
                    {(() => {
                        const addr = (santri.address && typeof santri.address === 'object') ? santri.address as Record<string, string> : null
                        return (
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
                                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Alamat</h3>
                                </div>
                                {addr && Object.values(addr).some((v) => v) ? (
                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                        <div className="md:col-span-2">
                                            <Field label="Jalan" value={addr.jalan} />
                                        </div>
                                        <Field label="RT/RW" value={addr.rt_rw} />
                                        <Field label="Kelurahan / Desa" value={addr.kelurahan} />
                                        <Field label="Kecamatan" value={addr.kecamatan} />
                                        <Field label="Kota / Kabupaten" value={addr.kota} />
                                        <Field label="Provinsi" value={addr.provinsi} />
                                    </dl>
                                ) : (
                                    <p className="text-sm text-slate-300 italic">Belum diisi</p>
                                )}
                            </div>
                        )
                    })()}

                    {/* File KK (read-only) */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">File Kartu Keluarga (KK)</h3>
                        </div>

                        {(santri as any).kkFileUrl ? (
                            <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                                {((santri as any).kkFileUrl as string).startsWith('data:image') || ((santri as any).kkFileUrl as string).match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={(santri as any).kkFileUrl}
                                            alt="Kartu Keluarga"
                                            className="w-full max-h-48 object-contain p-2"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                            <button
                                                onClick={() => {
                                                    const url = (santri as any).kkFileUrl as string
                                                    if (url.startsWith('data:')) {
                                                        setShowKkModal(true)
                                                    } else {
                                                        window.open(url, '_blank', 'noopener,noreferrer')
                                                    }
                                                }}
                                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-teal-600 text-sm font-medium transition-all shadow-lg backdrop-blur-sm"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Lihat
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-4 p-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700">File KK tersedia</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Format: Dokumen</p>
                                        </div>
                                        <a
                                            href={(santri as any).kkFileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-600 text-xs font-medium hover:bg-teal-100 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Lihat
                                        </a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-slate-400">Tidak ada file KK</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ Photo Viewer Modal ═══ */}
            {showPhotoModal && displayPhoto && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setShowPhotoModal(false)}>
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
                    <div className="relative z-10 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">Foto Alumni</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{santri.fullName} — NIS: {santri.nis}</p>
                                </div>
                                <button
                                    onClick={() => setShowPhotoModal(false)}
                                    className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-4 bg-slate-50">
                                <Image
                                    src={displayPhoto}
                                    alt={santri.fullName}
                                    width={600}
                                    height={800}
                                    className="w-full rounded-xl object-contain max-h-[65vh] mx-auto"
                                />
                            </div>
                            <div className="flex justify-end px-5 py-3.5 border-t border-slate-100 bg-white">
                                <button
                                    onClick={() => setShowPhotoModal(false)}
                                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-md shadow-teal-500/20"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* KK View Modal */}
            {showKkModal && (santri as any).kkFileUrl && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4"
                    onClick={() => setShowKkModal(false)}
                >
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700">File Kartu Keluarga (KK)</h3>
                            <button
                                onClick={() => setShowKkModal(false)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 flex items-center justify-center">
                            {((santri as any).kkFileUrl as string).startsWith('data:image') ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={(santri as any).kkFileUrl}
                                    alt="Kartu Keluarga"
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                                />
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <p className="text-sm">File ini bukan gambar.</p>
                                    <a
                                        href={(santri as any).kkFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
                                    >
                                        Download File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ═══ Reactivate Confirmation Modal ═══ */}
            {showReactivateConfirm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReactivateConfirm(false)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-800">Aktifkan Kembali?</h3>
                            <p className="text-sm text-slate-500 mt-1">Santri <strong>&quot;{santri.fullName}&quot;</strong> akan dipindahkan dari arsip dan diaktifkan kembali.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowReactivateConfirm(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setShowReactivateConfirm(false)
                                    reactivateMut.mutate(santri.id)
                                }}
                                disabled={reactivateMut.isPending}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-md shadow-teal-500/20 disabled:opacity-50"
                            >
                                {reactivateMut.isPending ? 'Mengaktifkan...' : 'Ya, Aktifkan'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ═══ Delete Confirmation Modal ═══ */}
            {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-800">Hapus Permanen?</h3>
                            <p className="text-sm text-slate-500 mt-1">Data alumni <strong>&quot;{santri.fullName}&quot;</strong> akan dihapus secara permanen. Aksi ini tidak bisa dibatalkan.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false)
                                    deleteMut.mutate(santri.id)
                                }}
                                disabled={deleteMut.isPending}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-all shadow-md shadow-red-500/20 disabled:opacity-50"
                            >
                                {deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div>
            <dt className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</dt>
            <dd className={`mt-1 text-sm font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>
                {value || <span className="text-slate-300 font-normal italic">Belum diisi</span>}
            </dd>
        </div>
    )
}

