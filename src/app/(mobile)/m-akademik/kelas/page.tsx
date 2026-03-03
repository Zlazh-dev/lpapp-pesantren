'use client'
import dynamic from 'next/dynamic'
const KelasPageClient = dynamic(() => import('@/app/(desktop)/kelas/_components/KelasPageClient'), { ssr: false })
export default function MobileKelasPage() { return <KelasPageClient /> }
