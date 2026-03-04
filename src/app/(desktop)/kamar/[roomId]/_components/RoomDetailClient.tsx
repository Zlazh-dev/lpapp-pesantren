'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { trpc } from '@/utils/trpc'
import Link from 'next/link'

export default function RoomDetailClient({ roomIdProp }: { roomIdProp: string }) {
    const numericRoomId = parseInt(roomIdProp, 10)

    const { data: detail, isLoading } = trpc.dorm.room.getDetail.useQuery(numericRoomId, { enabled: !isNaN(numericRoomId) })
    const utils = trpc.useUtils()

    const [success, setSuccess] = useState('')
    const [alertMsg, setAlertMsg] = useState('')

    // Bulk assign state
    const [basketSearch, setBasketSearch] = useState('')
    const [basket, setBasket] = useState<{ id: string; fullName: string; nis: string }[]>([])
    const [bulkMode, setBulkMode] = useState<'REPLACE' | 'ONLY_EMPTY'>('REPLACE')
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [bulkSummary, setBulkSummary] = useState<any>(null)

    // Checkbox for existing penghuni (bulk remove)
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [showBulkRemoveConfirm, setShowBulkRemoveConfirm] = useState(false)
    const [removingTarget, setRemovingTarget] = useState<any>(null)

    // Edit Kamar state
    const [showEditModal, setShowEditModal] = useState(false)
    const [editName, setEditName] = useState('')
    const [editCode, setEditCode] = useState('')
    const [editCapacity, setEditCapacity] = useState('')
    const editNameRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (showEditModal && detail) {
            setEditName(detail.name ?? '')
            setEditCode(detail.code ?? '')
            setEditCapacity(String(detail.capacity ?? ''))
            setTimeout(() => editNameRef.current?.focus(), 50)
        }
    }, [showEditModal, detail])

    const { data: basketResult } = trpc.santri.search.useQuery(
        { q: basketSearch, limit: 20 },
        { enabled: basketSearch.length >= 2 }
    )

    const invalidateAll = () => {
        utils.dorm.room.getDetail.invalidate(numericRoomId)
        utils.dorm.room.list.invalidate()
    }

    const removeMut = trpc.dorm.assignment.remove.useMutation({
        onSuccess: () => { invalidateAll(); showMsg('Santri dikeluarkan') },
    })
    const bulkAssignMut = trpc.santri.bulkAssignToDormRoom.useMutation({
        onSuccess: (data: any) => {
            invalidateAll()
            setBulkSummary(data)
            setBasket([])
            setShowBulkModal(false)
        },
        onError: (e: any) => {
            setAlertMsg(e.message || 'Gagal assign santri')
            setShowBulkModal(false)
        },
    })
    const updateRoomMut = trpc.dorm.room.update.useMutation({
        onSuccess: () => {
            invalidateAll()
            setShowEditModal(false)
            showMsg('Data kamar berhasil diperbarui')
        },
        onError: (e: any) => {
            setAlertMsg(e.message || 'Gagal memperbarui kamar')
        },
    })

    // Bulk remove
    const [bulkRemoving, setBulkRemoving] = useState(false)
    const handleBulkRemove = async () => {
        setShowBulkRemoveConfirm(false)
        setBulkRemoving(true)
        const count = selected.size
        try {
            for (const santriId of selected) {
                await removeMut.mutateAsync({ santriId })
            }
            setSelected(new Set())
            invalidateAll()
            showMsg(`${count} santri berhasil dikeluarkan`)
        } catch { setAlertMsg('Gagal mengeluarkan sebagian santri') }
        finally { setBulkRemoving(false) }
    }

    const showMsg = (msg: string) => { setSuccess(msg); setAlertMsg(''); setBulkSummary(null); setTimeout(() => setSuccess(''), 4000) }

    const addToBasket = (s: { id: string; fullName: string; nis: string }) => {
        if (!basket.find(b => b.id === s.id)) setBasket([...basket, s])
    }
    const removeFromBasket = (id: string) => setBasket(basket.filter(b => b.id !== id))

    const toggleSelect = (id: string) => {
        const next = new Set(selected)
        next.has(id) ? next.delete(id) : next.add(id)
        setSelected(next)
    }
    const toggleSelectAll = () => {
        if (!detail?.assignments) return
        if (selected.size === detail.assignments.length) setSelected(new Set())
        else setSelected(new Set(detail.assignments.map((a: any) => a.santri.id)))
    }

    const handleSaveEdit = () => {
        if (!editName.trim()) return
        const cap = parseInt(editCapacity, 10)
        updateRoomMut.mutate({
            id: numericRoomId,
            name: editName.trim(),
            code: editCode.trim() || undefined,
            capacity: isNaN(cap) ? undefined : cap,
        })
    }

    if (isLoading || isNaN(numericRoomId)) {
        return (
            <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-40" />
                <div className="bg-white rounded-lg border border-gray-200 h-96" />
            </div>
        )
    }

    if (!detail) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 px-6 py-20 text-center">
                <p className="text-sm font-medium text-gray-500 mb-2">Kamar tidak ditemukan</p>
                <Link href="/kamar" className="text-teal-600 hover:underline text-xs">← Kembali ke Data Kamar</Link>
            </div>
        )
    }

    const occupancy = detail.assignments?.length ?? 0
    const pct = detail.capacity ? Math.min(100, (occupancy / detail.capacity) * 100) : 0
    const availableSlots = detail.capacity - occupancy

    const reasonLabel: Record<string, string> = {
        ALREADY_IN_TARGET: 'Sudah di kamar ini',
        HAS_ROOM: 'Sudah punya kamar lain',
        NOT_FOUND: 'Tidak ditemukan',
        CAPACITY_FULL: 'Kapasitas penuh',
    }

    return (
        <>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                <Link href="/kamar" className="hover:text-teal-600 transition-colors">Data Kamar</Link>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <span className="text-gray-700 font-medium">{detail.name}</span>
            </nav>

            {/* Alerts */}
            {success && <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-medium">{success}</div>}
            {alertMsg && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">{alertMsg}</div>}

            {/* Bulk Summary */}
            {bulkSummary && (
                <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold text-blue-800">Hasil Bulk Assign</p>
                        <button onClick={() => setBulkSummary(null)} className="text-blue-400 hover:text-blue-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <p className="text-blue-700">
                        <svg className="w-3.5 h-3.5 inline mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {bulkSummary.assignedCount} santri berhasil ditempatkan
                    </p>
                    {bulkSummary.skippedCount > 0 && (
                        <div>
                            <p className="text-amber-700">
                                <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                {bulkSummary.skippedCount} santri dilewati:
                            </p>
                            <ul className="ml-4 text-amber-600 text-[10px] mt-1 space-y-0.5">
                                {bulkSummary.skipped.slice(0, 10).map((s: any, i: number) => (
                                    <li key={i}>• {s.id.slice(0, 8)}... — {reasonLabel[s.reason] ?? s.reason}</li>
                                ))}
                                {bulkSummary.skipped.length > 10 && <li>...dan {bulkSummary.skipped.length - 10} lainnya</li>}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Panel */}
                <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Link href="/kamar" className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded flex items-center justify-center transition">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </Link>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900">Kamar {detail.name}</h2>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {detail.floor?.building?.complex?.name} • {detail.floor?.building?.name} • Lantai {detail.floor?.number}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Occupancy bar */}
                                <div className="text-right mr-1">
                                    <div className="flex items-center justify-end gap-1.5 mb-1">
                                        <span className="text-xs font-semibold text-gray-700">{occupancy}/{detail.capacity}</span>
                                        <span className="text-[10px] text-gray-400">({availableSlots > 0 ? `${availableSlots} tersedia` : 'Penuh'})</span>
                                    </div>
                                    <div className="w-28 bg-gray-100 rounded-full h-1.5">
                                        <div className={`rounded-full h-1.5 transition-all ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-teal-500'}`}
                                            style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                                {/* Edit button */}
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs font-semibold flex items-center gap-1.5 transition"
                                    title="Edit Kamar"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Edit
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table header with bulk remove button */}
                    <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Penghuni Aktif</span>
                            {selected.size > 0 && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-semibold">{selected.size} dipilih</span>
                            )}
                        </div>
                        {selected.size > 0 && (
                            <button
                                onClick={() => setShowBulkRemoveConfirm(true)}
                                disabled={bulkRemoving}
                                className="px-2.5 py-1 rounded text-[10px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-50 flex items-center gap-1 transition"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                {bulkRemoving ? 'Memproses...' : `Keluarkan ${selected.size}`}
                            </button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        {occupancy === 0 ? (
                            <div className="px-4 py-16 text-center">
                                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                <p className="text-sm text-gray-400 font-medium">Belum ada penghuni</p>
                                <p className="text-xs text-gray-300 mt-1">Gunakan Bulk Assign untuk menambahkan santri.</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-2.5 text-left w-8">
                                            <input type="checkbox" checked={selected.size === occupancy && occupancy > 0}
                                                onChange={toggleSelectAll} className="rounded border-gray-300 w-3.5 h-3.5" />
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-10">No</th>
                                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama</th>
                                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">NIS</th>
                                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">L/P</th>
                                        <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {detail.assignments.map((a: any, i: number) => (
                                        <tr key={a.id} className={`hover:bg-gray-50/80 transition group ${selected.has(a.santri.id) ? 'bg-blue-50/50' : ''}`}>
                                            <td className="px-4 py-2.5">
                                                <input type="checkbox" checked={selected.has(a.santri.id)} onChange={() => toggleSelect(a.santri.id)} className="rounded border-gray-300 w-3.5 h-3.5" />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className="text-[11px] text-gray-400">{i + 1}</span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <Link href={`/santri/${a.santri.id}`} className="text-xs font-semibold text-gray-900 hover:text-teal-600 transition truncate max-w-[200px] block">{a.santri.fullName}</Link>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className="text-xs font-mono text-gray-600">{a.santri.nis}</span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${a.santri.gender === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                                    {a.santri.gender === 'L' ? 'L' : 'P'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center">
                                                    <button
                                                        onClick={() => setRemovingTarget(a.santri)}
                                                        className="w-7 h-7 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                                                        disabled={removeMut.isPending}
                                                        title="Keluarkan"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Sidebar — Bulk Assign */}
                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-teal-50 flex items-center justify-center shrink-0">
                                <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            </span>
                            <div>
                                <h3 className="text-xs font-bold text-gray-900">Bulk Assign ke Kamar Ini</h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                    Kapasitas: {occupancy}/{detail.capacity} •{' '}
                                    <strong className={availableSlots <= 0 ? 'text-red-500' : 'text-teal-600'}>
                                        {availableSlots > 0 ? `${availableSlots} slot tersedia` : 'Penuh'}
                                    </strong>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                value={basketSearch}
                                onChange={e => setBasketSearch(e.target.value)}
                                placeholder="Cari santri untuk ditambahkan..."
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded text-xs text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                            />
                        </div>

                        {basketSearch.length >= 2 && basketResult && basketResult.length > 0 && (
                            <div className="space-y-0.5 max-h-40 overflow-y-auto border border-gray-100 rounded-lg">
                                {basketResult.filter((s: any) => !basket.find(b => b.id === s.id)).map((s: any) => (
                                    <button key={s.id} onClick={() => addToBasket(s)}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-teal-50 text-left text-xs transition">
                                        <svg className="w-3.5 h-3.5 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        <span className="font-medium text-gray-700 truncate">{s.fullName}</span>
                                        <span className="text-[10px] text-gray-400 shrink-0">{s.nis}</span>
                                        {s.dormRoomId && (
                                            <span className="shrink-0">
                                                <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {basket.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-semibold text-gray-500 uppercase">{basket.length} santri dipilih:</p>
                                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                    {basket.map(s => (
                                        <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-medium">
                                            {s.fullName}
                                            <button onClick={() => removeFromBasket(s.id)} className="text-teal-400 hover:text-teal-600 ml-0.5">
                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowBulkModal(true)}
                                    className="w-full px-3 py-2 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Assign {basket.length} Santri
                                </button>
                            </div>
                        )}

                        {basket.length === 0 && basketSearch.length < 2 && (
                            <p className="text-[10px] text-gray-400 text-center py-4">Ketik minimal 2 karakter untuk mencari santri</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Kamar Modal */}
            {showEditModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </div>
                                <h2 className="text-sm font-bold text-gray-900">Edit Kamar</h2>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama Kamar <span className="text-red-500">*</span></label>
                                <input
                                    ref={editNameRef}
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
                                    placeholder="cth. A1, Madinah, dsb."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kode Kamar <span className="text-gray-400 font-normal">(opsional)</span></label>
                                <input
                                    type="text"
                                    value={editCode}
                                    onChange={e => setEditCode(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
                                    placeholder="cth. KMR-001"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kapasitas</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={editCapacity}
                                    onChange={e => setEditCapacity(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
                                    placeholder="Jumlah maksimal penghuni"
                                />
                                {parseInt(editCapacity) < occupancy && (
                                    <p className="mt-1 text-[10px] text-amber-600">
                                        <svg className="w-3 h-3 inline mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                        Kapasitas lebih kecil dari jumlah penghuni saat ini ({occupancy})
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
                            <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={updateRoomMut.isPending || !editName.trim()}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {updateRoomMut.isPending ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        Menyimpan...
                                    </>
                                ) : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Bulk Assign Modal */}
            {showBulkModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4" onClick={() => setShowBulkModal(false)}>
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-sm font-bold text-gray-900">Bulk Assign ke Kamar {detail.name}</h2>
                        <p className="text-xs text-gray-500">
                            Akan menempatkan <strong className="text-gray-800">{basket.length} santri</strong>.
                            Slot tersedia: <strong className={availableSlots <= 0 ? 'text-red-500' : 'text-teal-600'}>{availableSlots}</strong>
                        </p>
                        {basket.length > availableSlots && availableSlots > 0 && (
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-start gap-1.5">
                                <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                Hanya {availableSlots} dari {basket.length} santri yang akan di-assign, sisanya akan di-skip (CAPACITY_FULL).
                            </p>
                        )}
                        {availableSlots <= 0 && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg flex items-start gap-1.5">
                                <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Kamar sudah penuh, semua akan di-skip. Gunakan mode Replace untuk memindahkan santri lain keluar terlebih dahulu.
                            </p>
                        )}
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Mode</p>
                            <label className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                                <input type="radio" name="mode" checked={bulkMode === 'REPLACE'} onChange={() => setBulkMode('REPLACE')} />
                                <div>
                                    <p className="text-xs font-medium text-gray-700">Replace (Pindahkan)</p>
                                    <p className="text-[10px] text-gray-400">Pindahkan santri walaupun sudah punya kamar lain</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                                <input type="radio" name="mode" checked={bulkMode === 'ONLY_EMPTY'} onChange={() => setBulkMode('ONLY_EMPTY')} />
                                <div>
                                    <p className="text-xs font-medium text-gray-700">Only Empty</p>
                                    <p className="text-[10px] text-gray-400">Hanya santri yang belum punya kamar</p>
                                </div>
                            </label>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setShowBulkModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200 transition">Batal</button>
                            <button
                                onClick={() => bulkAssignMut.mutate({ roomId: numericRoomId, santriIds: basket.map(b => b.id), mode: bulkMode })}
                                disabled={bulkAssignMut.isPending}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition disabled:opacity-50"
                            >
                                {bulkAssignMut.isPending ? 'Memproses...' : 'Konfirmasi'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Bulk Remove Confirmation Modal */}
            {showBulkRemoveConfirm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBulkRemoveConfirm(false)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">Keluarkan {selected.size} Santri?</h3>
                            <p className="text-sm text-gray-500 mt-1">{selected.size} santri akan dikeluarkan dari kamar ini.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowBulkRemoveConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={handleBulkRemove} className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600 transition shadow-md shadow-amber-500/20">Ya, Keluarkan</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Individual Remove Confirmation Modal */}
            {removingTarget && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setRemovingTarget(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">Keluarkan Santri?</h3>
                            <p className="text-sm text-gray-500 mt-1">Santri <strong>&quot;{removingTarget.fullName}&quot;</strong> akan dikeluarkan dari kamar ini.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setRemovingTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={() => { removeMut.mutate({ santriId: removingTarget.id }); setRemovingTarget(null) }} className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600 transition shadow-md shadow-amber-500/20">Ya, Keluarkan</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
