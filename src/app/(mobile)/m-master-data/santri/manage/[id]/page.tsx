'use client'
import dynamic from 'next/dynamic'
const DetailPage = dynamic(() => import('@/app/(desktop)/master-data/santri/manage/[id]/page'), { ssr: false })
export default function MobileDetailSantriPage({ params }: { params: Promise<{ id: string }> }) { return <DetailPage params={params} /> }
