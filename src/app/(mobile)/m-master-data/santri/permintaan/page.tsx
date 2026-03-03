'use client'

import { useState } from 'react'
import { trpc } from '@/utils/trpc'

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
}
const STATUS_LABELS: Record<string, string> = { PENDING: 'Menunggu', APPROVED: 'Disetujui', REJECTED: 'Ditolak' }
const TYPE_LABELS: Record<string, string> = { EDIT: 'Edit Data', DELETE: 'Hapus Data', OTHER: 'Lainnya' }
const TYPE_COLORS: Record<string, string> = {
    EDIT: 'bg-blue-50 text-blue-700 border-blue-200',
    DELETE: 'bg-red-50 text-red-600 border-red-200',
    OTHER: 'bg-slate-50 text-slate-600 border-slate-200',
}

export default function MobilePermintaanPage() {
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | undefined>(undefined)
    const [page, setPage] = useState(1)
    const [reviewingId, setReviewingId] = useState<string | null>(null)
    const [reviewNote, setReviewNote] = useState('')

    const { data, isLoading, refetch } = trpc.santriRequest.listAll.useQuery({ status: statusFilter, page, limit: 20 })
    const reviewMut = trpc.santriRequest.review.useMutation({ onSuccess: () => refetch() })

    const tabs = [
        { key: undefined, label: 'Semua' },
        { key: 'PENDING' as const, label: 'Menunggu' },
        { key: 'APPROVED' as const, label: 'Disetujui' },
        { key: 'REJECTED' as const, label: 'Ditolak' },
    ]

    return (
        <div className="space-y-4 animate-fade-in">
            <div>
                <h2 className="text-xl font-bold text-slate-800">Permintaan Perubahan</h2>
                <p className="text-xs text-slate-400 mt-0.5">Kelola permintaan dari Perbendaharaan & Madrasah</p>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {tabs.map(tab => (
                    <button key={tab.label} onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                        className={`h-8 px-3 rounded-lg text-xs font-medium border whitespace-nowrap transition-all flex-shrink-0 ${statusFilter === tab.key
                            ? 'border-teal-300 bg-teal-50 text-teal-700'
                            : 'border-slate-200 bg-white text-slate-500'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
                </div>
            )}

            {/* Empty */}
            {!isLoading && data?.data.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
                    <p className="text-sm text-slate-400">Tidak ada permintaan</p>
                </div>
            )}

            {/* List */}
            {data && data.data.length > 0 && (
                <div className="space-y-3">
                    {data.data.map((req: any) => (
                        <div key={req.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            <div className="p-4 space-y-3">
                                {/* Badges */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-slate-800">{req.santri?.fullName ?? '—'}</span>
                                    <span className="text-xs text-slate-400 font-mono">{req.santri?.nis}</span>
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[req.type] ?? ''}`}>{TYPE_LABELS[req.type] ?? req.type}</span>
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[req.status] ?? ''}`}>{STATUS_LABELS[req.status] ?? req.status}</span>
                                </div>

                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{req.description}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-slate-400">{req.requesterName}</span>
                                    <span className="text-[11px] text-slate-400">
                                        {new Date(req.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>

                                {req.reviewNote && (
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <p className="text-xs text-slate-400 mb-0.5">Catatan:</p>
                                        <p className="text-sm text-slate-600">{req.reviewNote}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                {req.status === 'PENDING' && (
                                    reviewingId === req.id ? (
                                        <div className="space-y-2">
                                            <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                                                placeholder="Catatan (opsional)..." rows={2}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none" />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { reviewMut.mutate({ id: req.id, action: 'APPROVE', reviewNote: reviewNote || undefined }); setReviewingId(null); setReviewNote('') }}
                                                    disabled={reviewMut.isPending}
                                                    className="flex-1 h-10 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50">✓ Setujui</button>
                                                <button
                                                    onClick={() => { reviewMut.mutate({ id: req.id, action: 'REJECT', reviewNote: reviewNote || undefined }); setReviewingId(null); setReviewNote('') }}
                                                    disabled={reviewMut.isPending}
                                                    className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50">✕ Tolak</button>
                                                <button onClick={() => { setReviewingId(null); setReviewNote('') }}
                                                    className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-500">Batal</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => setReviewingId(req.id)}
                                            className="h-10 px-4 rounded-xl border border-teal-200 bg-teal-50 text-sm font-medium text-teal-700 w-full">
                                            Tinjau Request
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                        className="h-8 px-3 rounded-lg border border-slate-200 text-sm text-slate-500 disabled:opacity-40">←</button>
                    <span className="text-sm text-slate-500">{page} / {data.totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                        className="h-8 px-3 rounded-lg border border-slate-200 text-sm text-slate-500 disabled:opacity-40">→</button>
                </div>
            )}
        </div>
    )
}
