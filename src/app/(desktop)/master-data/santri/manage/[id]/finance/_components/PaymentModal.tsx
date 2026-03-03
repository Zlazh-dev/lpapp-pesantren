'use client'

import { useState } from 'react'
import { trpc } from '@/utils/trpc'

type PaymentMethod = 'CASH' | 'TRANSFER'

interface Props {
    invoice: {
        id: string
        totalAmount: number
        billingModel?: { name: string } | null
        payments?: any[]
    }
    fmtRp: (n: number) => string
    onClose: () => void
    onSuccess: () => void
}

export default function PaymentModal({ invoice, fmtRp, onClose, onSuccess }: Props) {
    const [method, setMethod] = useState<PaymentMethod | null>(null)
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [proofFile, setProofFile] = useState<File | null>(null)
    const [proofPreview, setProofPreview] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [uploading, setUploading] = useState(false)

    const payMut = trpc.payment.create.useMutation({
        onSuccess: () => onSuccess(),
        onError: (e) => setError(e.message),
    })

    const paidAmount = invoice.payments
        ?.filter((p: any) => p.verifiedAt)
        ?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) ?? 0
    const remaining = invoice.totalAmount - paidAmount
    const modelName = invoice.billingModel?.name ?? 'Tagihan'

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setProofFile(file)
        const reader = new FileReader()
        reader.onload = () => setProofPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handlePay = async () => {
        if (!method || !amount) return
        const nominal = parseFloat(amount)
        if (!nominal || nominal <= 0) { setError('Nominal harus lebih dari 0'); return }
        if (nominal > remaining) { setError(`Nominal melebihi sisa tagihan (${fmtRp(remaining)})`); return }

        setError('')

        if (method === 'TRANSFER' && proofFile) {
            // Upload proof image first
            setUploading(true)
            try {
                const formData = new FormData()
                formData.append('file', proofFile)
                formData.append('folder', 'payment-proofs')

                const res = await fetch('/api/upload', { method: 'POST', body: formData })
                if (!res.ok) throw new Error('Gagal upload bukti pembayaran')
                const { url, publicId } = await res.json()

                payMut.mutate({
                    invoiceId: invoice.id,
                    amount: nominal,
                    method: 'TRANSFER',
                    proofUrl: url,
                    proofPublicId: publicId,
                    note: note || undefined,
                })
            } catch (e: any) {
                setError(e.message || 'Gagal upload')
            } finally {
                setUploading(false)
            }
        } else {
            payMut.mutate({
                invoiceId: invoice.id,
                amount: nominal,
                method,
                note: note || undefined,
            })
        }
    }

    const isSubmitting = payMut.isPending || uploading

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Pembayaran</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            {modelName} — Sisa: <span className="font-semibold text-slate-600">{fmtRp(remaining)}</span>
                        </p>
                    </div>

                    <div className="p-6 space-y-5">
                        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

                        {/* Step 1: Method Selection */}
                        {!method && (
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-3 block">Pilih Metode Pembayaran</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setMethod('CASH')}
                                        className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-100 hover:border-teal-300 hover:bg-teal-50/30 transition-all group">
                                        <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">Cash</span>
                                        <span className="text-[11px] text-slate-400">Langsung terverifikasi</span>
                                    </button>
                                    <button onClick={() => setMethod('TRANSFER')}
                                        className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                                        <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">Transfer</span>
                                        <span className="text-[11px] text-slate-400">Upload bukti transfer</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Payment Form */}
                        {method && (
                            <>
                                {/* Method indicator */}
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setMethod(null)}
                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${method === 'CASH' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                        }`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {method === 'CASH'
                                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            }
                                        </svg>
                                        {method === 'CASH' ? 'Pembayaran Cash' : 'Pembayaran Transfer'}
                                    </div>
                                </div>

                                {/* Nominal */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Nominal Pembayaran</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">Rp</span>
                                        <input
                                            type="number" value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            placeholder="0"
                                            min={1} max={remaining}
                                            className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 font-semibold text-slate-800"
                                        />
                                    </div>
                                    <button onClick={() => setAmount(String(remaining))}
                                        className="mt-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
                                        Bayar penuh: {fmtRp(remaining)}
                                    </button>
                                </div>

                                {/* Transfer: Upload Proof */}
                                {method === 'TRANSFER' && (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
                                            Bukti Transfer <span className="text-slate-300 normal-case">(opsional)</span>
                                        </label>
                                        {proofPreview ? (
                                            <div className="relative rounded-xl border border-slate-200 overflow-hidden">
                                                <img src={proofPreview} alt="Bukti transfer" className="w-full max-h-48 object-contain bg-slate-50" />
                                                <button onClick={() => { setProofFile(null); setProofPreview(null) }}
                                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 border border-slate-200 text-slate-400 hover:text-red-500 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer transition-all">
                                                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-sm text-slate-400">Klik untuk upload gambar bukti transfer</span>
                                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                )}

                                {/* Note */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
                                        Deskripsi <span className="text-slate-300 normal-case">(opsional)</span>
                                    </label>
                                    <textarea
                                        value={note} onChange={e => setNote(e.target.value)}
                                        placeholder="Catatan pembayaran..."
                                        rows={2}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 resize-none"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <button onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition-all">
                            Batal
                        </button>
                        {method && (
                            <button
                                onClick={handlePay}
                                disabled={isSubmitting || !amount}
                                className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 shadow-md ${method === 'CASH'
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/20'
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-500/20'
                                    }`}
                            >
                                {isSubmitting ? 'Memproses...' : method === 'CASH' ? 'Bayar Cash' : 'Kirim Pembayaran'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
