'use client'
import MobileSantriDetailPage from '@/app/(mobile)/_components/MobileSantriDetailPage'
export default function MobileMasterDataSantriDetailPage({ params }: { params: Promise<{ id: string }> }) {
    return <MobileSantriDetailPage params={params} variant="master-data" />
}
