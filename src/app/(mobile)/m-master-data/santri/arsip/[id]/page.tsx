'use client'
import dynamic from 'next/dynamic'
const ArsipDetailPage = dynamic(() => import('@/app/(desktop)/master-data/santri/arsip/[id]/page'), { ssr: false })
export default function MobileArsipDetailPage({ params }: { params: Promise<{ id: string }> }) { return <ArsipDetailPage params={params} /> }
