'use client'
import dynamic from 'next/dynamic'
const AkademikSantriRequestPage = dynamic(() => import('@/app/(desktop)/akademik/santri/[id]/request/page'), { ssr: false })
export default function MobileAkademikSantriRequestPage({ params }: { params: Promise<{ id: string }> }) { return <AkademikSantriRequestPage params={params} /> }
