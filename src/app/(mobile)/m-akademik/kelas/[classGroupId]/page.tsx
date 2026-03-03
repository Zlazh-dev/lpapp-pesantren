'use client'
import dynamic from 'next/dynamic'
const KelasDetailPage = dynamic(() => import('@/app/(desktop)/akademik/kelas/[classGroupId]/page'), { ssr: false })
export default function MobileKelasDetailPage({ params }: { params: Promise<{ classGroupId: string }> }) { return <KelasDetailPage params={params} /> }
