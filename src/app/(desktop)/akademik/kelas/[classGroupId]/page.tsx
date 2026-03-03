import { use } from 'react'
import ClassDetailClient from '../../../kelas/[classGroupId]/_components/ClassDetailClient'

export default function AkademikKelasDetailPage({ params }: { params: Promise<{ classGroupId: string }> }) {
    const { classGroupId } = use(params)
    return <ClassDetailClient classGroupIdProp={classGroupId} />
}
