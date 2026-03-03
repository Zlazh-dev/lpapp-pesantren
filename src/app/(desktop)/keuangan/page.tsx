'use client'

import { Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const PengaturanTagihanTab = dynamic(() => import('./_components/PengaturanTagihanTab'), { ssr: false })
const PembayaranTab = dynamic(() => import('./_components/PembayaranTab'), { ssr: false })
const InvoiceTab = dynamic(() => import('./_components/InvoiceTab'), { ssr: false })
const ResiTab = dynamic(() => import('./_components/ResiTab'), { ssr: false })
const RekapTab = dynamic(() => import('./_components/RekapTab'), { ssr: false })

type FinanceTab = 'pengaturan-tagihan' | 'pembayaran' | 'invoice' | 'resi' | 'rekap'

const TAB_ITEMS: Array<{ id: FinanceTab; label: string }> = [
    { id: 'pengaturan-tagihan', label: 'Sistem Billing' },
    { id: 'pembayaran', label: 'Pembayaran' },
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
        const params = new URLSearchParams()
        params.set('tab', newTab)
        router.push(`/keuangan?${params.toString()}`)
    }

    const tabContent = useMemo(() => {
        switch (tab) {
            case 'pengaturan-tagihan':
                return <PengaturanTagihanTab />
            case 'pembayaran':
                return <PembayaranTab />
            case 'invoice':
                return <InvoiceTab />
            case 'resi':
                return <ResiTab />
            case 'rekap':
                return <RekapTab subTab={subTab} />
            default:
                return <PengaturanTagihanTab />
        }
    }, [tab, subTab])

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Manajemen Keuangan</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Kelola pengaturan tagihan, validasi pembayaran, invoice, resi, dan rekap keuangan.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
                {TAB_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === item.id
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {tabContent}
        </div>
    )
}

export default function KeuanganPage() {
    return (
        <Suspense fallback={
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Manajemen Keuangan</h1>
                    <p className="mt-1 text-sm text-slate-500">Memuat...</p>
                </div>
                <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                <div className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
            </div>
        }>
            <KeuanganContent />
        </Suspense>
    )
}
