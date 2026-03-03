import { use } from 'react'
import { redirect } from 'next/navigation'

export default function LegacyKelasDetailPage({ params }: { params: Promise<{ classGroupId: string }> }) {
    const { classGroupId } = use(params)
    redirect(`/akademik/kelas/${classGroupId}`)
}
