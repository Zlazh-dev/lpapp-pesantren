'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import { formatDate } from '@/utils/format'

export default function MobileArsipSantriPage() {
    const router = useRouter()
    const utils = trpc.useUtils()
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [page, setPage] = useState(1)
    const [confirmSantri, setConfirmSantri] = useState<any>(null)

    const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null)
    const handleSearch = useCallback((value: string) => {
        setSearch(value)
        if (debounceRef[0]) clearTimeout(debounceRef[0])
        debounceRef[0] = setTimeout(() => { setDebouncedSearch(value); setPage(1) }, 300)
    }, [debounceRef])

    const listQuery = trpc.santri.listArchived.useQuery({ search: debouncedSearch || undefined, page, limit: 15 })
    const reactivateMut = trpc.santri.reactivate.useMutation({
        onSuccess: () => {
            utils.santri.listArchived.invalidate()
            utils.santri.listCentralized.invalidate()
            setConfirmSantri(null)
        },
    })

    const { data, isLoading, error } = listQuery

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Arsip Santri</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Santri nonaktif / boyong</p>
                </div>
                <Link href="/m-master-data/santri/manage"
                    className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 transition-all shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Aktif
                </Link>
            </div>

            {/* Search */}
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input value={search} onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Cari nama atau NIS..."
                    className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
            </div>

            {/* Count */}
            {data && <p className="text-[11px] text-slate-400 text-right">{data.total} santri diarsipkan</p>}

            {/* List */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {error ? (
                    <div className="py-10 text-center"><p className="text-sm text-red-500">{error.message}</p></div>
                ) : isLoading ? (
                    <div className="divide-y divide-slate-50">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 animate-pulse bg-slate-50/50" />)}
                    </div>
                ) : !data?.data.length ? (
                    <div className="py-16 text-center">
                        <p className="text-sm text-slate-400">{search ? 'Tidak ditemukan' : 'Tidak ada santri diarsipkan'}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {data.data.map((s: any) => (
                            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                    {s.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0" onClick={() => router.push(`/m-master-data/santri/arsip/${s.id}`)}>
                                    <p className="text-sm font-semibold text-slate-800 truncate">{s.fullName}</p>
                                    <p className="text-xs text-slate-400 font-mono">{s.nis}</p>
                                    {s.deactivatedAt && (
                                        <p className="text-[10px] text-slate-300 mt-0.5">{formatDate(s.deactivatedAt)}</p>
                                    )}
                                </div>
                                <button onClick={() => setConfirmSantri(s)}
                                    className="h-8 px-3 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-xs font-medium hover:bg-teal-100 transition-colors shrink-0">
                                    Aktifkan
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-50 bg-slate-50/30">
                        <span className="text-[11px] text-slate-400">Hal {page}/{data.totalPages}</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs disabled:opacity-30">←</button>
                            <span className="h-8 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center">{page}</span>
                            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs disabled:opacity-30">→</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm reactivate modal */}
            {confirmSantri && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setConfirmSantri(null)}>
                    <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 pb-8 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto" />
                        <div className="text-center space-y-1">
                            <h3 className="text-base font-bold text-slate-800">Aktifkan Kembali?</h3>
                            <p className="text-sm text-slate-500">
                                <strong>"{confirmSantri.fullName}"</strong> akan dipindahkan dari arsip dan diaktifkan.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmSantri(null)}
                                className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Batal</button>
                            <button onClick={() => reactivateMut.mutate(confirmSantri.id)} disabled={reactivateMut.isPending}
                                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-sm font-semibold text-white shadow-md disabled:opacity-50">
                                {reactivateMut.isPending ? 'Mengaktifkan...' : 'Ya, Aktifkan'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
