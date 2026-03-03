'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { trpc } from '@/utils/trpc'
import Link from 'next/link'

type SelectedSantri = { id: string; fullName: string; nis: string }

export default function RoomDetailClient({ roomIdProp }: { roomIdProp: string }) {
    const numericRoomId = parseInt(roomIdProp, 10)

    const { data: detail, isLoading } = trpc.dorm.room.getDetail.useQuery(numericRoomId, { enabled: !isNaN(numericRoomId) })
    const utils = trpc.useUtils()

    const [searchSingle, setSearchSingle] = useState('')
    const [success, setSuccess] = useState('')
    const [alertMsg, setAlertMsg] = useState('')

    const { data: singleResult } = trpc.santri.list.useQuery(
        { search: searchSingle, limit: 20 },
        { enabled: searchSingle.length >= 2 }
    )
    const singleFiltered = singleResult?.data?.filter((s: any) =>
        !detail?.assignments?.some((a: any) => a.santriId === s.id)
    )?.slice(0, 10)

    // Bulk assign state
    const [basketSearch, setBasketSearch] = useState('')
    const [basket, setBasket] = useState<SelectedSantri[]>([])
    const [bulkMode, setBulkMode] = useState<'REPLACE' | 'ONLY_EMPTY'>('REPLACE')
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [bulkSummary, setBulkSummary] = useState<any>(null)

    // Checkbox for existing penghuni (bulk remove)
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [showBulkRemoveConfirm, setShowBulkRemoveConfirm] = useState(false)
    const [removingTarget, setRemovingTarget] = useState<any>(null)

    const { data: basketResult } = trpc.santri.search.useQuery(
        { q: basketSearch, limit: 20 },
        { enabled: basketSearch.length >= 2 }
    )

    const invalidateAll = () => {
        utils.dorm.room.getDetail.invalidate(numericRoomId)
        utils.dorm.room.list.invalidate()
    }

    const assignMut = trpc.dorm.assignment.assign.useMutation({
        onSuccess: () => { invalidateAll(); setSearchSingle(''); showMsg('Santri ditempatkan') },
    })
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
    // Bulk remove: for each selected, call remove assignment
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

    const addToBasket = (s: SelectedSantri) => {
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

    if (isLoading || isNaN(numericRoomId)) {
        return (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                <div className="h-5 bg-slate-100 animate-pulse rounded w-40" />
                <div className="h-8 bg-slate-100 animate-pulse rounded-xl w-48" />
                <div className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
            </div>
        )
    }

    if (!detail) {
        return (
            <div className="text-center py-20 text-slate-400">
                <p className="text-lg font-medium mb-2">Kamar tidak ditemukan</p>
                <Link href="/kamar" className="text-teal-600 hover:underline text-sm">← Kembali ke Data Kamar</Link>
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
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-slate-400">
                    <Link href="/kamar" className="hover:text-teal-600 transition-colors">Data Kamar</Link>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    <span className="text-slate-700 font-medium">{detail.name}</span>
                </nav>

                {/* Header */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/kamar" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Kamar {detail.name}</h1>
                                <p className="text-slate-500 mt-0.5">
                                    {detail.floor?.building?.complex?.name} • {detail.floor?.building?.name} • Lantai {detail.floor?.number}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-slate-700">{occupancy}/{detail.capacity}</span>
                                    <span className="text-xs text-slate-400">({availableSlots > 0 ? `${availableSlots} tersedia` : 'Penuh'})</span>
                                </div>
                                <div className="w-36 bg-slate-100 rounded-full h-2.5">
                                    <div className={`rounded-full h-2.5 transition-all ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-teal-500'}`}
                                        style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                {success && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm">{success}</div>}
                {alertMsg && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{alertMsg}</div>}

                {/* Bulk Summary */}
                {bulkSummary && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm space-y-2">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-blue-800">Hasil Bulk Assign</p>
                            <button onClick={() => setBulkSummary(null)} className="text-blue-400 hover:text-blue-600">✕</button>
                        </div>
                        <p className="text-blue-700">✅ {bulkSummary.assignedCount} santri berhasil ditempatkan</p>
                        {bulkSummary.skippedCount > 0 && (
                            <div>
                                <p className="text-amber-700">⚠ {bulkSummary.skippedCount} santri dilewati:</p>
                                <ul className="ml-4 text-amber-600 text-xs mt-1 space-y-0.5">
                                    {bulkSummary.skipped.slice(0, 10).map((s: any, i: number) => (
                                        <li key={i}>• {s.id.slice(0, 8)}... — {reasonLabel[s.reason] ?? s.reason}</li>
                                    ))}
                                    {bulkSummary.skipped.length > 10 && <li>...dan {bulkSummary.skipped.length - 10} lainnya</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main: Table */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-slate-800">Penghuni Aktif</h3>
                                    {selected.size > 0 && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs font-semibold">{selected.size} dipilih</span>
                                    )}
                                </div>
                                {selected.size > 0 && (
                                    <button onClick={() => setShowBulkRemoveConfirm(true)}
                                        disabled={bulkRemoving}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50">
                                        {bulkRemoving ? 'Memproses...' : `Keluarkan ${selected.size} santri`}
                                    </button>
                                )}
                            </div>
                            {occupancy === 0 ? (
                                <div className="px-6 py-12 text-center text-slate-400">
                                    <p className="font-medium">Belum ada penghuni</p>
                                    <p className="text-sm mt-1">Gunakan pencarian di samping atau Bulk Assign.</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-4 py-3 text-left">
                                                <input type="checkbox" checked={selected.size === occupancy && occupancy > 0}
                                                    onChange={toggleSelectAll} className="rounded border-slate-300" />
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">No</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nama</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">NIS</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">L/P</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {detail.assignments.map((a: any, i: number) => (
                                            <tr key={a.id} className={`hover:bg-slate-50 transition-colors ${selected.has(a.santri.id) ? 'bg-blue-50/50' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <input type="checkbox" checked={selected.has(a.santri.id)} onChange={() => toggleSelect(a.santri.id)} className="rounded border-slate-300" />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                                                <td className="px-4 py-3">
                                                    <Link href={`/santri/${a.santri.id}`} className="text-sm font-medium text-slate-800 hover:text-teal-600">{a.santri.fullName}</Link>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 font-mono">{a.santri.nis}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{a.santri.gender === 'L' ? 'L' : 'P'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => setRemovingTarget(a.santri)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100" disabled={removeMut.isPending}>
                                                        Keluarkan
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Single assign */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
                            <h3 className="font-semibold text-slate-800 text-sm">➕ Tempatkan Santri (Satuan)</h3>
                            <input type="text" value={searchSingle} onChange={e => setSearchSingle(e.target.value)}
                                placeholder="Cari nama / NIS..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50" />
                            {searchSingle.length >= 2 && singleFiltered && singleFiltered.length > 0 && (
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {singleFiltered.map((s: any) => (
                                        <button key={s.id} onClick={() => assignMut.mutate({ santriId: s.id, roomId: numericRoomId })}
                                            disabled={assignMut.isPending}
                                            className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-teal-50 text-left text-sm disabled:opacity-50">
                                            <span className="font-medium text-slate-700 truncate">{s.fullName}</span>
                                            <span className="text-xs text-slate-400 shrink-0">{s.nis}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bulk assign basket */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
                            <h3 className="font-semibold text-slate-800 text-sm">📦 Bulk Assign ke Kamar Ini</h3>
                            <div className="text-xs text-slate-400">
                                Kapasitas: {occupancy}/{detail.capacity} • <strong className={availableSlots <= 0 ? 'text-red-500' : 'text-teal-600'}>{availableSlots > 0 ? `${availableSlots} slot tersedia` : 'Penuh'}</strong>
                            </div>
                            <input type="text" value={basketSearch} onChange={e => setBasketSearch(e.target.value)}
                                placeholder="Cari santri untuk ditambahkan..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50" />

                            {basketSearch.length >= 2 && basketResult && basketResult.length > 0 && (
                                <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-1">
                                    {basketResult.filter((s: any) => !basket.find(b => b.id === s.id)).map((s: any) => (
                                        <button key={s.id} onClick={() => addToBasket(s)}
                                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-teal-50 text-left text-sm">
                                            <span className="text-teal-500 shrink-0">+</span>
                                            <span className="font-medium text-slate-700 truncate">{s.fullName}</span>
                                            <span className="text-xs text-slate-400 shrink-0">{s.nis}</span>
                                            {s.dormRoomId && <span className="text-xs text-amber-500 shrink-0">🏠</span>}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {basket.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-500">{basket.length} santri dipilih:</p>
                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                        {basket.map(s => (
                                            <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs">
                                                {s.fullName}
                                                <button onClick={() => removeFromBasket(s.id)} className="text-teal-400 hover:text-teal-600 font-bold">×</button>
                                            </span>
                                        ))}
                                    </div>
                                    <button onClick={() => setShowBulkModal(true)} className="w-full px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold shadow-lg shadow-teal-500/25 hover:opacity-90">
                                        Assign {basket.length} Santri →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bulk Assign Modal — portal to body */}
                {showBulkModal && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4" onClick={() => setShowBulkModal(false)}>
                        <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <h2 className="text-lg font-bold text-slate-800">Bulk Assign ke Kamar {detail.name}</h2>
                            <p className="text-sm text-slate-500">
                                Akan menempatkan <strong className="text-slate-800">{basket.length} santri</strong>.
                                Slot tersedia: <strong className={availableSlots <= 0 ? 'text-red-500' : 'text-teal-600'}>{availableSlots}</strong>
                            </p>
                            {basket.length > availableSlots && availableSlots > 0 && (
                                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">⚠ Hanya {availableSlots} dari {basket.length} santri yang akan di-assign, sisanya akan di-skip (CAPACITY_FULL).</p>
                            )}
                            {availableSlots <= 0 && (
                                <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">❌ Kamar sudah penuh, semua akan di-skip. Gunakan mode Replace untuk memindahkan santri lain keluar terlebih dahulu.</p>
                            )}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Mode</p>
                                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input type="radio" name="mode" checked={bulkMode === 'REPLACE'} onChange={() => setBulkMode('REPLACE')} />
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">Replace (Pindahkan)</p>
                                        <p className="text-xs text-slate-400">Pindahkan santri walaupun sudah punya kamar lain</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input type="radio" name="mode" checked={bulkMode === 'ONLY_EMPTY'} onChange={() => setBulkMode('ONLY_EMPTY')} />
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">Only Empty</p>
                                        <p className="text-xs text-slate-400">Hanya santri yang belum punya kamar</p>
                                    </div>
                                </label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowBulkModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200">Batal</button>
                                <button onClick={() => bulkAssignMut.mutate({ roomId: numericRoomId, santriIds: basket.map(b => b.id), mode: bulkMode })}
                                    disabled={bulkAssignMut.isPending}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-teal-500 text-white font-semibold text-sm hover:bg-teal-600 disabled:opacity-50">
                                    {bulkAssignMut.isPending ? 'Memproses...' : 'Konfirmasi'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {/* Bulk Remove Confirmation Modal */}
            {showBulkRemoveConfirm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBulkRemoveConfirm(false)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-800">Keluarkan {selected.size} Santri?</h3>
                            <p className="text-sm text-slate-500 mt-1">{selected.size} santri akan dikeluarkan dari kamar ini.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowBulkRemoveConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                            <button onClick={handleBulkRemove} className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20">Ya, Keluarkan</button>
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
                            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-800">Keluarkan Santri?</h3>
                            <p className="text-sm text-slate-500 mt-1">Santri <strong>&quot;{removingTarget.fullName}&quot;</strong> akan dikeluarkan dari kamar ini.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setRemovingTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                            <button onClick={() => { removeMut.mutate({ santriId: removingTarget.id }); setRemovingTarget(null) }} className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20">Ya, Keluarkan</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
