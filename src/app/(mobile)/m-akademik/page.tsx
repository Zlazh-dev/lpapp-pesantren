'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const KelasPageClient = dynamic(() => import('@/app/(desktop)/kelas/_components/KelasPageClient'), { ssr: false })
const AkademikSantriPage = dynamic(() => import('@/app/(desktop)/akademik/santri/page'), { ssr: false })

function AkademikContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const tab = searchParams.get('tab') ?? 'santri'

    const tabs = [
        { id: 'santri', label: 'Data Santri' },
        { id: 'kelas', label: 'Kelas' },
    ]

    return (
        <div className="space-y-4 animate-fade-in">
            <div>
                <h2 className="text-xl font-bold text-slate-800">Akademik</h2>
                <p className="text-xs text-slate-400 mt-0.5">Data santri dan kelas madrasah</p>
            </div>

            {/* Tab strip */}
            <div className="flex gap-1.5">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => router.push(`/m-akademik?tab=${t.id}`)}
                        className={`h-9 px-5 rounded-xl text-sm font-semibold transition-all ${tab === t.id
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'santri' && <AkademikSantriPage />}
            {tab === 'kelas' && <KelasPageClient />}
        </div>
    )
}

export default function MobileAkademikPage() {
    return (
        <Suspense fallback={<div className="space-y-4"><div className="h-6 w-24 bg-slate-100 animate-pulse rounded" /><div className="h-9 bg-slate-100 animate-pulse rounded-xl w-48" /></div>}>
            <AkademikContent />
        </Suspense>
    )
}
