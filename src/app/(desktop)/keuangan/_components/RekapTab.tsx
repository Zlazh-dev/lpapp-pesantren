'use client'

import { useState } from 'react'
import { trpc } from '@/utils/trpc'
import { formatRupiah } from '@/utils/format'
import { hijriMonthNameId, monthNameId } from '@/lib/billing/period'

type RekapSubTab = 'rekap-invoice' | 'rekap-pembayaran'

const SUB_TABS: Array<{ id: RekapSubTab; label: string }> = [
    { id: 'rekap-invoice', label: 'Rekap Invoice' },
    { id: 'rekap-pembayaran', label: 'Rekap Pembayaran' },
]

function PeriodFilter({
    periodDisplayMode,
    setPeriodDisplayMode,
    periodYear,
    setPeriodYear,
    periodMonth,
    setPeriodMonth,
    hijriYear,
    setHijriYear,
    hijriMonth,
    setHijriMonth,
}: {
    periodDisplayMode: 'GREGORIAN' | 'HIJRI'
    setPeriodDisplayMode: (v: 'GREGORIAN' | 'HIJRI') => void
    periodYear: string
    setPeriodYear: (v: string) => void
    periodMonth: string
    setPeriodMonth: (v: string) => void
    hijriYear: string
    setHijriYear: (v: string) => void
    hijriMonth: string
    setHijriMonth: (v: string) => void
}) {
    return (
        <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Mode Kalender</label>
                <select
                    value={periodDisplayMode}
                    onChange={(e) => setPeriodDisplayMode(e.target.value as 'GREGORIAN' | 'HIJRI')}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                    <option value="GREGORIAN">Gregorian</option>
                    <option value="HIJRI">Hijriah</option>
                </select>
            </div>
            {periodDisplayMode === 'GREGORIAN' ? (
                <>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Bulan</label>
                        <select
                            value={periodMonth}
                            onChange={(e) => setPeriodMonth(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                            <option value="">Semua Bulan</option>
                            {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
                                <option key={month} value={String(month)}>{monthNameId(month)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Tahun</label>
                        <input
                            type="number"
                            min={1}
                            placeholder="Tahun"
                            value={periodYear}
                            onChange={(e) => setPeriodYear(e.target.value)}
                            className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                    </div>
                </>
            ) : (
                <>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Bulan Hijriah</label>
                        <select
                            value={hijriMonth}
                            onChange={(e) => setHijriMonth(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                            <option value="">Semua Bulan</option>
                            {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
                                <option key={month} value={String(month)}>{hijriMonthNameId(month)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Tahun Hijriah</label>
                        <input
                            type="number"
                            min={1}
                            placeholder="Tahun Hijriah"
                            value={hijriYear}
                            onChange={(e) => setHijriYear(e.target.value)}
                            className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                    </div>
                </>
            )}
        </div>
    )
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">{label}</p>
            <p className={`mt-1 text-xl font-bold ${accent ?? 'text-slate-800'}`}>{value}</p>
        </div>
    )
}

export default function RekapTab({ subTab: initialSubTab }: { subTab?: string }) {
    const [subTab, setSubTab] = useState<RekapSubTab>(
        (initialSubTab === 'rekap-pembayaran' ? 'rekap-pembayaran' : 'rekap-invoice') as RekapSubTab
    )

    // Period filters shared across sub-tabs
    const [periodDisplayMode, setPeriodDisplayMode] = useState<'GREGORIAN' | 'HIJRI'>('GREGORIAN')
    const [periodYear, setPeriodYear] = useState('')
    const [periodMonth, setPeriodMonth] = useState('')
    const [hijriYear, setHijriYear] = useState('')
    const [hijriMonth, setHijriMonth] = useState('')

    const filterInput = {
        periodDisplayMode,
        periodYear: periodDisplayMode === 'GREGORIAN' && periodYear ? Number(periodYear) : undefined,
        periodMonth: periodDisplayMode === 'GREGORIAN' && periodMonth ? Number(periodMonth) : undefined,
        hijriYear: periodDisplayMode === 'HIJRI' && hijriYear ? Number(hijriYear) : undefined,
        hijriMonth: periodDisplayMode === 'HIJRI' && hijriMonth ? Number(hijriMonth) : undefined,
    }

    // Rekap Invoice data (uses existing invoice.stats)
    const invoiceStatsQuery = trpc.invoice.stats.useQuery(filterInput, {
        enabled: subTab === 'rekap-invoice',
    })

    // Rekap Pembayaran data (uses new invoice.rekapPembayaran)
    const rekapPembayaranQuery = trpc.invoice.rekapPembayaran.useQuery(filterInput, {
        enabled: subTab === 'rekap-pembayaran',
    })

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">Rekap Keuangan</h2>
                <p className="mt-1 text-sm text-slate-500">Ringkasan data invoice dan pembayaran per periode.</p>
            </div>

            {/* Secondary tabs */}
            <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
                {SUB_TABS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setSubTab(item.id)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${subTab === item.id
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Period filter (shared) */}
            <PeriodFilter
                periodDisplayMode={periodDisplayMode}
                setPeriodDisplayMode={setPeriodDisplayMode}
                periodYear={periodYear}
                setPeriodYear={setPeriodYear}
                periodMonth={periodMonth}
                setPeriodMonth={setPeriodMonth}
                hijriYear={hijriYear}
                setHijriYear={setHijriYear}
                hijriMonth={hijriMonth}
                setHijriMonth={setHijriMonth}
            />

            {/* Sub-tab: Rekap Invoice */}
            {subTab === 'rekap-invoice' && (
                <div className="space-y-4">
                    {invoiceStatsQuery.isLoading && (
                        <p className="text-sm text-slate-500">Memuat rekap invoice...</p>
                    )}
                    {invoiceStatsQuery.error && (
                        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {invoiceStatsQuery.error.message}
                        </p>
                    )}
                    {invoiceStatsQuery.data && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <SummaryCard
                                    label="Total Tagihan"
                                    value={formatRupiah(invoiceStatsQuery.data.totalAmount)}
                                />
                                <SummaryCard
                                    label="Total Terbayar"
                                    value={formatRupiah(invoiceStatsQuery.data.paidAmount)}
                                    accent="text-emerald-600"
                                />
                                <SummaryCard
                                    label="Outstanding"
                                    value={formatRupiah(
                                        Math.max(invoiceStatsQuery.data.totalAmount - invoiceStatsQuery.data.paidAmount, 0)
                                    )}
                                    accent="text-amber-600"
                                />
                                <SummaryCard
                                    label="Jumlah Invoice"
                                    value={String(invoiceStatsQuery.data.totalCount)}
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Lunas</p>
                                    <p className="mt-1 text-lg font-bold text-emerald-600">{invoiceStatsQuery.data.paidCount} invoice</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Belum Lunas</p>
                                    <p className="mt-1 text-lg font-bold text-slate-700">{invoiceStatsQuery.data.pendingCount} invoice</p>
                                    <p className="text-xs text-slate-400">{formatRupiah(invoiceStatsQuery.data.pendingAmount)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Sebagian</p>
                                    <p className="mt-1 text-lg font-bold text-amber-600">{invoiceStatsQuery.data.partialCount} invoice</p>
                                    <p className="text-xs text-slate-400">{formatRupiah(invoiceStatsQuery.data.partialAmount)}</p>
                                </div>
                            </div>
                        </>
                    )}
                    {!invoiceStatsQuery.isLoading && !invoiceStatsQuery.error && !invoiceStatsQuery.data && (
                        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                            Belum ada data rekap untuk periode yang dipilih.
                        </p>
                    )}
                </div>
            )}

            {/* Sub-tab: Rekap Pembayaran */}
            {subTab === 'rekap-pembayaran' && (
                <div className="space-y-4">
                    {rekapPembayaranQuery.isLoading && (
                        <p className="text-sm text-slate-500">Memuat rekap pembayaran...</p>
                    )}
                    {rekapPembayaranQuery.error && (
                        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {rekapPembayaranQuery.error.message}
                        </p>
                    )}
                    {rekapPembayaranQuery.data && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <SummaryCard
                                    label="Total Tagihan"
                                    value={formatRupiah(rekapPembayaranQuery.data.totalTagihan)}
                                />
                                <SummaryCard
                                    label="Total Dibayar"
                                    value={formatRupiah(rekapPembayaranQuery.data.totalDibayar)}
                                    accent="text-emerald-600"
                                />
                                <SummaryCard
                                    label="Outstanding"
                                    value={formatRupiah(rekapPembayaranQuery.data.outstanding)}
                                    accent="text-amber-600"
                                />
                                <SummaryCard
                                    label="Jumlah Pembayaran"
                                    value={String(rekapPembayaranQuery.data.paymentCount)}
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Invoice</p>
                                    <p className="mt-1 text-lg font-bold text-slate-700">{rekapPembayaranQuery.data.invoiceCount} invoice</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Pembayaran Terverifikasi</p>
                                    <p className="mt-1 text-lg font-bold text-emerald-600">{rekapPembayaranQuery.data.verifiedPaymentCount} pembayaran</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Pembayaran Pending</p>
                                    <p className="mt-1 text-lg font-bold text-amber-600">{rekapPembayaranQuery.data.pendingPaymentCount} pembayaran</p>
                                </div>
                            </div>
                        </>
                    )}
                    {!rekapPembayaranQuery.isLoading && !rekapPembayaranQuery.error && !rekapPembayaranQuery.data && (
                        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                            Belum ada data rekap untuk periode yang dipilih.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
