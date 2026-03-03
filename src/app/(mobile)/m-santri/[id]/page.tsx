'use client'

import { use } from 'react'
import { trpc } from '@/utils/trpc'
import { getGenderLabel } from '@/utils/format'
import Link from 'next/link'

export default function MobileSantriDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { data: santri } = trpc.santri.getById.useQuery(id)

    if (!santri) return <div className="animate-pulse"><div className="h-48 bg-slate-200 rounded-2xl" /></div>

    return (
        <div className="space-y-4 animate-fade-in">
            <Link href="/m-santri" className="inline-flex items-center gap-1 text-sm text-teal-600">← Kembali</Link>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="gradient-primary p-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold text-white">{santri.fullName.charAt(0)}</div>
                    <div><h1 className="text-lg font-bold text-white">{santri.fullName}</h1><p className="text-teal-100 text-sm">NIS: {santri.nis}</p></div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                    {[['Gender', getGenderLabel(santri.gender)], ['Kamar', (santri as any).dormRoom?.name ?? '-'], ['Kelas', (santri as any).classGroup?.name ?? '-'], ['Wali', santri.fatherName ?? '-']].map(([l, v]) => (
                        <div key={l as string}><p className="text-slate-500 text-xs">{l}</p><p className="font-medium text-slate-800">{v}</p></div>
                    ))}
                </div>
            </div>
        </div>
    )
}
