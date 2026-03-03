'use client'
import MobileSantriDetailPage from '@/app/(mobile)/_components/MobileSantriDetailPage'
export default function MobileKeuanganSantriDetailPage({ params }: { params: Promise<{ id: string }> }) {
    return <MobileSantriDetailPage params={params} variant="keuangan" />
}
