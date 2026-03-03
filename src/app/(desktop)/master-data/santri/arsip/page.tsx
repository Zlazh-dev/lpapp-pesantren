'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import { formatDate } from '@/utils/format'

export default function ArsipSantriPage() {
    const router = useRouter()
    const utils = trpc.useUtils()
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [page, setPage] = useState(1)
    const [confirmSantri, setConfirmSantri] = useState<any>(null)

    const LIMIT = 20
    const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null)
    const handleSearch = useCallback((value: string) => {
        setSearch(value)
        if (debounceRef[0]) clearTimeout(debounceRef[0])
        debounceRef[0] = setTimeout(() => { setDebouncedSearch(value); setPage(1) }, 300)
    }, [debounceRef])

    const listQuery = trpc.santri.listArchived.useQuery({
        search: debouncedSearch || undefined,
        page,
        limit: LIMIT,
    })

    const reactivateMut = trpc.santri.reactivate.useMutation({
        onSuccess: () => {
            utils.santri.listArchived.invalidate()
            utils.santri.listCentralized.invalidate()
            setConfirmSantri(null)
        },
    })

    const { data, isLoading, error } = listQuery
    const startIndex = (page - 1) * LIMIT

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            {/* ── Header ── */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">Arsip Santri</h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {data ? `${data.total} santri nonaktif / boyong` : 'Memuat...'}
                        </p>
                    </div>
                    <Link
                        href="/master-data/santri/manage"
                        className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs font-medium flex items-center gap-1.5 transition"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Santri Aktif
                    </Link>
                </div>
            </div>

            {/* ── Search Bar ── */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Cari nama atau NIS..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                </div>
            </div>

            {/* ── Table ── */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-10">No</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">NIS</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tanggal Masuk</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tanggal Keluar</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {error ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center">
                                <p className="text-xs text-red-600 font-medium">Gagal memuat data</p>
                                <p className="text-xs text-red-400 mt-0.5">{error.message}</p>
                                <button onClick={() => listQuery.refetch()} className="mt-2 px-3 py-1.5 rounded border border-red-200 text-xs text-red-600 hover:bg-red-50 transition">Coba Lagi</button>
                            </td></tr>
                        ) : isLoading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : !data?.data.length ? (
                            <tr><td colSpan={6} className="px-4 py-16 text-center">
                                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                <p className="text-sm text-gray-400 font-medium">
                                    {search ? 'Tidak ada santri yang sesuai pencarian' : 'Tidak ada santri nonaktif'}
                                </p>
                            </td></tr>
                        ) : (
                            data.data.map((santri: any, idx: number) => (
                                <tr
                                    key={santri.id}
                                    onClick={() => router.push(`/master-data/santri/arsip/${santri.id}`)}
                                    className="hover:bg-gray-50 cursor-pointer transition group"
                                >
                                    <td className="px-4 py-2.5">
                                        <span className="text-[11px] text-gray-400">{startIndex + idx + 1}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-xs font-mono font-medium text-gray-700">{santri.nis}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <p className="text-xs font-semibold text-gray-900 group-hover:text-emerald-700 transition truncate max-w-[240px]">{santri.fullName}</p>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-xs text-gray-600">{santri.enrollmentDate ? formatDate(santri.enrollmentDate) : <span className="text-gray-300">—</span>}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-xs text-gray-600">{santri.deactivatedAt ? formatDate(santri.deactivatedAt) : <span className="text-gray-300">—</span>}</span>
                                    </td>
                                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => setConfirmSantri(santri)}
                                                className="px-2 py-1 rounded text-[10px] font-medium bg-teal-50 text-teal-600 hover:bg-teal-100 transition opacity-0 group-hover:opacity-100"
                                                title="Aktifkan Kembali"
                                            >
                                                Aktifkan
                                            </button>
                                            <button
                                                onClick={() => router.push(`/master-data/santri/arsip/${santri.id}`)}
                                                className="w-7 h-7 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 text-gray-500 rounded flex items-center justify-center transition"
                                                title="Lihat Detail"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Pagination ── */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                    {data ? `Menampilkan ${startIndex + 1}–${Math.min(startIndex + LIMIT, data.total)} dari ${data.total} data` : ''}
                </div>
                {data && data.totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                            className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs flex items-center gap-1 disabled:opacity-40 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Prev
                        </button>
                        <div className="flex gap-0.5">
                            {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                                .slice(Math.max(0, page - 3), Math.min(data.totalPages, page + 2))
                                .map((p) => (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={`w-7 h-7 rounded text-xs font-medium transition ${p === page ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                                        {p}
                                    </button>
                                ))}
                        </div>
                        <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                            className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs flex items-center gap-1 disabled:opacity-40 transition">
                            Next
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                )}
            </div>

            {/* ── Reactivate Confirmation Modal ── */}
            {confirmSantri && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmSantri(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">Aktifkan Kembali?</h3>
                            <p className="text-sm text-gray-500 mt-1">Santri <strong>&quot;{confirmSantri.fullName}&quot;</strong> akan dipindahkan dari arsip dan diaktifkan kembali.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setConfirmSantri(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button
                                onClick={() => reactivateMut.mutate(confirmSantri.id)}
                                disabled={reactivateMut.isPending}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-sm font-semibold text-white hover:opacity-90 transition shadow-md shadow-teal-500/20 disabled:opacity-50"
                            >
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
