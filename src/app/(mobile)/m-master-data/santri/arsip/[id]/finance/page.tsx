'use client'
import dynamic from 'next/dynamic'
const ArsipFinancePage = dynamic(() => import('@/app/(desktop)/master-data/santri/arsip/[id]/finance/page'), { ssr: false })
export default function MobileArsipFinancePage({ params }: { params: Promise<{ id: string }> }) { return <ArsipFinancePage params={params} /> }
