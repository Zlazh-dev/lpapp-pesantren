'use client'
import dynamic from 'next/dynamic'
const KamarPageClient = dynamic(() => import('@/app/(desktop)/kamar/_components/KamarPageClient'), { ssr: false })
export default function MobileKamarManagePage() { return <KamarPageClient /> }
