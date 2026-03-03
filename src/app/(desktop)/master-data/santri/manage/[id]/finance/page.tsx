'use client'

import React, { use, useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'

type Tab = 'tagihan' | 'pembayaran' | 'rekap'

export default function SantriFinancePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [activeTab, setActiveTab] = useState<Tab>('tagihan')

    const { data: santri, isLoading } = trpc.santri.getById.useQuery(id)
    const { data: summary } = trpc.billing.getSantriFinancialSummary.useQuery(
        { santriId: id },
        { enabled: !!id }
    )
    const { data: invoices } = trpc.invoice.getByStudent.useQuery(id, { enabled: !!id })

    const fmtRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                <div className="h-12 bg-slate-100 rounded-xl animate-pulse w-80" />
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

    const tabs: { key: Tab; label: string; icon: React.ReactElement }[] = [
        {
            key: 'tagihan', label: 'Invoice / Tagihan',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
        },
        {
            key: 'pembayaran', label: 'Pembayaran',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        },
        {
            key: 'rekap', label: 'Rekap',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
        },
    ]

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href={`/master-data/santri/manage/${id}`}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:shadow-sm transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Finance Management</h1>
                        <p className="text-sm text-slate-400">{santri.fullName} — NIS: {santri.nis}</p>
                    </div>
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

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-100">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all
                                ${activeTab === tab.key
                                    ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50/30'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {activeTab === 'tagihan' && (
                        <TagihanTab invoices={invoices ?? []} fmtRp={fmtRp} />
                    )}
                    {activeTab === 'pembayaran' && (
                        <PembayaranTab invoices={invoices ?? []} fmtRp={fmtRp} santriId={id} />
                    )}
                    {activeTab === 'rekap' && (
                        <RekapTab
                            totalTagihan={totalTagihan} totalTerbayar={totalTerbayar}
                            sisaTagihan={sisaTagihan} persen={persen}
                            billsPaid={billsPaid} billsPartial={billsPartial} billsPending={billsPending}
                            fmtRp={fmtRp}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════
   TAB 1: TAGIHAN / INVOICE
   ═══════════════════════════════════════════ */
function TagihanTab({ invoices, fmtRp }: { invoices: any[]; fmtRp: (n: number) => string }) {
    const statusMap: Record<string, { label: string; bg: string; text: string }> = {
        PAID: { label: 'Lunas', bg: 'bg-emerald-50', text: 'text-emerald-700' },
        PARTIAL: { label: 'Sebagian', bg: 'bg-amber-50', text: 'text-amber-700' },
        PENDING: { label: 'Belum Bayar', bg: 'bg-red-50', text: 'text-red-600' },
    }

    if (invoices.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <p className="text-base font-medium text-slate-500">Belum ada tagihan</p>
                <p className="text-sm text-slate-400 mt-1">Tagihan akan muncul setelah di-generate dari halaman keuangan</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {invoices.map((inv: any, idx: number) => {
                const st = statusMap[inv.status] ?? statusMap.PENDING
                const modelName = inv.billingModel?.name ?? `Tagihan #${idx + 1}`
                const totalAmount = Number(inv.totalAmount) || 0
                const paidAmount = inv.payments
                    ?.filter((p: any) => p.verifiedAt)
                    ?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) ?? 0
                const periodDisplay = inv.periodDisplay || inv.periodKey || ''
                const dueDate = inv.dueAt ? new Date(inv.dueAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null

                return (
                    <div key={inv.id ?? idx}
                        className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all">
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
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${st.bg} ${st.text}`}>
                                {st.label}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

/* ═══════════════════════════════════════════
   TAB 2: PEMBAYARAN
   ═══════════════════════════════════════════ */
function PembayaranTab({ invoices, fmtRp, santriId }: { invoices: any[]; fmtRp: (n: number) => string; santriId: string }) {
    const unpaidInvoices = invoices.filter((inv: any) => inv.status !== 'PAID')

    if (unpaidInvoices.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p className="text-base font-medium text-slate-500">Semua Tagihan Lunas</p>
                <p className="text-sm text-slate-400 mt-1">Tidak ada tagihan yang perlu dibayar</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-2">{unpaidInvoices.length} tagihan belum lunas</p>
            {unpaidInvoices.map((inv: any, idx: number) => {
                const modelName = inv.billingModel?.name ?? `Tagihan #${idx + 1}`
                const totalAmount = Number(inv.totalAmount) || 0
                const paidAmount = inv.payments
                    ?.filter((p: any) => p.verifiedAt)
                    ?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) ?? 0
                const remaining = totalAmount - paidAmount

                return (
                    <div key={inv.id ?? idx}
                        className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">{modelName}</p>
                                <p className="text-xs text-slate-400 mt-0.5">Sisa: {fmtRp(remaining)}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${inv.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                                {inv.status === 'PARTIAL' ? 'Sebagian' : 'Belum Bayar'}
                            </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${inv.status === 'PARTIAL' ? 'bg-amber-400' : 'bg-slate-200'}`}
                                style={{ width: `${totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0}%` }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href={`/master-data/santri/manage/${santriId}/finance/pay/${inv.id}`}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-teal-500/20 flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Bayar
                            </Link>
                            <button className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-all">
                                Hapus
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

/* ═══════════════════════════════════════════
   TAB 3: REKAP
   ═══════════════════════════════════════════ */
function RekapTab({
    totalTagihan, totalTerbayar, sisaTagihan, persen,
    billsPaid, billsPartial, billsPending, fmtRp,
}: {
    totalTagihan: number; totalTerbayar: number; sisaTagihan: number; persen: number
    billsPaid: number; billsPartial: number; billsPending: number
    fmtRp: (n: number) => string
}) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center justify-center">
                    <div className="relative w-40 h-40">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                            <circle
                                cx="60" cy="60" r="52" fill="none"
                                stroke={persen >= 100 ? '#10b981' : persen > 0 ? '#f59e0b' : '#e2e8f0'}
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={`${(persen / 100) * 326.7} 326.7`}
                                className="transition-all duration-700"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-slate-800">{persen}%</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Terbayar</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-sm font-medium text-slate-500">Total Tagihan</span>
                        <span className="text-base font-bold text-slate-800">{fmtRp(totalTagihan)}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span className="text-sm font-medium text-emerald-600">Terbayar</span>
                        <span className="text-base font-bold text-emerald-700">{fmtRp(totalTerbayar)}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-red-50 border border-red-100">
                        <span className="text-sm font-medium text-red-500">Sisa</span>
                        <span className="text-base font-bold text-red-700">{fmtRp(sisaTagihan)}</span>
                    </div>
                </div>
            </div>
            <div>
                <h4 className="text-sm font-bold text-slate-600 mb-3">Status Tagihan</h4>
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 py-4 text-center">
                        <p className="text-2xl font-bold text-emerald-700">{billsPaid}</p>
                        <p className="text-xs text-emerald-600 font-semibold uppercase mt-1">Lunas</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 border border-amber-100 py-4 text-center">
                        <p className="text-2xl font-bold text-amber-700">{billsPartial}</p>
                        <p className="text-xs text-amber-600 font-semibold uppercase mt-1">Separuh Terbayar</p>
                    </div>
                    <div className="rounded-xl bg-red-50 border border-red-100 py-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{billsPending}</p>
                        <p className="text-xs text-red-500 font-semibold uppercase mt-1">Belum Bayar</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
