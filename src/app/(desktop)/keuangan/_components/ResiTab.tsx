'use client'

import { useState } from 'react'
import { trpc } from '@/utils/trpc'
import { formatDate, formatRupiah } from '@/utils/format'
import { formatBillingPeriod } from '@/lib/billing/period'
import { Icon } from '@/components/icons'
import ReceiptView from '@/components/receipt/ReceiptView'
import PaymentProofButton from '@/components/payments/PaymentProofButton'

type PaymentRow = {
    id: string
    amount: number
    method: 'CASH' | 'TRANSFER' | 'OTHER'
    paidAt: string | Date
    verifiedAt: string | Date | null
    receipt: { id: string; receiptNo: string; pdfUrl: string | null; generatedAt: string | Date } | null
    invoice: {
        id: string
        periodKey: string
        periodDisplayMode?: 'GREGORIAN' | 'HIJRI' | null
        periodYear?: number | null
        periodMonth?: number | null
        hijriYear?: number | null
        hijriMonth?: number | null
        hijriVariant?: string | null
        totalAmount: number
        status: 'PENDING' | 'PARTIAL' | 'PAID' | 'VOID'
        items: Array<{ label: string; amount: number }>
        santri: { fullName: string; nis: string }
        billingModel: { name: string }
    } | null
}

export default function ResiTab() {
    const utils = trpc.useUtils()
    const [payFilters, setPayFilters] = useState({ verified: undefined as boolean | undefined, page: 1 })
    const [receiptPayment, setReceiptPayment] = useState<PaymentRow | null>(null)

    const { data: paymentData, isLoading, error } = trpc.payment.listRecent.useQuery({
        verified: payFilters.verified,
        page: payFilters.page,
        limit: 20,
    })

    const verifyPayment = trpc.payment.verify.useMutation({
        onSuccess: async () => {
            await Promise.all([
                utils.payment.listRecent.invalidate(),
                utils.invoice.list.invalidate(),
            ])
        },
    })

    const generateReceipt = trpc.payment.generateReceipt.useMutation({
        onSuccess: async () => {
            await utils.payment.listRecent.invalidate()
        },
    })

    const handleReceipt = async (payment: PaymentRow) => {
        if (!payment.receipt) {
            await generateReceipt.mutateAsync(payment.id)
            await utils.payment.listRecent.invalidate()
        }
        setReceiptPayment(payment)
    }

    if (isLoading) {
        return <p className="mt-4 text-sm text-slate-500">Memuat data resi pembayaran...</p>
    }

    if (error) {
        return <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error.message}</p>
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">Resi</h2>
                <p className="mt-1 text-sm text-slate-500">Daftar pembayaran lunas dan bukti terverifikasi.</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
                    <select
                        value={payFilters.verified === undefined ? '' : payFilters.verified ? 'true' : 'false'}
                        onChange={(event) => setPayFilters((state) => ({
                            ...state,
                            verified: event.target.value === '' ? undefined : event.target.value === 'true',
                            page: 1,
                        }))}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                        <option value="">Semua</option>
                        <option value="false">Pending Verifikasi</option>
                        <option value="true">Sudah Diverifikasi</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50">
                                {['Santri', 'Invoice', 'Periode', 'Nominal', 'Metode', 'Tanggal', 'Status', 'Aksi'].map((header) => (
                                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paymentData?.data?.map((payment: any) => (
                                <tr key={payment.id} className="hover:bg-slate-50/80">
                                    <td className="px-4 py-3 text-sm">
                                        <span className="font-medium">{payment.invoice?.santri?.fullName}</span>
                                        <span className="ml-1 font-mono text-xs text-slate-400">({payment.invoice?.santri?.nis})</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{payment.invoice?.billingModel?.name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">
                                        {payment.invoice ? formatBillingPeriod(payment.invoice) : '-'}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm font-bold text-emerald-600">{formatRupiah(payment.amount)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${payment.method === 'CASH' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                            {payment.method}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(payment.paidAt)}</td>
                                    <td className="px-4 py-3">
                                        {payment.verifiedAt ? (
                                            <span className="text-xs font-medium text-emerald-600">Verified</span>
                                        ) : payment.proofUrl ? (
                                            <span className="text-xs font-medium text-amber-600">Pending</span>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            {!payment.verifiedAt && payment.proofUrl && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => verifyPayment.mutate({ paymentId: payment.id, verified: true })}
                                                        className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                                    >
                                                        Verify
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => verifyPayment.mutate({ paymentId: payment.id, verified: false })}
                                                        className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            <PaymentProofButton
                                                source="payment"
                                                id={payment.id}
                                                hasProof={Boolean(payment.proofUrl)}
                                                label="Bukti"
                                                hideWhenUnavailable
                                                className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleReceipt(payment as PaymentRow)}
                                                className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                                            >
                                                <Icon name="receipt" size={12} className="text-current" />
                                                Resi
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!paymentData?.data?.length && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">Tidak ada data pembayaran.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {paymentData && paymentData.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                        <span className="text-xs text-slate-500">Halaman {paymentData.page} dari {paymentData.totalPages} ({paymentData.total} data)</span>
                        <div className="flex gap-1">
                            <button
                                disabled={paymentData.page <= 1}
                                onClick={() => setPayFilters(s => ({ ...s, page: s.page - 1 }))}
                                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            >
                                Sebelumnya
                            </button>
                            <button
                                disabled={paymentData.page >= paymentData.totalPages}
                                onClick={() => setPayFilters(s => ({ ...s, page: s.page + 1 }))}
                                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            >
                                Selanjutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Receipt Modal */}
            {receiptPayment && (
                <div className="fixed inset-0 z-50 bg-black/45 p-4 backdrop-blur-sm" onClick={() => setReceiptPayment(null)}>
                    <div className="mx-auto mt-8 w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-900">Resi Pembayaran</h3>
                            <button type="button" onClick={() => setReceiptPayment(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                                <Icon name="close" size={16} className="text-slate-500" />
                            </button>
                        </div>
                        <ReceiptView
                            schoolName="Pesantren"
                            receiptNo={receiptPayment.receipt?.receiptNo ?? null}
                            invoiceCode={`INV-${receiptPayment.invoice?.id.slice(-6).toUpperCase() ?? '-'}`}
                            periodLabel={receiptPayment.invoice ? formatBillingPeriod(receiptPayment.invoice) : '-'}
                            generatedAt={receiptPayment.receipt?.generatedAt ?? receiptPayment.verifiedAt ?? receiptPayment.paidAt}
                            items={(receiptPayment.invoice?.items ?? []).map((item) => ({ name: item.label, amount: item.amount }))}
                            totalAmount={receiptPayment.invoice?.totalAmount ?? receiptPayment.amount}
                            paidAmount={receiptPayment.amount}
                            status={receiptPayment.invoice?.status === 'PAID' ? 'PAID' : receiptPayment.invoice?.status === 'PARTIAL' ? 'PARTIAL' : 'PENDING'}
                            verificationUrl={typeof window !== 'undefined' ? `${window.location.origin}/api/receipt/${receiptPayment.id}` : undefined}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
