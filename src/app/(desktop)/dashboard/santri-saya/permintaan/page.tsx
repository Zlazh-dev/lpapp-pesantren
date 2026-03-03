'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { trpc } from '@/utils/trpc'
import { useSession } from 'next-auth/react'
import { useChatStream } from '@/hooks/useChatStream'
import { useGlobalStream } from '@/hooks/useGlobalStream'

type StatusKey = 'PENDING' | 'IN_DISCUSSION' | 'APPROVED' | 'REJECTED'

const STATUS: Record<StatusKey, { label: string; color: string }> = {
    PENDING: { label: 'Menunggu', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    IN_DISCUSSION: { label: 'Diskusi', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    APPROVED: { label: 'Disetujui', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Ditolak', color: 'bg-red-50 text-red-700 border-red-200' },
}

function StatusBadge({ status }: { status: string }) {
    const s = STATUS[status as StatusKey] ?? { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${s.color}`}>{s.label}</span>
    )
}

function fmtDate(d: string | Date) {
    return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Checkmark icon components
function CheckSingle({ blue }: { blue?: boolean }) {
    return <svg className={`w-3 h-3 ${blue ? 'text-blue-400' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
}
function CheckDouble({ blue }: { blue?: boolean }) {
    return (
        <span className="inline-flex items-center -space-x-1.5">
            <svg className={`w-3 h-3 ${blue ? 'text-blue-400' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
            <svg className={`w-3 h-3 ${blue ? 'text-blue-400' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
        </span>
    )
}

function ChatBubble({ msg, isMe, allReadAt }: { msg: any; isMe: boolean; allReadAt?: Date | null }) {
    const isSystem = msg.message.startsWith('✅') || msg.message.startsWith('❌')
    if (isSystem) {
        return (
            <div className="flex justify-center my-1">
                <div className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1 max-w-[90%] text-center">
                    {msg.message.replace(/\*\*/g, '')}
                </div>
            </div>
        )
    }

    // Read status for my messages:
    // ✓ = in state (optimistic / just sent, readAt not set yet from server)
    // ✓✓ gray = server confirmed, but not yet read by recipient
    // ✓✓ blue = recipient has read (readAt set, or allReadAt event received)
    const isRead = isMe && (msg.readAt || (allReadAt && new Date(msg.createdAt) <= allReadAt))

    return (
        <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-[10px] font-bold text-teal-700">{(msg.sender?.fullName ?? '?').charAt(0)}</span>
            </div>
            <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2">
                    {!isMe && <span className="text-[11px] font-semibold text-slate-700">{msg.sender?.fullName}</span>}
                    {!isMe && msg.sender?.role && <span className="text-[10px] text-slate-400">{msg.sender.role.replace(/_/g, ' ')}</span>}
                    {isMe && <span className="text-[11px] font-semibold text-slate-700">Saya</span>}
                </div>
                <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${isMe ? 'bg-teal-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                    {msg.message}
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">{fmtDate(msg.createdAt)}</span>
                    {isMe && (isRead ? <CheckDouble blue /> : <CheckSingle />)}
                </div>
            </div>
        </div>
    )
}

export default function SantriSayaPermintaanPage() {
    const { data: session } = useSession()
    const myId = session?.user?.id ?? ''

    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('active')
    const [extraMessages, setExtraMessages] = useState<any[]>([])
    const [allReadAt, setAllReadAt] = useState<Date | null>(null) // tracks when recipient read our msgs
    const chatRef = useRef<HTMLDivElement>(null)

    const myRequestsQ = trpc.santriRequest.myRequests.useQuery(undefined, { refetchInterval: 60_000 })
    const detailQ = trpc.santriRequest.getDetail.useQuery(selectedId!, { enabled: !!selectedId, refetchInterval: 60_000 })

    const markReadMut = trpc.santriRequest.markRead.useMutation()

    const addMsgMut = trpc.santriRequest.addMessage.useMutation({
        onSuccess: (data) => {
            setReplyText('')
            // Immediately add sent message to display
            setExtraMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
            myRequestsQ.refetch()
        },
    })

    // Real-time: append incoming messages immediately
    const handleNewMsg = useCallback((msg: any) => {
        setExtraMessages((prev: any[]) => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        myRequestsQ.refetch()
    }, [])
    const handleRead = useCallback(() => { setAllReadAt(new Date()) }, [])
    useChatStream({ requestId: selectedId, onMessage: handleNewMsg, onRead: handleRead, enabled: !!selectedId })
    useGlobalStream({ onEvent: useCallback(() => { myRequestsQ.refetch() }, []) })

    // When user opens a request: mark messages as read
    useEffect(() => {
        if (selectedId) {
            setExtraMessages([])
            setAllReadAt(null)
            markReadMut.mutate({ requestId: selectedId })
        }
    }, [selectedId])

    const allRequests = myRequestsQ.data ?? []
    const filteredRequests = statusFilter === 'active'
        ? allRequests.filter((r: any) => r.status === 'PENDING' || r.status === 'IN_DISCUSSION')
        : statusFilter === 'done'
            ? allRequests.filter((r: any) => r.status === 'APPROVED' || r.status === 'REJECTED')
            : allRequests

    const detail = detailQ.data as any
    const isActive = detail?.status === 'PENDING' || detail?.status === 'IN_DISCUSSION'
    const allMessages = [...(detail?.messages ?? []), ...extraMessages.filter((m: any) => !(detail?.messages as any[])?.some((dm: any) => dm.id === m.id))]

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    }, [allMessages.length])

    return (
        <div className="flex flex-col gap-4 h-[calc(100vh-160px)] animate-fade-in">
            <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-slate-800">Permintaan Saya</h1>
                <p className="text-sm text-slate-400 mt-0.5">Pantau status dan balas permintaan perubahan data yang kamu kirim</p>
            </div>

            <div className="grid grid-cols-[300px_1fr] gap-4 flex-1 min-h-0 overflow-hidden">
                {/* List panel */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
                    {/* Filter tabs */}
                    <div className="flex border-b border-slate-100 flex-shrink-0">
                        {[
                            { key: 'active', label: 'Aktif' },
                            { key: 'done', label: 'Selesai' },
                            { key: 'all', label: 'Semua' },
                        ].map(t => (
                            <button key={t.key} onClick={() => setStatusFilter(t.key)}
                                className={`flex-1 py-2.5 text-xs font-semibold transition-all ${statusFilter === t.key ? 'text-teal-700 border-b-2 border-teal-500' : 'text-slate-500 hover:text-slate-700'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                        {myRequestsQ.isLoading && <div className="p-4 text-center text-xs text-slate-400">Memuat...</div>}
                        {filteredRequests.length === 0 && !myRequestsQ.isLoading && (
                            <div className="p-6 text-center text-xs text-slate-400">Belum ada permintaan</div>
                        )}
                        {filteredRequests.map((req: any) => (
                            <button key={req.id} onClick={() => setSelectedId(req.id)}
                                className={`w-full p-3 text-left hover:bg-slate-50 transition ${selectedId === req.id ? 'bg-teal-50 border-l-2 border-teal-500' : ''}`}>
                                <div className="flex items-start justify-between gap-1 mb-1">
                                    <span className="text-xs font-semibold text-slate-800 truncate flex-1">{req.santri?.fullName ?? '-'}</span>
                                    <StatusBadge status={req.status} />
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-2">{req.description}</p>
                                <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[10px] text-slate-400">{fmtDate(req.createdAt)}</span>
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                        <span className="text-[10px]">{req._count?.messages ?? 0}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat panel */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
                    {!selectedId ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            <div className="text-center">
                                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <p className="text-sm">Pilih permintaan untuk melihat percakapan</p>
                            </div>
                        </div>
                    ) : detailQ.isLoading ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Memuat...</div>
                    ) : detail ? (
                        <>
                            {/* Header */}
                            <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-800">{detail.santri?.fullName}</span>
                                            <StatusBadge status={detail.status} />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{detail.type === 'EDIT' ? 'Edit Data' : detail.type === 'DELETE' ? 'Hapus Data' : 'Lainnya'}</p>
                                    </div>
                                    <button onClick={() => setSelectedId(null)} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Thread */}
                            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                                {allMessages?.map((msg: any) => (
                                    <ChatBubble key={msg.id} msg={msg} isMe={msg.sender?.id === myId} allReadAt={allReadAt} />
                                ))}
                                {!isActive && detail.messages?.length === 0 && (
                                    <div className="text-center text-xs text-slate-400 py-4">Tidak ada pesan</div>
                                )}
                            </div>

                            {/* Reply */}
                            {isActive ? (
                                <div className="p-3 border-t border-slate-100 flex-shrink-0 space-y-2">
                                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                                                e.preventDefault()
                                                if (replyText.trim()) addMsgMut.mutate({ requestId: selectedId!, message: replyText.trim() })
                                            }
                                        }}
                                        placeholder="Ketik balasan... (Enter untuk kirim, Ctrl+Enter baris baru)" rows={2}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-400 resize-none" />
                                    <div className="flex justify-end">
                                        <button onClick={() => replyText.trim() && addMsgMut.mutate({ requestId: selectedId!, message: replyText.trim() })}
                                            disabled={!replyText.trim() || addMsgMut.isPending}
                                            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                            Kirim
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
                                    <p className="text-xs text-slate-400">Permintaan ini sudah <StatusBadge status={detail.status} /></p>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
