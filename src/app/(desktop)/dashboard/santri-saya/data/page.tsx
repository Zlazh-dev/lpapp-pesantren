'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'

export default function SantriSayaDataPage() {
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    const { data, isLoading } = trpc.santriRequest.listMyScope.useQuery({ search: debouncedSearch || undefined })
    const { refetch: refetchRequests } = trpc.santriRequest.myRequests.useQuery()
    const createRequestMut = trpc.santriRequest.create.useMutation({
        onSuccess: () => {
            refetchRequests()
            setRequestModal(null)
            setRequestDesc('')
            setRequestType('EDIT')
            setSuccess('Permintaan berhasil dikirim')
            setTimeout(() => setSuccess(''), 3000)
        },
        onError: (e: any) => setError(e.message),
    })

    const [requestModal, setRequestModal] = useState<{ santriId: string; santriName: string } | null>(null)
    const [requestType, setRequestType] = useState<'EDIT' | 'DELETE' | 'OTHER'>('EDIT')
    const [requestDesc, setRequestDesc] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSearch = (val: string) => {
        setSearch(val)
        const timeout = setTimeout(() => setDebouncedSearch(val), 300)
        return () => clearTimeout(timeout)
    }

    const scopeLabel = data?.scopeType === 'WALI_KELAS'
        ? 'Wali Kelas'
        : data?.scopeType === 'PEMBIMBING_KAMAR' ? 'Pembimbing Kamar' : 'Santri Saya'
    const scopeDetail = data?.scopeType === 'WALI_KELAS' && Array.isArray(data.scope)
        ? data.scope.map((cg: any) => `${cg.grade?.level?.code ?? ''} ${cg.name}`).join(', ')
        : data?.scopeType === 'PEMBIMBING_KAMAR' && Array.isArray(data.scope)
            ? data.scope.map((r: any) => r.floor?.building?.name ? `${r.floor.building.name} — ${r.name}` : r.name).join(', ')
            : ''

    return (
        <>
            <div className="space-y-5 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Data Santri</h1>
                        <p className="text-sm text-slate-400 mt-0.5">{scopeLabel}{scopeDetail ? ` — ${scopeDetail}` : ''}</p>
                    </div>
                    {data && (
                        <div className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-medium border border-blue-100 flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {data.santri.length} santri
                        </div>
                    )}
                </div>

                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
                {success && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm">{success}</div>}

                {/* Search */}
                <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Cari berdasarkan nama atau NIS..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none transition-all" />
                </div>

                {/* Santri List */}
                {isLoading ? (
                    <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />)}</div>
                ) : data?.scopeType === 'NONE' ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                        <p className="text-slate-500 font-medium">Belum ada penugasan</p>
                        <p className="text-sm text-slate-400 mt-1">Anda belum ditugaskan sebagai wali kelas atau pembimbing kamar.</p>
                    </div>
                ) : !data?.santri.length ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                        <p className="text-sm text-slate-400">Tidak ada santri ditemukan</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Santri</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">NIS</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">L/P</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                        {data.scopeType === 'WALI_KELAS' ? 'Kamar' : 'Kelas'}
                                    </th>
                                    <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.santri.map((s: any) => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <Link href={`/dashboard/santri-saya/${s.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                    {s.fullName?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-slate-800 truncate hover:text-teal-600 transition-colors">{s.fullName}</span>
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3"><span className="text-sm text-slate-500 font-mono">{s.nis}</span></td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold ${s.gender === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                                {s.gender}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-slate-500">
                                                {data.scopeType === 'WALI_KELAS' ? (s.dormRoom?.name ?? '-') : (s.classGroup?.name ?? '-')}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button onClick={() => setRequestModal({ santriId: s.id, santriName: s.fullName })}
                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-100 transition-all">
                                                Request Perubahan
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Request Change Modal */}
            {requestModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setRequestModal(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Request Perubahan Data</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Santri: <span className="font-medium text-slate-700">{requestModal.santriName}</span></p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Jenis Request</label>
                            <div className="flex gap-2">
                                {([['EDIT', 'Edit Data'], ['DELETE', 'Hapus Data'], ['OTHER', 'Lainnya']] as const).map(([val, label]) => (
                                    <button key={val} onClick={() => setRequestType(val)}
                                        className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${requestType === val ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Deskripsi Perubahan</label>
                            <textarea value={requestDesc} onChange={e => setRequestDesc(e.target.value)} rows={4}
                                placeholder="Jelaskan perubahan yang diminta (min. 10 karakter)..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none transition-all" />
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                            <button onClick={() => setRequestModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                                Batal
                            </button>
                            <button
                                onClick={() => { if (requestDesc.length >= 10) createRequestMut.mutate({ santriId: requestModal.santriId, type: requestType, description: requestDesc }) }}
                                disabled={requestDesc.length < 10 || createRequestMut.isPending}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-violet-500 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50 transition-all shadow-md shadow-violet-500/20">
                                {createRequestMut.isPending ? 'Mengirim...' : 'Kirim Request'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
