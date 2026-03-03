'use client'

import { useState, useRef, use } from 'react'
import { trpc } from '@/utils/trpc'
import { formatRupiah } from '@/utils/format'
import { Icon } from '@/components/icons'

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PARTIAL: 'bg-blue-50 text-blue-700 border-blue-200',
}

export default function UploadProofPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params)
    const { data, isLoading, error } = trpc.link.getByToken.useQuery(token)
    const uploadMut = trpc.paymentProof.uploadViaLink.useMutation({
        onSuccess: () => {
            setUploadBillId(null)
            setSuccess(true)
            setTimeout(() => setSuccess(false), 5000)
        },
    })

    const [uploadBillId, setUploadBillId] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [success, setSuccess] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const handleUpload = async () => {
        const file = fileRef.current?.files?.[0]
        if (!file || !uploadBillId) return
        setUploading(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('token', token)
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            if (!res.ok) throw new Error('Gagal upload')
            const { url } = await res.json()
            uploadMut.mutate({ token, billId: uploadBillId, imageUrl: url })
        } catch {
            alert('Gagal upload gambar')
        } finally {
            setUploading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
                <div className="w-8 h-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                        <Icon name="inactive" size={32} className="text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 mb-2">Link Tidak Valid</h1>
                    <p className="text-slate-500">{error.message}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                            <Icon name="money" size={32} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Upload Bukti Pembayaran</h1>
                            <p className="text-slate-500">
                                Santri: <span className="font-medium text-slate-700">{data?.santri.fullName}</span> ({data?.santri.nis})
                            </p>
                        </div>
                    </div>
                </div>

                {success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 mb-6 flex items-center gap-3 animate-fade-in">
                        <Icon name="active" size={22} className="text-emerald-600" />
                        <div>
                            <p className="font-semibold">Bukti berhasil dikirim!</p>
                            <p className="text-sm">Menunggu verifikasi oleh bendahara pesantren.</p>
                        </div>
                    </div>
                )}

                {uploadBillId && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setUploadBillId(null)}>
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Kirim Bukti Pembayaran</h2>
                            <p className="text-sm text-slate-500 mb-4">Upload foto bukti transfer atau kuitansi pembayaran.</p>
                            <input ref={fileRef} type="file" accept="image/*" className="w-full mb-4" />
                            {uploadMut.error && <p className="text-red-500 text-sm mb-3">{uploadMut.error.message}</p>}
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setUploadBillId(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium">
                                    Batal
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading || uploadMut.isPending}
                                    className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                                >
                                    {uploading || uploadMut.isPending ? 'Mengirim...' : (
                                        <>
                                            <Icon name="upload" size={16} className="text-white" />
                                            Kirim Bukti
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {data?.bills.map((bill) => {
                        const latestProofLabel = bill.latestProofStatus === 'PENDING'
                            ? 'Menunggu'
                            : bill.latestProofStatus === 'APPROVED' || bill.latestProofStatus === 'VERIFIED'
                                ? 'Terverifikasi'
                                : 'Ditolak'

                        return (
                            <div key={bill.id} className={`bg-white rounded-xl border ${STATUS_COLORS[bill.status]?.includes('emerald') ? 'border-emerald-200' : 'border-slate-200'} p-4 shadow-sm`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <span className="font-medium text-slate-800">{bill.billingModel ?? bill.type}</span>
                                        {bill.period && <span className="text-slate-400 text-sm ml-2">- {bill.period}</span>}
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[bill.status]}`}>
                                        {bill.status === 'PAID' ? 'Lunas' : bill.status === 'PARTIAL' ? 'Cicilan' : 'Belum Lunas'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-lg font-bold text-slate-800">{formatRupiah(bill.amount)}</div>
                                        {bill.paidAmount > 0 && <div className="text-sm text-emerald-600">Terbayar: {formatRupiah(bill.paidAmount)}</div>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {bill.latestProofStatus && (
                                            <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-500 inline-flex items-center gap-1">
                                                <Icon name={bill.latestProofStatus === 'APPROVED' || bill.latestProofStatus === 'VERIFIED' ? 'active' : bill.latestProofStatus === 'REJECTED' ? 'inactive' : 'warning'} size={12} className="text-current" />
                                                {latestProofLabel}
                                            </span>
                                        )}
                                        {bill.status !== 'PAID' && (
                                            <button
                                                onClick={() => setUploadBillId(bill.id)}
                                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-teal-500/20 inline-flex items-center gap-1.5"
                                            >
                                                <Icon name="upload" size={14} className="text-white" />
                                                Kirim Bukti
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {data?.bills.length === 0 && (
                        <div className="bg-white rounded-xl p-8 text-center text-slate-400">
                            <p>Tidak ada tagihan aktif</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
