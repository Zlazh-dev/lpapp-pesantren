'use client'
import dynamic from 'next/dynamic'
const DashboardSantriSayaDetailPage = dynamic(() => import('@/app/(desktop)/dashboard/santri-saya/[santriId]/page'), { ssr: false })
export default function MobileDashboardSantriSayaDetailPage({ params }: { params: Promise<{ santriId: string }> }) { return <DashboardSantriSayaDetailPage params={params} backHref="/m-dashboard/santri-saya" /> }
