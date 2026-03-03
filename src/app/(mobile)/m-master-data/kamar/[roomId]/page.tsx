'use client'
import dynamic from 'next/dynamic'
const KamarDetailPage = dynamic(() => import('@/app/(desktop)/master-data/kamar/[roomId]/page'), { ssr: false })
export default function MobileKamarDetailPage({ params }: { params: Promise<{ roomId: string }> }) { return <KamarDetailPage params={params} /> }
