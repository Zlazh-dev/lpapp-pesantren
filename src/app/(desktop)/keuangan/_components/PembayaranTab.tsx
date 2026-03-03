'use client'

import { useState } from 'react'
import { trpc } from '@/utils/trpc'
import { formatDate, formatRupiah } from '@/utils/format'
import { formatBillingPeriod } from '@/lib/billing/period'
import PaymentProofButton from '@/components/payments/PaymentProofButton'

export default function PembayaranTab() {
    const utils = trpc.useUtils()
    const [proofFilters, setProofFilters] = useState({ status: 'PENDING', page: 1 })

    const { data: proofData, isLoading, error } = trpc.billing.listPaymentProofs.useQuery({
        status: proofFilters.status as 'PENDING' | 'APPROVED' | 'REJECTED',
        page: proofFilters.page,
        limit: 20,
    })

    const verifyProof = trpc.billing.verifyPaymentProof.useMutation({
        onSuccess: async () => {
            await Promise.all([
                utils.billing.listPaymentProofs.invalidate(),
                utils.payment.listRecent.invalidate(),
                utils.invoice.list.invalidate(),
            ])
        },
    })

    if (isLoading) {
        return <p className="mt-4 text-sm text-slate-500">Memuat bukti pembayaran...</p>
    }

    if (error) {
        return <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error.message}</p>
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">Validasi Pembayaran Transfer</h2>
                <p className="mt-1 text-sm text-slate-500">Daftar bukti transfer yang menunggu verifikasi.</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
                    <select
                        value={proofFilters.status}
                        onChange={(event) => setProofFilters((state) => ({ ...state, status: event.target.value, page: 1 }))}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                        <option value="PENDING">Menunggu Verifikasi</option>
                        <option value="APPROVED">Disetujui</option>
                        <option value="REJECTED">Ditolak</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50">
                                {['Santri', 'Invoice', 'Nominal Bukti', 'Bukti', 'Dikirim', 'Status', 'Aksi'].map((header) => (
                                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {proofData?.data?.map((proof: any) => (
                                <tr key={proof.id} className="hover:bg-slate-50/80">
                                    <td className="px-4 py-3 text-sm">
                                        <span className="font-medium">{proof.invoice?.santri?.fullName}</span>
                                        <span className="ml-1 font-mono text-xs text-slate-400">({proof.invoice?.santri?.nis})</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div>{proof.invoice?.billingModel?.name ?? '-'}</div>
                                        <div className="text-xs text-slate-500">{proof.invoice ? formatBillingPeriod(proof.invoice) : '-'}</div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm">{formatRupiah(proof.amount)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <PaymentProofButton
                                            source="paymentProof"
                                            id={proof.id}
                                            label="Lihat Bukti"
                                            className="font-medium text-blue-600 hover:underline"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(proof.createdAt)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${proof.status === 'PENDING' ? 'bg-sky-50 text-sky-700' : proof.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                            {proof.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {proof.status === 'PENDING' ? (
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => verifyProof.mutate({ proofId: proof.id, action: 'APPROVE' })}
                                                    disabled={verifyProof.isPending}
                                                    className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => verifyProof.mutate({ proofId: proof.id, action: 'REJECT' })}
                                                    disabled={verifyProof.isPending}
                                                    className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!proofData?.data?.length && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">Tidak ada bukti pembayaran.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {proofData && proofData.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                        <span className="text-xs text-slate-500">Halaman {proofData.page} dari {proofData.totalPages} ({proofData.total} data)</span>
                        <div className="flex gap-1">
                            <button
                                disabled={proofData.page <= 1}
                                onClick={() => setProofFilters(s => ({ ...s, page: s.page - 1 }))}
                                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            >
                                Sebelumnya
                            </button>
                            <button
                                disabled={proofData.page >= proofData.totalPages}
                                onClick={() => setProofFilters(s => ({ ...s, page: s.page + 1 }))}
                                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            >
                                Selanjutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
