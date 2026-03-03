'use client'

import { use, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'
import { formatBillingPeriod } from '@/lib/billing/period'
import { Icon } from '@/components/icons'
import ReceiptView from '@/components/receipt/ReceiptView'

type ReceiptPayment = {
    id: string
    amount: number
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

export default function AlumniFinancePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const utils = trpc.useUtils()
    const [receiptPayment, setReceiptPayment] = useState<ReceiptPayment | null>(null)

    const { data: santri, isLoading: santriLoading } = trpc.santri.getById.useQuery(id)
    const { data: summary } = trpc.billing.getSantriFinancialSummary.useQuery(
        { santriId: id },
        { enabled: !!id }
    )
    const { data: invoices } = trpc.invoice.getByStudent.useQuery(id, { enabled: !!id })

    const generateReceipt = trpc.payment.generateReceipt.useMutation({
        onSuccess: async () => {
            await utils.invoice.getByStudent.invalidate(id)
        },
    })

    const fmtRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

    const handleReceipt = async (payment: any, inv: any) => {
        if (!payment.receipt) {
            await generateReceipt.mutateAsync(payment.id)
            await utils.invoice.getByStudent.invalidate(id)
        }
        setReceiptPayment({
            ...payment,
            invoice: {
                id: inv.id,
                periodKey: inv.periodKey ?? '',
                periodDisplayMode: inv.periodDisplayMode ?? null,
                periodYear: inv.periodYear ?? null,
                periodMonth: inv.periodMonth ?? null,
                hijriYear: inv.hijriYear ?? null,
                hijriMonth: inv.hijriMonth ?? null,
                hijriVariant: inv.hijriVariant ?? null,
                totalAmount: Number(inv.totalAmount) || 0,
                status: inv.status,
                items: inv.items ?? [],
                santri: { fullName: santri?.fullName ?? '', nis: santri?.nis ?? '' },
                billingModel: { name: inv.billingModel?.name ?? 'Tagihan' },
            },
        })
    }

    if (santriLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse w-80" />
                <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
                <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            </div>
        )
    }

    if (!santri) return null

    const totalTagihan = summary?.totalInvoiced ?? 0
    const totalTerbayar = summary?.totalPaid ?? 0
    const sisaTagihan = summary?.outstanding ?? 0
    const persen = totalTagihan > 0 ? Math.round((totalTerbayar / totalTagihan) * 100) : 0
    const billsPaid = summary?.paidInvoiceCount ?? 0
    const billsPartial = summary?.partialInvoiceCount ?? 0
    const billsPending = summary?.pendingInvoiceCount ?? 0

    const statusMap: Record<string, { label: string; bg: string; text: string }> = {
        PAID: { label: 'Lunas', bg: 'bg-emerald-50', text: 'text-emerald-700' },
        PARTIAL: { label: 'Sebagian', bg: 'bg-amber-50', text: 'text-amber-700' },
        PENDING: { label: 'Belum Bayar', bg: 'bg-red-50', text: 'text-red-600' },
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href={`/master-data/santri/arsip/${id}`}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:shadow-sm transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Finance Alumni</h1>
                    <p className="text-sm text-slate-400">{santri.fullName} — NIS: {santri.nis}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Tagihan</p>
                    <p className="text-xl font-bold text-slate-800 mt-1">{fmtRp(totalTagihan)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Terbayar</p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{fmtRp(totalTerbayar)}</p>
                </div>
                <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Sisa</p>
                    <p className="text-xl font-bold text-red-700 mt-1">{fmtRp(sisaTagihan)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Progress</p>
                        <span className={`text-lg font-bold ${persen >= 100 ? 'text-emerald-600' : persen > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {persen}%
                        </span>
                    </div>
                    <div className="mt-2 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${persen >= 100 ? 'bg-emerald-500' : persen > 0 ? 'bg-amber-500' : 'bg-slate-200'}`}
                            style={{ width: `${Math.min(persen, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Status Counters */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 py-3 text-center">
                    <p className="text-xl font-bold text-emerald-700">{billsPaid}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold uppercase">Lunas</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 py-3 text-center">
                    <p className="text-xl font-bold text-amber-700">{billsPartial}</p>
                    <p className="text-[10px] text-amber-600 font-semibold uppercase">Sebagian</p>
                </div>
                <div className="rounded-xl bg-red-50 border border-red-100 py-3 text-center">
                    <p className="text-xl font-bold text-red-600">{billsPending}</p>
                    <p className="text-[10px] text-red-500 font-semibold uppercase">Belum Bayar</p>
                </div>
            </div>

            {/* Invoice List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Daftar Tagihan</h2>
                </div>
                <div className="p-6">
                    {!invoices || invoices.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <p className="text-base font-medium text-slate-500">Belum ada tagihan</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {invoices.map((inv: any, idx: number) => {
                                const st = statusMap[inv.status] ?? statusMap.PENDING
                                const modelName = inv.billingModel?.name ?? `Tagihan #${idx + 1}`
                                const totalAmount = Number(inv.totalAmount) || 0
                                const paidAmount = inv.payments
                                    ?.filter((p: any) => p.verifiedAt)
                                    ?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) ?? 0
                                const periodDisplay = inv.periodDisplay || inv.periodKey || ''
                                const dueDate = inv.dueAt ? new Date(inv.dueAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null
                                const verifiedPayments = (inv.payments ?? []).filter((p: any) => p.verifiedAt)

                                return (
                                    <div key={inv.id ?? idx}
                                        className="rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{modelName}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-xs text-slate-400">
                                                        {fmtRp(paidAmount)} <span className="text-slate-300">/</span> {fmtRp(totalAmount)}
                                                    </p>
                                                    {periodDisplay && <p className="text-[11px] text-slate-300">Periode: {periodDisplay}</p>}
                                                    {dueDate && <p className="text-[11px] text-slate-300">Jatuh tempo: {dueDate}</p>}
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${st.bg} ${st.text} shrink-0 ml-3`}>
                                                {st.label}
                                            </span>
                                        </div>

                                        {/* Receipt buttons */}
                                        {verifiedPayments.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                                                {verifiedPayments.map((payment: any) => (
                                                    <button
                                                        key={payment.id}
                                                        type="button"
                                                        onClick={() => handleReceipt(payment, inv)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-all"
                                                    >
                                                        <Icon name="receipt" size={14} className="text-current" />
                                                        Cetak Resi — {fmtRp(Number(payment.amount))}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Receipt Modal (portal to body) ═══ */}
            {receiptPayment && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 p-4 backdrop-blur-sm" onClick={() => setReceiptPayment(null)}>
                    <div className="mx-auto mt-8 w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
                </div>,
                document.body
            )}
        </div>
    )
}
