'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'

type CardSantriProps = {
    santri: {
        id: string
        fullName: string
        nis: string
        photoUrl?: string | null
        classGroup?: {
            name: string
            grade?: { level?: { name: string } | null } | null
        } | null
        dormRoom?: { name: string } | null
    }
    canManage?: boolean
    onDelete?: (id: string) => void
    isDeleting?: boolean
}

export default function CardSantri({ santri, canManage, onDelete, isDeleting }: CardSantriProps) {
    const [showDelete, setShowDelete] = useState(false)
    const jenjang = santri.classGroup?.grade?.level?.name ?? ''
    const kelasName = santri.classGroup?.name ?? ''
    const kelas = jenjang && kelasName ? `${jenjang} ${kelasName}` : kelasName || jenjang || '-'
    const dr = (santri as any).dormRoom
    const gedung = dr?.floor?.building?.name ?? null
    const kamar = dr ? (gedung ? `${gedung} - ${dr.name}` : dr.name) : '-'
    const initial = santri.fullName.charAt(0).toUpperCase()

    // Check data completeness
    const s = santri as any
    const isComplete = !!(
        s.birthDate && s.birthPlace && s.phone &&
        s.fatherName && s.motherName &&
        s.classGroup && s.dormRoom
    )

    return (
        <div className={`group relative rounded-2xl border overflow-hidden hover:shadow-xl transition-all duration-300 ${isComplete
            ? 'bg-white border-slate-200 hover:shadow-slate-200/50 hover:border-teal-200'
            : 'bg-red-50/40 border-red-200 hover:shadow-red-200/40 hover:border-red-300'
            }`}>
            {/* Gradient header */}
            <div className={`h-14 relative ${isComplete
                ? 'bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-500'
                : 'bg-gradient-to-br from-red-400 via-red-500 to-rose-500'
                }`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent)]" />
                {!isComplete && (
                    <div className="absolute bottom-1.5 right-2 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-bold text-red-600 uppercase tracking-wide">
                        Data Belum Lengkap
                    </div>
                )}
            </div>

            {/* Avatar + Info */}
            <div className="px-5 pb-5 -mt-9 flex flex-col items-center text-center">
                <Link href={`/master-data/santri/manage/${santri.id}`} className="relative">
                    {santri.photoUrl ? (
                        <Image
                            src={santri.photoUrl}
                            alt={santri.fullName}
                            width={72}
                            height={72}
                            className="w-[72px] h-[72px] rounded-full object-cover border-4 border-white shadow-lg"
                        />
                    ) : (
                        <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                            {initial}
                        </div>
                    )}
                </Link>

                <Link href={`/master-data/santri/manage/${santri.id}`} className="mt-2.5 hover:text-teal-600 transition-colors">
                    <h3 className="font-bold text-slate-800 text-base leading-tight">{santri.fullName}</h3>
                </Link>
                <p className="text-slate-400 text-xs mt-0.5 font-mono">NIS: {santri.nis}</p>

                {/* Info grid — Kamar & Kelas */}
                <div className="w-full grid grid-cols-2 gap-1 mt-4 text-center">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Kamar</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">{kamar}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Kelas</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">{kelas}</p>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="w-full h-px bg-slate-100 my-4" />
                <div className="w-full flex gap-2">
                    <Link
                        href={`/master-data/santri/manage/${santri.id}`}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold text-center hover:opacity-90 transition-all shadow-md shadow-teal-500/20"
                    >
                        Lihat
                    </Link>
                    {canManage && onDelete && (
                        <button
                            onClick={() => setShowDelete(true)}
                            disabled={isDeleting}
                            className="px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-all text-sm font-medium disabled:opacity-50"
                        >
                            Hapus
                        </button>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDelete && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDelete(false)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-800">Hapus Santri?</h3>
                            <p className="text-sm text-slate-500 mt-1">Data santri <strong>&quot;{santri.fullName}&quot;</strong> akan dihapus. Aksi ini tidak bisa dibatalkan.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowDelete(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                            <button onClick={() => { setShowDelete(false); onDelete!(santri.id) }} disabled={isDeleting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-all shadow-md shadow-red-500/20 disabled:opacity-50">
                                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
