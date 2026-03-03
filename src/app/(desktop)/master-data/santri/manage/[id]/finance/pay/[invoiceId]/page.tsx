'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'

type PaymentMethod = 'CASH' | 'TRANSFER'

export default function PaymentPage({ params }: { params: Promise<{ id: string; invoiceId: string }> }) {
    const { id: santriId, invoiceId } = use(params)
    const router = useRouter()

    const [method, setMethod] = useState<PaymentMethod | null>(null)
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [proofFile, setProofFile] = useState<File | null>(null)
    const [proofPreview, setProofPreview] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [uploading, setUploading] = useState(false)
    const [success, setSuccess] = useState(false)

    const { data: invoice, isLoading } = trpc.invoice.getDetail.useQuery(invoiceId)
    const { data: santri } = trpc.santri.getById.useQuery(santriId)

    const payMut = trpc.payment.create.useMutation({
        onSuccess: () => setSuccess(true),
        onError: (e) => setError(e.message),
    })

    const fmtRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

    const paidAmount = invoice?.payments
        ?.filter((p: any) => p.verifiedAt)
        ?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) ?? 0
    const remaining = (invoice?.totalAmount ?? 0) - paidAmount
    const modelName = invoice?.billingModel?.name ?? 'Tagihan'

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
            setUploading(true)
            try {
                const formData = new FormData()
                formData.append('file', proofFile)
                formData.append('folder', 'payment-proofs')
                const res = await fetch('/api/upload', { method: 'POST', body: formData })
                if (!res.ok) throw new Error('Gagal upload bukti pembayaran')
                const { url, publicId } = await res.json()
                payMut.mutate({ invoiceId, amount: nominal, method: 'TRANSFER', proofUrl: url, proofPublicId: publicId, note: note || undefined })
            } catch (e: any) {
                setError(e.message || 'Gagal upload')
            } finally {
                setUploading(false)
            }
        } else {
            payMut.mutate({ invoiceId, amount: nominal, method, note: note || undefined })
        }
    }

    const isSubmitting = payMut.isPending || uploading

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse w-60" />
                <div className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
                <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            </div>
        )
    }

    if (!invoice) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <p className="text-lg font-medium text-slate-500">Invoice tidak ditemukan</p>
                <Link href={`/master-data/santri/manage/${santriId}/finance`}
                    className="mt-4 inline-flex px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Kembali
                </Link>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="max-w-2xl mx-auto animate-fade-in">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                        <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Pembayaran Berhasil!</h2>
                    <p className="text-sm text-slate-500">
                        {method === 'CASH'
                            ? 'Pembayaran cash telah tercatat dan terverifikasi.'
                            : 'Pembayaran transfer telah tercatat. Menunggu verifikasi Staf Bendahara.'}
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-4">
                        <Link href={`/master-data/santri/manage/${santriId}/finance`}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold shadow-md shadow-teal-500/20 hover:opacity-90 transition-all">
                            Kembali ke Finance
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href={`/master-data/santri/manage/${santriId}/finance`}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:shadow-sm transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Halaman Pembayaran</h1>
                    <p className="text-sm text-slate-400">{santri?.fullName ?? ''} — {modelName}</p>
                </div>
            </div>

            {/* Invoice Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Total Tagihan</p>
                        <p className="text-lg font-bold text-slate-800 mt-1">{fmtRp(invoice.totalAmount)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-emerald-500 uppercase">Terbayar</p>
                        <p className="text-lg font-bold text-emerald-700 mt-1">{fmtRp(paidAmount)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-red-500 uppercase">Sisa</p>
                        <p className="text-lg font-bold text-red-700 mt-1">{fmtRp(remaining)}</p>
                    </div>
                </div>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${paidAmount >= invoice.totalAmount ? 'bg-emerald-500' : paidAmount > 0 ? 'bg-amber-400' : 'bg-slate-200'}`}
                        style={{ width: `${invoice.totalAmount > 0 ? Math.min(Math.round((paidAmount / invoice.totalAmount) * 100), 100) : 0}%` }}
                    />
                </div>
                {/* Invoice items */}
                {invoice.items && invoice.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Rincian</p>
                        <div className="space-y-1.5">
                            {invoice.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">{item.label}</span>
                                    <span className="font-medium text-slate-700">{fmtRp(item.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

            {/* Step 1: Choose Method */}
            {!method && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h2 className="text-base font-bold text-slate-800">Pilih Metode Pembayaran</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setMethod('CASH')}
                            className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <span className="text-base font-bold text-slate-800 block">Cash</span>
                                <span className="text-xs text-slate-400">Langsung terverifikasi</span>
                            </div>
                        </button>
                        <button onClick={() => setMethod('TRANSFER')}
                            className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-slate-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <span className="text-base font-bold text-slate-800 block">Transfer</span>
                                <span className="text-xs text-slate-400">Upload bukti transfer</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Payment Form */}
            {method && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                    {/* Method header */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => setMethod(null)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${method === 'CASH' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
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
                        <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Nominal Pembayaran</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold">Rp</span>
                            <input
                                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                                placeholder="0" min={1} max={remaining}
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 text-base bg-slate-50 font-bold text-slate-800 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                            />
                        </div>
                        <button onClick={() => setAmount(String(remaining))}
                            className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            Bayar penuh: {fmtRp(remaining)}
                        </button>
                    </div>

                    {/* Transfer: Upload Proof */}
                    {method === 'TRANSFER' && (
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">
                                Bukti Transfer <span className="text-slate-300 normal-case font-normal">(opsional)</span>
                            </label>
                            {proofPreview ? (
                                <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                                    <img src={proofPreview} alt="Bukti transfer" className="w-full max-h-56 object-contain" />
                                    <button onClick={() => { setProofFile(null); setProofPreview(null) }}
                                        className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 border border-slate-200 text-slate-400 hover:text-red-500 shadow-sm transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center gap-3 py-8 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer transition-all">
                                    <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">
                            Deskripsi <span className="text-slate-300 normal-case font-normal">(opsional)</span>
                        </label>
                        <textarea
                            value={note} onChange={e => setNote(e.target.value)}
                            placeholder="Catatan pembayaran..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 resize-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                        <Link href={`/master-data/santri/manage/${santriId}/finance`}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                            Batal
                        </Link>
                        <button
                            onClick={handlePay}
                            disabled={isSubmitting || !amount}
                            className={`flex-1 px-5 py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2 ${method === 'CASH'
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-500/25'
                                }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Memproses...
                                </>
                            ) : method === 'CASH' ? 'Bayar Cash' : 'Kirim Pembayaran'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
