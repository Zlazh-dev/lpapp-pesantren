'use client'
import dynamic from 'next/dynamic'
const EditPage = dynamic(() => import('@/app/(desktop)/master-data/santri/manage/[id]/edit/page'), { ssr: false })
export default function MobileEditSantriPage({ params }: { params: Promise<{ id: string }> }) { return <EditPage params={params} /> }
