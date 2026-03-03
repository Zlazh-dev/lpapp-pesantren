'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const PengaturanTagihanTab = dynamic(() => import('@/app/(desktop)/keuangan/_components/PengaturanTagihanTab'), { ssr: false })
const PembayaranTab = dynamic(() => import('@/app/(desktop)/keuangan/_components/PembayaranTab'), { ssr: false })
const InvoiceTab = dynamic(() => import('@/app/(desktop)/keuangan/_components/InvoiceTab'), { ssr: false })
const ResiTab = dynamic(() => import('@/app/(desktop)/keuangan/_components/ResiTab'), { ssr: false })
const RekapTab = dynamic(() => import('@/app/(desktop)/keuangan/_components/RekapTab'), { ssr: false })

type FinanceTab = 'pengaturan-tagihan' | 'pembayaran' | 'invoice' | 'resi' | 'rekap'

const TAB_ITEMS: Array<{ id: FinanceTab; label: string }> = [
    { id: 'pengaturan-tagihan', label: 'Billing' },
    { id: 'pembayaran', label: 'Bayar' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'resi', label: 'Resi' },
    { id: 'rekap', label: 'Rekap' },
]

const VALID_TABS = new Set<string>(TAB_ITEMS.map((t) => t.id))

function KeuanganContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const rawTab = searchParams.get('tab') ?? 'pengaturan-tagihan'
    const tab: FinanceTab = VALID_TABS.has(rawTab) ? (rawTab as FinanceTab) : 'pengaturan-tagihan'
    const subTab = searchParams.get('sub') ?? undefined

    const setTab = (newTab: FinanceTab) => {
        router.push(`/m-keuangan?tab=${newTab}`)
    }

    const tabContent = (() => {
        switch (tab) {
            case 'pengaturan-tagihan': return <PengaturanTagihanTab />
            case 'pembayaran': return <PembayaranTab />
            case 'invoice': return <InvoiceTab />
            case 'resi': return <ResiTab />
            case 'rekap': return <RekapTab subTab={subTab} />
            default: return <PengaturanTagihanTab />
        }
    })()

    return (
        <div className="space-y-4 animate-fade-in">
            <div>
                <h2 className="text-xl font-bold text-slate-800">Keuangan</h2>
                <p className="text-xs text-slate-400 mt-0.5">Billing, pembayaran, invoice & rekap</p>
            </div>

            {/* Tab strip - horizontally scrollable */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {TAB_ITEMS.map((item) => (
                    <button key={item.id} onClick={() => setTab(item.id)}
                        className={`h-9 px-4 rounded-xl text-xs font-semibold flex-shrink-0 transition-all ${tab === item.id
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600'}`}>
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {tabContent}
        </div>
    )
}

export default function MobileKeuanganPage() {
    return (
        <Suspense fallback={<div className="space-y-4"><div className="h-6 w-32 bg-slate-100 animate-pulse rounded" /><div className="h-9 bg-slate-100 animate-pulse rounded-xl" /><div className="h-64 bg-slate-100 animate-pulse rounded-2xl" /></div>}>
            <KeuanganContent />
        </Suspense>
    )
}
