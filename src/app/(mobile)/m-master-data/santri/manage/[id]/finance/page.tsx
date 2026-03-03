'use client'
import dynamic from 'next/dynamic'
const FinancePage = dynamic(() => import('@/app/(desktop)/master-data/santri/manage/[id]/finance/page'), { ssr: false })
export default function MobileManageFinancePage({ params }: { params: Promise<{ id: string }> }) { return <FinancePage params={params} /> }
