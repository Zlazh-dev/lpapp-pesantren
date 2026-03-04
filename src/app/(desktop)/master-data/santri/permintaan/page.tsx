'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { trpc } from '@/utils/trpc'
import { useSession } from 'next-auth/react'
import { useChatStream } from '@/hooks/useChatStream'
import { useGlobalStream } from '@/hooks/useGlobalStream'

type StatusKey = 'PENDING' | 'IN_DISCUSSION' | 'APPROVED' | 'REJECTED'

const STATUS = {
    PENDING: { label: 'Menunggu', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    IN_DISCUSSION: { label: 'Diskusi', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    APPROVED: { label: 'Disetujui', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Ditolak', color: 'bg-red-50 text-red-700 border-red-200' },
}

const DEPT: Record<string, string> = {
    perbendaharaan: 'Perbendaharaan',
    madrasah: 'Madrasah',
    other: 'Lainnya',
}

function StatusBadge({ status }: { status: string }) {
    const s = STATUS[status as StatusKey] ?? { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${s.color}`}>
            {s.label}
        </span>
    )
}

function fmtDate(d: string | Date) {
    return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function CheckSingle() {
    return <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
}
function CheckDouble({ blue }: { blue?: boolean }) {
    return (
        <span className="inline-flex items-center -space-x-1.5">
            <svg className={`w-3 h-3 ${blue ? 'text-blue-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
            <svg className={`w-3 h-3 ${blue ? 'text-blue-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
        </span>
    )
}

function ChatBubble({ msg, isMe, allReadAt }: { msg: any; isMe: boolean; allReadAt?: Date | null }) {
    const isSystem = msg.message.startsWith('✅') || msg.message.startsWith('❌')
    if (isSystem) {
        return (
            <div className="flex justify-center my-1">
                <div className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1 max-w-[90%] text-center">
                    {msg.message.replace('**', '').replace('**', '')}
                </div>
            </div>
        )
    }
    const isRead = isMe && (msg.readAt || (allReadAt && new Date(msg.createdAt) <= allReadAt))
    return (
        <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-[10px] font-bold text-emerald-700">{(msg.sender?.fullName ?? '?').charAt(0)}</span>
            </div>
            <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div className="flex items-center gap-2">
                    {!isMe && <span className="text-[11px] font-semibold text-gray-700">{msg.sender?.fullName}</span>}
                    {!isMe && msg.sender?.role && <span className="text-[10px] text-gray-400">{msg.sender.role.replace(/_/g, ' ')}</span>}
                    {isMe && <span className="text-[10px] text-gray-400">{msg.sender?.role?.replace(/_/g, ' ')}</span>}
                    {isMe && <span className="text-[11px] font-semibold text-gray-700">Saya</span>}
                </div>
                <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${isMe ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                    {msg.message}
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">{fmtDate(msg.createdAt)}</span>
                    {isMe && (isRead ? <CheckDouble blue /> : <CheckSingle />)}
                </div>
            </div>
        </div>
    )
}

export default function PermintaanPage() {
    const { data: session } = useSession()
    const myId = session?.user?.id ?? ''

    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [deptFilter, setDeptFilter] = useState<string>('all')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [extraMessages, setExtraMessages] = useState<any[]>([])
    const [allReadAt, setAllReadAt] = useState<Date | null>(null)

    const chatRef = useRef<HTMLDivElement>(null)

    const listQ = trpc.santriRequest.listAll.useQuery({
        status: statusFilter === 'all' ? undefined : statusFilter as any,
        department: deptFilter === 'all' ? undefined : deptFilter,
        search: search || undefined,
        page,
        limit: 20,
    }, { refetchInterval: 5_000 })

    const detailQ = trpc.santriRequest.getDetail.useQuery(selectedId!, {
        enabled: !!selectedId,
        refetchInterval: 5_000,
    })

    const markReadMut = trpc.santriRequest.markRead.useMutation()

    const addMsgMut = trpc.santriRequest.addMessage.useMutation({
        onSuccess: (data) => {
            setReplyText('')
            setExtraMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
            listQ.refetch()
        },
    })

    const reviewMut = trpc.santriRequest.review.useMutation({
        onSuccess: () => {
            detailQ.refetch()
            listQ.refetch()
        },
    })

    // Real-time SSE: append incoming messages immediately + refresh both list and detail
    const handleNewMessage = useCallback((msg: any) => {
        setExtraMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        listQ.refetch()
        detailQ.refetch()
    }, [])
    const handleRead = useCallback(() => { setAllReadAt(new Date()) }, [])

    useChatStream({ requestId: selectedId, onMessage: handleNewMessage, onRead: handleRead, enabled: !!selectedId })

    // Global SSE: refresh list (and detail if open) when any request updates
    useGlobalStream({
        onEvent: useCallback(() => { listQ.refetch(); detailQ.refetch() }, []),
    })

    // When opening a request: reset extras and mark messages read
    useEffect(() => {
        if (selectedId) {
            setExtraMessages([])
            setAllReadAt(null)
            markReadMut.mutate({ requestId: selectedId })
        }
    }, [selectedId])

    const detail = detailQ.data as any
    const isActive = detail?.status === 'PENDING' || detail?.status === 'IN_DISCUSSION'

    // Auto-scroll chat to bottom
    const allMessages = [...(detail?.messages ?? []), ...extraMessages.filter((m: any) => !(detail?.messages as any[])?.some((dm: any) => dm.id === m.id))]
    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    }, [allMessages.length])

    const handleSend = () => {
        if (!replyText.trim() || !selectedId) return
        addMsgMut.mutate({ requestId: selectedId, message: replyText.trim() })
    }

    const handleApprove = () => {
        if (!selectedId) return
        reviewMut.mutate({ id: selectedId, action: 'APPROVE' })
    }

    const handleReject = () => {
        if (!selectedId) return
        reviewMut.mutate({ id: selectedId, action: 'REJECT' })
    }

    return (
        <div className="flex flex-col h-[calc(100vh-120px)]">
            {/* Header */}
            <div className="mb-3 flex-shrink-0">
                <h1 className="text-sm font-bold text-gray-900">Permintaan Perubahan Data</h1>
                <p className="text-xs text-gray-500 mt-0.5">Kelola permintaan perubahan data santri dari berbagai departemen</p>
            </div>

            <div className="flex flex-1 min-h-0 gap-3">
                {/* ─── Panel Kiri: List ─── */}
                <div className="w-[360px] flex-shrink-0 bg-white rounded-lg border border-gray-200 flex flex-col">
                    {/* Search + Filter */}
                    <div className="p-3 border-b border-gray-200 space-y-2 flex-shrink-0">
                        <div className="relative">
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
                            </svg>
                            <input
                                type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                                placeholder="Cari nama atau NIS santri..."
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs outline-none focus:border-emerald-400"
                            />
                        </div>

                        {/* Quick status filter */}
                        <div className="flex items-center gap-1 flex-wrap">
                            {[
                                { key: 'all', label: 'Semua' },
                                { key: 'PENDING', label: 'Menunggu' },
                                { key: 'IN_DISCUSSION', label: 'Diskusi' },
                                { key: 'APPROVED', label: 'Disetujui' },
                                { key: 'REJECTED', label: 'Ditolak' },
                            ].map(t => (
                                <button key={t.key} onClick={() => { setStatusFilter(t.key); setPage(1) }}
                                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${statusFilter === t.key ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {t.label}
                                </button>
                            ))}
                            <button onClick={() => setShowFilters(v => !v)} className="ml-auto text-[11px] text-gray-400 hover:text-gray-600">
                                {showFilters ? '▲ Filter' : '▼ Filter'}
                            </button>
                        </div>

                        {showFilters && (
                            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs outline-none">
                                <option value="all">Semua Departemen</option>
                                <option value="perbendaharaan">Perbendaharaan</option>
                                <option value="madrasah">Madrasah</option>
                            </select>
                        )}
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                        {listQ.isLoading && (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
                            </div>
                        )}
                        {listQ.data?.data.length === 0 && !listQ.isLoading && (
                            <div className="p-8 text-center text-xs text-gray-400">Tidak ada permintaan</div>
                        )}
                        {listQ.data?.data.map((req: any) => (
                            <button key={req.id} onClick={() => setSelectedId(req.id)}
                                className={`w-full p-3 text-left transition hover:bg-gray-50 ${selectedId === req.id ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''}`}>
                                <div className="flex items-start justify-between gap-1 mb-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-xs font-semibold text-gray-900 truncate">{req.santri?.fullName ?? '-'}</span>
                                        <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">{req.santri?.nis}</span>
                                    </div>
                                    <StatusBadge status={req.status} />
                                </div>

                                {req.changeField && (
                                    <div className="flex items-center gap-1 mb-1">
                                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{req.changeField}</span>
                                        {req.currentValue && req.requestedValue && (
                                            <span className="text-[10px] text-gray-400 truncate">
                                                {req.currentValue} → <span className="text-emerald-600">{req.requestedValue}</span>
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-1">
                                    <div className="flex items-center gap-1.5">
                                        {req.department && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{DEPT[req.department] ?? req.department}</span>}
                                        <span className="text-[10px] text-gray-400">{req.requesterName}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-400">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                        <span className="text-[10px]">{req._count?.messages ?? 0}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Pagination */}
                    {listQ.data && listQ.data.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 p-2 border-t border-gray-200 flex-shrink-0">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                className="px-2 py-1 rounded border text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40">←</button>
                            <span className="text-xs text-gray-500">{page} / {listQ.data.totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(listQ.data.totalPages, p + 1))} disabled={page >= listQ.data.totalPages}
                                className="px-2 py-1 rounded border text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40">→</button>
                        </div>
                    )}
                </div>

                {/* ─── Panel Kanan: Detail + Chat ─── */}
                <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col min-w-0">
                    {!selectedId ? (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <p className="text-sm">Pilih permintaan untuk melihat detail & percakapan</p>
                            </div>
                        </div>
                    ) : detailQ.isLoading ? (
                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Memuat...</div>
                    ) : detail ? (
                        <>
                            {/* Header info perubahan */}
                            <div className="p-4 border-b border-gray-200 flex-shrink-0">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-bold text-gray-900">{detail.santri?.fullName}</span>
                                            <span className="text-xs text-gray-400 font-mono">{detail.santri?.nis}</span>
                                            <StatusBadge status={detail.status} />
                                        </div>
                                        {detail.department && (
                                            <span className="text-[11px] text-gray-500">{DEPT[detail.department] ?? detail.department}</span>
                                        )}
                                    </div>
                                    <button onClick={() => setSelectedId(null)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                {/* Change detail box */}
                                {(detail.changeField || detail.currentValue || detail.requestedValue) && (
                                    <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-3 text-xs">
                                        {detail.changeField && (
                                            <div>
                                                <p className="text-gray-500 mb-0.5">Jenis Perubahan</p>
                                                <p className="font-semibold text-gray-900">{detail.changeField}</p>
                                            </div>
                                        )}
                                        {detail.currentValue && (
                                            <div>
                                                <p className="text-gray-500 mb-0.5">Nilai Saat Ini</p>
                                                <p className="font-mono text-gray-700 bg-white rounded px-1.5 py-0.5 border border-gray-200 break-all">{detail.currentValue}</p>
                                            </div>
                                        )}
                                        {detail.requestedValue && (
                                            <div>
                                                <p className="text-gray-500 mb-0.5">Nilai Diminta</p>
                                                <p className="font-mono text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 border border-emerald-200 break-all">{detail.requestedValue}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Chat thread */}
                            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                                {allMessages.map((msg: any) => (
                                    <ChatBubble key={msg.id} msg={msg} isMe={msg.sender?.id === myId} allReadAt={allReadAt} />
                                ))}
                            </div>

                            {/* Reply box */}
                            <div className="p-3 border-t border-gray-200 flex-shrink-0">
                                {isActive ? (
                                    <div className="space-y-2">
                                        <textarea
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleSend()
                                                }
                                            }}
                                            placeholder="Ketik balasan... (Enter untuk kirim, Ctrl+Enter baris baru)"
                                            rows={2}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-400 resize-none"
                                        />
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex gap-2">
                                                {(detail.status === 'PENDING' || detail.status === 'IN_DISCUSSION') && (
                                                    <>
                                                        <button onClick={handleReject} disabled={reviewMut.isPending}
                                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            Tolak
                                                        </button>
                                                        <button onClick={handleApprove} disabled={reviewMut.isPending}
                                                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                            Setujui
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            <button onClick={handleSend} disabled={!replyText.trim() || addMsgMut.isPending}
                                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                Kirim
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-xs text-gray-400 py-2">
                                        Permintaan ini sudah <StatusBadge status={detail.status} />
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
