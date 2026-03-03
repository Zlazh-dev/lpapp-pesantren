'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'

export default function KeuanganSantriRequestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { data: santri } = trpc.santri.getById.useQuery(id)
    const { data: requests, refetch } = trpc.santriRequest.listBySantri.useQuery({ santriId: id })

    const [type, setType] = useState<'EDIT' | 'DELETE' | 'OTHER'>('EDIT')
    const [description, setDescription] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const createMut = trpc.santriRequest.create.useMutation({
        onSuccess: () => {
            setSubmitted(true)
            setDescription('')
            refetch()
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (description.length < 10) return
        createMut.mutate({ santriId: id, type, description })
    }

    const statusColors: Record<string, string> = {
        PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
        APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        REJECTED: 'bg-red-50 text-red-700 border-red-200',
    }
    const statusLabels: Record<string, string> = {
        PENDING: 'Menunggu',
        APPROVED: 'Disetujui',
        REJECTED: 'Ditolak',
    }
    const typeLabels: Record<string, string> = {
        EDIT: 'Edit Data',
        DELETE: 'Hapus Data',
        OTHER: 'Lainnya',
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href={`/keuangan/santri/${id}`} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:shadow-sm transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Request Perubahan Data</h1>
                    {santri && <p className="text-sm text-slate-400 mt-0.5">{santri.fullName} — {santri.nis}</p>}
                </div>
            </div>

            {/* Form */}
            {submitted ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-emerald-800">Request Terkirim!</h2>
                    <p className="text-sm text-emerald-600 mt-1">Admin/Staf Pendataan akan meninjau permintaan Anda.</p>
                    <div className="flex justify-center gap-3 mt-5">
                        <button onClick={() => setSubmitted(false)} className="px-4 py-2 rounded-xl border border-emerald-300 bg-white text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-all">
                            Kirim Request Lain
                        </button>
                        <Link href={`/keuangan/santri/${id}`} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-all">
                            ← Kembali ke Detail
                        </Link>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Jenis Request</label>
                        <div className="flex gap-2">
                            {(['EDIT', 'DELETE', 'OTHER'] as const).map((t) => (
                                <button key={t} type="button" onClick={() => setType(t)}
                                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${type === t
                                        ? 'border-teal-300 bg-teal-50 text-teal-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}>
                                    {typeLabels[t]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi Perubahan</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                            placeholder={type === 'EDIT' ? 'Jelaskan data apa yang perlu diubah dan nilai yang benar...' : type === 'DELETE' ? 'Jelaskan alasan penghapusan data santri ini...' : 'Jelaskan permintaan Anda...'}
                            rows={5}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all resize-none" />
                        <p className="text-xs text-slate-400 mt-1">{description.length}/2000 karakter (minimal 10)</p>
                    </div>

                    <button type="submit" disabled={description.length < 10 || createMut.isPending}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
                        {createMut.isPending ? 'Mengirim...' : 'Kirim Request'}
                    </button>

                    {createMut.error && (
                        <p className="text-sm text-red-500 text-center">{createMut.error.message}</p>
                    )}
                </form>
            )}

            {/* History */}
            {requests && requests.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800">Riwayat Request</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {requests.map((req: any) => (
                            <div key={req.id} className="px-6 py-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs font-semibold text-slate-600">{typeLabels[req.type] ?? req.type}</span>
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColors[req.status] ?? ''}`}>
                                        {statusLabels[req.status] ?? req.status}
                                    </span>
                                    <span className="text-[11px] text-slate-400 ml-auto">{new Date(req.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-2">{req.description}</p>
                                {req.reviewNote && (
                                    <p className="text-xs text-slate-400 mt-1 italic">Catatan: {req.reviewNote}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
