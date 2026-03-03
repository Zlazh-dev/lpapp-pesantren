'use client'
import dynamic from 'next/dynamic'
const ActivatePage = dynamic(() => import('@/app/(desktop)/keuangan/activate/[billingModelId]/page'), { ssr: false })
export default function MobileActivatePage({ params }: { params: Promise<{ billingModelId: string }> }) { return <ActivatePage params={params} /> }
