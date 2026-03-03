'use client'
import dynamic from 'next/dynamic'
const KeuanganSantriRequestPage = dynamic(() => import('@/app/(desktop)/keuangan/santri/[id]/request/page'), { ssr: false })
export default function MobileKeuanganSantriRequestPage({ params }: { params: Promise<{ id: string }> }) { return <KeuanganSantriRequestPage params={params} /> }
