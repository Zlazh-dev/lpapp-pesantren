import { use } from 'react'
import { redirect } from 'next/navigation'

export default function LegacySantriDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    redirect(`/master-data/santri/manage/${id}`)
}
