'use client'

import { useState } from 'react'
import { trpc } from '@/utils/trpc'
import { formatRupiah } from '@/utils/format'
import { formatBillingPeriod, hijriMonthNameId, monthNameId } from '@/lib/billing/period'

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-slate-100 text-slate-600',
    PAID: 'bg-emerald-50 text-emerald-700',
    PARTIAL: 'bg-amber-50 text-amber-700',
    VOID: 'bg-slate-100 text-slate-400',
}

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Belum Lunas',
    PAID: 'Lunas',
    PARTIAL: 'Sebagian',
    VOID: 'Void',
}

export default function InvoiceTab() {
    const [filters, setFilters] = useState({
        status: '',
        search: '',
        periodDisplayMode: 'GREGORIAN' as 'GREGORIAN' | 'HIJRI',
        periodYear: '',
        periodMonth: '',
        hijriYear: '',
        hijriMonth: '',
        page: 1,
    })

    const { data: invoiceData, isLoading, error } = trpc.invoice.list.useQuery({
        status: (filters.status as 'PENDING' | 'PARTIAL' | 'PAID' | 'VOID') || undefined,
        search: filters.search || undefined,
        periodDisplayMode: filters.periodDisplayMode,
        periodYear: filters.periodDisplayMode === 'GREGORIAN' && filters.periodYear ? Number(filters.periodYear) : undefined,
        periodMonth: filters.periodDisplayMode === 'GREGORIAN' && filters.periodMonth ? Number(filters.periodMonth) : undefined,
        hijriYear: filters.periodDisplayMode === 'HIJRI' && filters.hijriYear ? Number(filters.hijriYear) : undefined,
        hijriMonth: filters.periodDisplayMode === 'HIJRI' && filters.hijriMonth ? Number(filters.hijriMonth) : undefined,
        page: filters.page,
        limit: 20,
    })

    if (isLoading) {
        return <p className="mt-4 text-sm text-slate-500">Memuat invoice...</p>
    }

    if (error) {
        return <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error.message}</p>
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">Invoice</h2>
                <p className="mt-1 text-sm text-slate-500">Daftar invoice belum lunas dan bayar separuh.</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
                    <input
                        type="text"
                        placeholder="Cari santri..."
                        value={filters.search}
                        onChange={(event) => setFilters((state) => ({ ...state, search: event.target.value, page: 1 }))}
                        className="w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <select
                        value={filters.status}
                        onChange={(event) => setFilters((state) => ({ ...state, status: event.target.value, page: 1 }))}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                        <option value="">Semua Status</option>
                        <option value="PENDING">Belum Lunas</option>
                        <option value="PARTIAL">Sebagian</option>
                        <option value="PAID">Lunas</option>
                    </select>
                    <select
                        value={filters.periodDisplayMode}
                        onChange={(event) => setFilters((state) => ({
                            ...state,
                            periodDisplayMode: event.target.value as 'GREGORIAN' | 'HIJRI',
                            page: 1,
                        }))}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                        <option value="GREGORIAN">Periode Gregorian</option>
                        <option value="HIJRI">Periode Hijriah</option>
                    </select>
                    {filters.periodDisplayMode === 'GREGORIAN' ? (
                        <>
                            <select
                                value={filters.periodMonth}
                                onChange={(event) => setFilters((state) => ({ ...state, periodMonth: event.target.value, page: 1 }))}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                                <option value="">Semua Bulan</option>
                                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
                                    <option key={month} value={String(month)}>
                                        {monthNameId(month)}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min={1}
                                placeholder="Tahun"
                                value={filters.periodYear}
                                onChange={(event) => setFilters((state) => ({ ...state, periodYear: event.target.value, page: 1 }))}
                                className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                        </>
                    ) : (
                        <>
                            <select
                                value={filters.hijriMonth}
                                onChange={(event) => setFilters((state) => ({ ...state, hijriMonth: event.target.value, page: 1 }))}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                                <option value="">Semua Bulan Hijriah</option>
                                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
                                    <option key={month} value={String(month)}>
                                        {hijriMonthNameId(month)}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min={1}
                                placeholder="Tahun Hijriah"
                                value={filters.hijriYear}
                                onChange={(event) => setFilters((state) => ({ ...state, hijriYear: event.target.value, page: 1 }))}
                                className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                        </>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50">
                                {['Santri', 'Jenis', 'Periode', 'Total', 'Terbayar', 'Status', ''].map((header) => (
                                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {invoiceData?.data?.map((invoice: any) => {
                                const pct = invoice.totalAmount ? Math.round(((invoice.paidAmount ?? 0) / invoice.totalAmount) * 100) : 0
                                return (
                                    <tr key={invoice.id} className="hover:bg-slate-50/80">
                                        <td className="px-4 py-3 text-sm">
                                            <span className="font-medium">{invoice.santri?.fullName}</span>
                                            <span className="ml-1 font-mono text-xs text-slate-400">({invoice.santri?.nis})</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{invoice.billingModel?.name}</td>
                                        <td className="px-4 py-3 text-sm text-slate-500">{formatBillingPeriod(invoice)}</td>
                                        <td className="px-4 py-3 font-mono text-sm">{formatRupiah(invoice.totalAmount)}</td>
                                        <td className="px-4 py-3 font-mono text-sm text-emerald-600">
                                            {formatRupiah(invoice.paidAmount ?? 0)}
                                            <span className="ml-1 text-xs text-slate-400">({pct}%)</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[invoice.status] ?? ''}`}>
                                                {STATUS_LABELS[invoice.status] ?? invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <a href={`/santri/${invoice.santriId}`} className="text-xs font-medium text-teal-600 hover:underline">
                                                Detail
                                            </a>
                                        </td>
                                    </tr>
                                )
                            })}
                            {!invoiceData?.data?.length && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">Tidak ada data invoice.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {invoiceData && invoiceData.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                        <span className="text-xs text-slate-500">Halaman {invoiceData.page} dari {invoiceData.totalPages} ({invoiceData.total} data)</span>
                        <div className="flex gap-1">
                            <button
                                disabled={invoiceData.page <= 1}
                                onClick={() => setFilters(s => ({ ...s, page: s.page - 1 }))}
                                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            >
                                Sebelumnya
                            </button>
                            <button
                                disabled={invoiceData.page >= invoiceData.totalPages}
                                onClick={() => setFilters(s => ({ ...s, page: s.page + 1 }))}
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
