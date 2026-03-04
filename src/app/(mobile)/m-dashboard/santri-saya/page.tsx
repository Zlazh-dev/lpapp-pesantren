'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'
import { useSession } from 'next-auth/react'

type ActiveTab = 'santri' | 'permintaan'
type StatusKey = 'PENDING' | 'IN_DISCUSSION' | 'APPROVED' | 'REJECTED'

const STATUS: Record<StatusKey, { label: string; color: string }> = {
    PENDING: { label: 'Menunggu', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    IN_DISCUSSION: { label: 'Diskusi', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    APPROVED: { label: 'Disetujui', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Ditolak', color: 'bg-red-50 text-red-700 border-red-200' },
}

function StatusBadge({ status }: { status: string }) {
    const s = STATUS[status as StatusKey] ?? { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${s.color}`}>{s.label}</span>
}

function fmtDate(d: string | Date) {
    return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function MobileSantriSayaPage() {
    const { data: session } = useSession()
    const myId = session?.user?.id ?? ''

    const [activeTab, setActiveTab] = useState<ActiveTab>('santri')
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [requestModal, setRequestModal] = useState<{ santriId: string; santriName: string } | null>(null)
    const [requestType, setRequestType] = useState<'EDIT' | 'DELETE' | 'OTHER'>('EDIT')
    const [requestDesc, setRequestDesc] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Permintaan state
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const chatRef = useRef<HTMLDivElement>(null)

    const { data, isLoading, error: scopeError } = trpc.santriRequest.listMyScope.useQuery({ search: debouncedSearch || undefined })
    const { data: myRequests, refetch: refetchRequests } = trpc.santriRequest.myRequests.useQuery(undefined, { refetchInterval: 15_000 })
    const detailQ = trpc.santriRequest.getDetail.useQuery(selectedId!, { enabled: !!selectedId, refetchInterval: 8_000 })

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
    const addMsgMut = trpc.santriRequest.addMessage.useMutation({
        onSuccess: () => { setReplyText(''); detailQ.refetch(); refetchRequests() },
    })

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    }, [detailQ.data?.messages?.length])

    const handleSearch = (val: string) => {
        setSearch(val)
        const t = setTimeout(() => setDebouncedSearch(val), 300)
        return () => clearTimeout(t)
    }

    const pendingCount = myRequests?.filter((r: any) => r.status === 'PENDING' || r.status === 'IN_DISCUSSION').length ?? 0
    const detail = detailQ.data
    const isActive = detail?.status === 'PENDING' || detail?.status === 'IN_DISCUSSION'

    return (
        <>
            <div className="space-y-4 animate-fade-in pb-20">
                {/* Dropdown Sub-Nav */}
                <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <button onClick={() => { setActiveTab('santri'); setSelectedId(null) }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${activeTab === 'santri' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-500' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Data Santri
                    </button>
                    <button onClick={() => setActiveTab('permintaan')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${activeTab === 'permintaan' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-500' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Permintaan
                        {pendingCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{pendingCount}</span>
                        )}
                    </button>
                </div>

                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
                {success && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm">{success}</div>}

                {/* ═══ TAB: DATA SANTRI ═══ */}
                {activeTab === 'santri' && (
                    <div className="space-y-3">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Cari nama atau NIS..."
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white outline-none" />
                        </div>

                        {isLoading ? (
                            <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />)}</div>
                        ) : scopeError ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                                <p className="text-sm text-slate-500 font-medium">Gagal memuat data</p>
                                <p className="text-xs text-slate-400 mt-1">{(scopeError as any)?.message ?? 'Coba refresh halaman'}</p>
                            </div>
                        ) : !data || data.scopeType === 'NONE' ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                                <p className="text-sm text-slate-500 font-medium">Belum ada penugasan</p>
                                <p className="text-xs text-slate-400 mt-1">Hubungi admin untuk ditugaskan ke kelas atau kamar</p>
                            </div>
                        ) : data.santri.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
                                <p className="text-sm text-slate-400">Tidak ada santri ditemukan</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {data.santri.map((s: any) => (
                                    <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                                        <Link href={`/m-dashboard/santri-saya/${s.id}`} className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                            {s.fullName?.charAt(0)?.toUpperCase()}
                                        </Link>
                                        <Link href={`/m-dashboard/santri-saya/${s.id}`} className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{s.fullName}</p>
                                            <p className="text-xs text-slate-400 font-mono">{s.nis}</p>
                                        </Link>
                                        <button onClick={() => setRequestModal({ santriId: s.id, santriName: s.fullName })}
                                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 shrink-0">
                                            Request
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ TAB: PERMINTAAN ═══ */}
                {activeTab === 'permintaan' && (
                    <div className="space-y-3">
                        {selectedId && detail ? (
                            /* Chat Detail View */
                            <div className="bg-white rounded-2xl border border-slate-200 flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
                                {/* Chat Header */}
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
                                    <button onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-800 truncate">{detail.santri?.fullName}</span>
                                            <StatusBadge status={detail.status} />
                                        </div>
                                    </div>
                                </div>
                                {/* Messages */}
                                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {detail.messages?.map((msg: any) => {
                                        const isMe = msg.sender?.id === myId
                                        const isSystem = msg.message.startsWith('✅') || msg.message.startsWith('❌')
                                        if (isSystem) return (
                                            <div key={msg.id} className="flex justify-center">
                                                <div className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1 text-center">{msg.message.replace(/\*\*/g, '')}</div>
                                            </div>
                                        )
                                        return (
                                            <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-1">
                                                    <span className="text-[10px] font-bold text-teal-700">{(msg.sender?.fullName ?? '?').charAt(0)}</span>
                                                </div>
                                                <div className={`max-w-[80%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                                                    {!isMe && <span className="text-[11px] font-semibold text-slate-600">{msg.sender?.fullName}</span>}
                                                    <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${isMe ? 'bg-teal-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                                                        {msg.message}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">{fmtDate(msg.createdAt)}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                {/* Reply */}
                                {isActive && (
                                    <div className="p-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
                                        <input value={replyText} onChange={e => setReplyText(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    if (replyText.trim()) addMsgMut.mutate({ requestId: selectedId!, message: replyText.trim() })
                                                }
                                            }}
                                            placeholder="Ketik balasan... (Enter kirim)"
                                            className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                                        <button onClick={() => replyText.trim() && addMsgMut.mutate({ requestId: selectedId!, message: replyText.trim() })}
                                            disabled={!replyText.trim() || addMsgMut.isPending}
                                            className="px-3 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* List */
                            <>
                                {myRequests?.length === 0 && (
                                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                                        <p className="text-sm text-slate-500">Belum ada permintaan</p>
                                    </div>
                                )}
                                {myRequests?.map((req: any) => (
                                    <button key={req.id} onClick={() => setSelectedId(req.id)}
                                        className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-teal-200 transition">
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <span className="text-sm font-semibold text-slate-800">{req.santri?.fullName}</span>
                                            <StatusBadge status={req.status} />
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-2">{req.description}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-[10px] text-slate-400">{fmtDate(req.createdAt)}</span>
                                            <div className="flex items-center gap-1 text-slate-400">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                                <span className="text-[10px]">{req._count?.messages ?? 0}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Request Change Modal */}
            {requestModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-end justify-center" onClick={() => setRequestModal(null)}>
                    <div className="w-full max-w-lg rounded-t-3xl bg-white p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Request Perubahan Data</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Santri: <span className="font-medium">{requestModal.santriName}</span></p>
                        </div>
                        <div className="flex gap-2">
                            {([['EDIT', 'Edit Data'], ['DELETE', 'Hapus Data'], ['OTHER', 'Lainnya']] as const).map(([val, label]) => (
                                <button key={val} onClick={() => setRequestType(val)}
                                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition ${requestType === val ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <textarea value={requestDesc} onChange={e => setRequestDesc(e.target.value)} rows={4}
                            placeholder="Jelaskan perubahan yang diminta (min. 10 karakter)..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none resize-none" />
                        <div className="flex gap-3">
                            <button onClick={() => setRequestModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Batal</button>
                            <button onClick={() => { if (requestDesc.length >= 10) createRequestMut.mutate({ santriId: requestModal.santriId, type: requestType, description: requestDesc }) }}
                                disabled={requestDesc.length < 10 || createRequestMut.isPending}
                                className="flex-1 py-2.5 rounded-xl bg-violet-500 text-sm font-semibold text-white disabled:opacity-50">
                                {createRequestMut.isPending ? 'Mengirim...' : 'Kirim'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
