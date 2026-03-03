'use client'

import { trpc } from '@/utils/trpc'
import { formatRupiah, getBillStatusLabel, getBillStatusColor } from '@/utils/format'
import { Icon } from '@/components/icons'

export default function MobileBillingPage() {
    const { data } = trpc.billing.dashboard.useQuery()

    return (
        <div className="space-y-4 animate-fade-in">
            <h1 className="text-xl font-bold text-slate-800">Billing</h1>
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                <Icon name="info" size={20} className="text-emerald-700" />
                <p className="text-xs text-emerald-700">Prinsip syariah - tanpa denda/riba</p>
            </div>
            {data?.summary && (
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { l: 'Total', v: formatRupiah(data.summary.totalAmount), c: 'border-l-teal-500' },
                        { l: 'Lunas', v: formatRupiah(data.summary.paidAmount), c: 'border-l-emerald-500' },
                        { l: 'Pending', v: formatRupiah(data.summary.pendingAmount), c: 'border-l-red-500' },
                        { l: 'Sebagian', v: formatRupiah(data.summary.partialAmount), c: 'border-l-amber-500' },
                    ].map(i => (
                        <div key={i.l} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${i.c} p-3`}>
                            <p className="text-xs text-slate-500">{i.l}</p>
                            <p className="text-sm font-bold text-slate-800">{i.v}</p>
                        </div>
                    ))}
                </div>
            )}
            {data?.perType && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h2 className="font-semibold text-slate-800 mb-3">Per Jenis</h2>
                    {data.perType.map(t => (
                        <div key={t.type} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                            <span className="text-sm font-medium">{t.type}</span>
                            <span className="text-sm font-mono text-slate-700">{formatRupiah(t._sum.amount ?? 0)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
