import { use } from 'react'
import { redirect } from 'next/navigation'

export default function LegacyKamarDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params)
    redirect(`/master-data/kamar/${roomId}`)
}
