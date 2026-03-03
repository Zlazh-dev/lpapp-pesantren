import { use } from 'react'
import RoomDetailClient from '../../../kamar/[roomId]/_components/RoomDetailClient'

export default function MasterDataKamarDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params)
    return <RoomDetailClient roomIdProp={roomId} />
}
