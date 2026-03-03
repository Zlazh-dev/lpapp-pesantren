'use client'

import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import Link from 'next/link'

export default function MobileSantriPage() {
    const [search, setSearch] = useState('')
    const { data } = trpc.santri.list.useQuery({ search: search || undefined, limit: 50 })

    return (
        <div className="space-y-4 animate-fade-in">
            <h1 className="text-xl font-bold text-slate-800">Data Santri</h1>
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Cari santri..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
            </div>
            <div className="space-y-2">
                {data?.data?.map((s: any) => (
                    <Link key={s.id} href={`/m-santri/${s.id}`} className="block bg-white rounded-xl border border-slate-200 p-4 card-hover">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold">{s.fullName.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 truncate">{s.fullName}</p>
                                <p className="text-sm text-slate-500">{s.nis}</p>
                                <div className="flex gap-2 mt-1">
                                    {s.dormRoom && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{s.dormRoom.name}</span>}
                                    {s.classGroup && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s.classGroup.name}</span>}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
