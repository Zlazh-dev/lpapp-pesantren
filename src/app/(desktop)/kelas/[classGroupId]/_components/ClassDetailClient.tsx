'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { trpc } from '@/utils/trpc'
import Link from 'next/link'

type SelectedSantri = { id: string; fullName: string; nis: string }

export default function ClassDetailClient({ classGroupIdProp }: { classGroupIdProp: string }) {
    const classGroupId = classGroupIdProp
    const { data: detail, isLoading } = trpc.academic.classes.getDetail.useQuery(classGroupId)
    const utils = trpc.useUtils()

    // Single assign search
    const [searchSingle, setSearchSingle] = useState('')
    const [success, setSuccess] = useState('')
    const [alertMsg, setAlertMsg] = useState('')

    const { data: singleResult } = trpc.santri.list.useQuery(
        { search: searchSingle, limit: 20 },
        { enabled: searchSingle.length >= 2 }
    )
    const singleFiltered = singleResult?.data?.filter((s: any) =>
        !detail?.santri?.some((ds: any) => ds.id === s.id)
    )?.slice(0, 10)

    // Bulk assign state
    const [basketSearch, setBasketSearch] = useState('')
    const [basket, setBasket] = useState<SelectedSantri[]>([])
    const [bulkMode, setBulkMode] = useState<'REPLACE' | 'ONLY_EMPTY'>('REPLACE')
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [bulkSummary, setBulkSummary] = useState<any>(null)

    // Checkbox selection for existing santri (bulk remove)
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [showBulkRemoveConfirm, setShowBulkRemoveConfirm] = useState(false)
    const [removingTarget, setRemovingTarget] = useState<any>(null)

    const { data: basketResult } = trpc.santri.search.useQuery(
        { q: basketSearch, limit: 20 },
        { enabled: basketSearch.length >= 2 }
    )

    const invalidateAll = () => {
        utils.academic.classes.getDetail.invalidate(classGroupId)
        utils.academic.classes.listByGrade.invalidate()
    }

    const assignMut = trpc.santri.update.useMutation({
        onSuccess: () => { invalidateAll(); setSearchSingle(''); showMsg('Santri ditambahkan') },
    })
    const removeMut = trpc.santri.update.useMutation({
        onSuccess: () => { invalidateAll(); showMsg('Santri dikeluarkan') },
    })
    const bulkAssignMut = trpc.santri.bulkAssignToClassGroup.useMutation({
        onSuccess: (data: any) => {
            invalidateAll()
            setBulkSummary(data)
            setBasket([])
            setShowBulkModal(false)
        },
    })
    const bulkUnassignMut = trpc.santri.bulkUnassignFromClassGroup.useMutation({
        onSuccess: (data: any) => {
            invalidateAll()
            setSelected(new Set())
            showMsg(`${data.removedCount} santri dikeluarkan dari rombel`)
        },
    })

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
        if (!detail?.santri) return
        if (selected.size === detail.santri.length) setSelected(new Set())
        else setSelected(new Set(detail.santri.map((s: any) => s.id)))
    }

    if (isLoading) {
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
                <p className="text-lg font-medium mb-2">Rombel tidak ditemukan</p>
                <Link href="/kelas" className="text-teal-600 hover:underline text-sm">← Kembali ke Data Kelas</Link>
            </div>
        )
    }

    const reasonLabel: Record<string, string> = {
        ALREADY_IN_TARGET: 'Sudah di rombel ini',
        HAS_CLASS: 'Sudah punya kelas lain',
        NOT_FOUND: 'Tidak ditemukan',
    }

    return (
        <>
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-slate-400">
                    <Link href="/kelas" className="hover:text-teal-600 transition-colors">Data Kelas</Link>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    <span className="text-slate-700 font-medium">{detail.name}</span>
                </nav>

                {/* Header */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/kelas" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Rombel {detail.name}</h1>
                                <p className="text-slate-500 mt-0.5">
                                    {detail.grade?.level?.code} — {detail.grade?.level?.name} • Tingkat {detail.grade?.number}
                                    {detail.schoolYear && ` • ${detail.schoolYear.name}`}
                                </p>
                            </div>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 font-semibold text-sm flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {detail.santri?.length ?? 0} santri{detail.capacity ? ` / ${detail.capacity}` : ''}
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
                            <button onClick={() => setBulkSummary(null)} className="text-blue-400 hover:text-blue-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <p className="text-blue-700 flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {bulkSummary.assignedCount} santri berhasil di-assign
                        </p>
                        {bulkSummary.skippedCount > 0 && (
                            <div>
                                <p className="text-amber-700 flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                    {bulkSummary.skippedCount} santri dilewati:
                                </p>
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
                    {/* Main: Santri Table */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-slate-800">Daftar Santri</h3>
                                    {selected.size > 0 && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs font-semibold">{selected.size} dipilih</span>
                                    )}
                                </div>
                                {selected.size > 0 && (
                                    <button onClick={() => setShowBulkRemoveConfirm(true)}
                                        disabled={bulkUnassignMut.isPending}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50">
                                        Keluarkan {selected.size} santri
                                    </button>
                                )}
                            </div>
                            {(!detail.santri || detail.santri.length === 0) ? (
                                <div className="px-6 py-12 text-center text-slate-400">
                                    <p className="font-medium">Belum ada santri</p>
                                    <p className="text-sm mt-1">Gunakan pencarian di samping atau Bulk Assign.</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-4 py-3 text-left">
                                                <input type="checkbox" checked={selected.size === detail.santri.length && detail.santri.length > 0}
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
                                        {detail.santri.map((s: any, i: number) => (
                                            <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${selected.has(s.id) ? 'bg-blue-50/50' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="rounded border-slate-300" />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                                                <td className="px-4 py-3">
                                                    <Link href={`/santri/${s.id}`} className="text-sm font-medium text-slate-800 hover:text-teal-600">{s.fullName}</Link>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 font-mono">{s.nis}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{s.gender === 'L' ? 'L' : 'P'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => setRemovingTarget(s)}
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
                            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                Tambah Santri (Satuan)
                            </h3>
                            <input type="text" value={searchSingle} onChange={e => setSearchSingle(e.target.value)}
                                placeholder="Cari nama / NIS..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50" />
                            {searchSingle.length >= 2 && singleFiltered && singleFiltered.length > 0 && (
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {singleFiltered.map((s: any) => (
                                        <button key={s.id} onClick={() => assignMut.mutate({ id: s.id, classGroupId })}
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
                            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3v1m0 0v1m0-1h1m-1 0h-1" /></svg>
                                Bulk Assign ke Rombel Ini
                            </h3>
                            <input type="text" value={basketSearch} onChange={e => setBasketSearch(e.target.value)}
                                placeholder="Cari santri untuk ditambahkan..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50" />

                            {/* Search results */}
                            {basketSearch.length >= 2 && basketResult && basketResult.length > 0 && (
                                <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-1">
                                    {basketResult.filter((s: any) => !basket.find(b => b.id === s.id)).map((s: any) => (
                                        <button key={s.id} onClick={() => addToBasket(s)}
                                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-teal-50 text-left text-sm">
                                            <span className="text-teal-500 shrink-0">+</span>
                                            <span className="font-medium text-slate-700 truncate">{s.fullName}</span>
                                            <span className="text-xs text-slate-400 shrink-0">{s.nis}</span>
                                            {s.classGroupId && <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Basket chips */}
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
            </div>

            {/* Bulk Assign Modal */}
            {
                showBulkModal && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBulkModal(false)}>
                        <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <h2 className="text-lg font-bold text-slate-800">Bulk Assign ke Rombel {detail.name}</h2>
                            <p className="text-sm text-slate-500">
                                Akan menempatkan <strong className="text-slate-800">{basket.length} santri</strong> ke rombel ini.
                            </p>
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Mode</p>
                                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input type="radio" name="mode" checked={bulkMode === 'REPLACE'} onChange={() => setBulkMode('REPLACE')} />
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">Replace (Pindahkan)</p>
                                        <p className="text-xs text-slate-400">Overwrite kelas — termasuk yang sudah punya kelas lain</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input type="radio" name="mode" checked={bulkMode === 'ONLY_EMPTY'} onChange={() => setBulkMode('ONLY_EMPTY')} />
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">Only Empty</p>
                                        <p className="text-xs text-slate-400">Hanya assign santri yang belum punya kelas</p>
                                    </div>
                                </label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowBulkModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200">Batal</button>
                                <button onClick={() => bulkAssignMut.mutate({ classGroupId, santriIds: basket.map(b => b.id), mode: bulkMode })}
                                    disabled={bulkAssignMut.isPending}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-teal-500 text-white font-semibold text-sm hover:bg-teal-600 disabled:opacity-50">
                                    {bulkAssignMut.isPending ? 'Memproses...' : 'Konfirmasi'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Bulk Remove Confirmation */}
            {
                showBulkRemoveConfirm && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBulkRemoveConfirm(false)}>
                        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                            </div>
                            <div className="text-center">
                                <h3 className="text-base font-bold text-slate-800">Keluarkan {selected.size} Santri?</h3>
                                <p className="text-sm text-slate-500 mt-1">{selected.size} santri akan dikeluarkan dari rombel ini.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setShowBulkRemoveConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                                <button onClick={() => { setShowBulkRemoveConfirm(false); bulkUnassignMut.mutate({ santriIds: [...selected] }) }} className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20">Ya, Keluarkan</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Individual Remove Confirmation */}
            {
                removingTarget && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setRemovingTarget(null)}>
                        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            </div>
                            <div className="text-center">
                                <h3 className="text-base font-bold text-slate-800">Keluarkan Santri?</h3>
                                <p className="text-sm text-slate-500 mt-1">Santri <strong>&quot;{removingTarget.fullName}&quot;</strong> akan dikeluarkan dari rombel ini.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setRemovingTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                                <button onClick={() => { removeMut.mutate({ id: removingTarget.id, classGroupId: null }); setRemovingTarget(null) }} className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20">Ya, Keluarkan</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </>
    )
}
