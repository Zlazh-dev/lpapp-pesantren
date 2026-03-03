'use client'

import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'

// ── Color palette per jenjang index ──
const LEVEL_COLORS = [
    { bg: 'from-indigo-500 to-purple-600', light: 'bg-indigo-50 border-indigo-200 text-indigo-700', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
    { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50 border-emerald-200 text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    { bg: 'from-blue-500 to-cyan-600', light: 'bg-blue-50 border-blue-200 text-blue-700', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-50 border-rose-200 text-rose-700', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
    { bg: 'from-amber-500 to-orange-600', light: 'bg-amber-50 border-amber-200 text-amber-700', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
]

export default function KelasPageClient() {
    const router = useRouter()
    const utils = trpc.useUtils()

    // ── Data queries ──
    const { data: levels, isLoading: levelsLoading } = trpc.academic.levels.list.useQuery()
    const { data: schoolYears } = trpc.academic.schoolYears.list.useQuery()
    const { data: waliCandidates } = trpc.academic.classes.listWaliCandidates.useQuery()
    const activeYear = schoolYears?.find((sy: any) => sy.isActive)

    // ── Select state ──
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
    const [selectedGrade, setSelectedGrade] = useState<string | null>(null)

    // ── Feedback ──
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'level' | 'grade' | 'rombel', id: string, label: string } | null>(null)
    const showMsg = (msg: string) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000) }
    const showErr = (msg: string) => { setError(msg); setSuccess('') }

    // ── Wali Kelas sidebar ──
    const [draggedUserId, setDraggedUserId] = useState<string | null>(null)

    // ── Create Jenjang ──
    const [showAddLevel, setShowAddLevel] = useState(false)
    const [newLevelCode, setNewLevelCode] = useState('')
    const [newLevelName, setNewLevelName] = useState('')
    const createLevelMut = trpc.academic.levels.create.useMutation({
        onSuccess: () => { utils.academic.levels.list.invalidate(); setNewLevelCode(''); setNewLevelName(''); setShowAddLevel(false); showMsg('Jenjang berhasil dibuat') },
        onError: (e: any) => showErr(e.message),
    })
    const deleteLevelMut = trpc.academic.levels.delete.useMutation({
        onSuccess: () => { utils.academic.levels.list.invalidate(); showMsg('Jenjang dihapus') },
        onError: (e: any) => showErr(e.message),
    })

    // ── Create Tingkat ──
    const [showAddGrade, setShowAddGrade] = useState(false)
    const [newGradeNumber, setNewGradeNumber] = useState<number | ''>('')
    const createGradeMut = trpc.academic.grades.create.useMutation({
        onSuccess: () => { utils.academic.levels.list.invalidate(); setNewGradeNumber(''); setShowAddGrade(false); showMsg('Tingkat berhasil dibuat') },
        onError: (e: any) => showErr(e.message),
    })
    const deleteGradeMut = trpc.academic.grades.delete.useMutation({
        onSuccess: () => { utils.academic.levels.list.invalidate(); showMsg('Tingkat dihapus') },
        onError: (e: any) => showErr(e.message),
    })

    // ── ClassGroups per grade ──
    const { data: classGroups, isLoading: cgLoading } = trpc.academic.classes.listByGrade.useQuery(
        { gradeId: selectedGrade! },
        { enabled: !!selectedGrade }
    )

    // ── Create Rombel ──
    const [showAddRombel, setShowAddRombel] = useState(false)
    const [rombelSuffix, setRombelSuffix] = useState('')
    const [rombelCapacity, setRombelCapacity] = useState<number | ''>('')
    const createRombelMut = trpc.academic.classes.createOne.useMutation({
        onSuccess: () => {
            if (selectedGrade) utils.academic.classes.listByGrade.invalidate({ gradeId: selectedGrade })
            utils.academic.levels.list.invalidate()
            setRombelSuffix(''); setRombelCapacity(''); setShowAddRombel(false); showMsg('Rombel berhasil dibuat')
        },
        onError: (e: any) => showErr(e.message),
    })
    const deleteRombelMut = trpc.academic.classes.delete.useMutation({
        onSuccess: () => {
            if (selectedGrade) utils.academic.classes.listByGrade.invalidate({ gradeId: selectedGrade })
            utils.academic.levels.list.invalidate()
            showMsg('Rombel dihapus')
        },
        onError: (e: any) => showErr(e.message),
    })

    // ── Set Wali Kelas ──
    const setWaliMut = trpc.academic.classes.setWaliKelas.useMutation({
        onSuccess: () => {
            if (selectedGrade) utils.academic.classes.listByGrade.invalidate({ gradeId: selectedGrade })
            utils.academic.classes.listWaliCandidates.invalidate()
            showMsg('Wali kelas berhasil diatur')
        },
        onError: (e: any) => showErr(e.message),
    })

    // ── Drag handlers ──
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }, [])

    const handleDrop = useCallback((e: React.DragEvent, classGroupId: string) => {
        e.preventDefault()
        const userId = e.dataTransfer.getData('text/plain')
        if (userId) {
            setWaliMut.mutate({ classGroupId, userId })
        }
        setDraggedUserId(null)
    }, [setWaliMut])

    // ── Derived data ──
    const selectedLevelData = levels?.find((l: any) => l.id === selectedLevel)
    const selectedLevelIdx = levels?.findIndex((l: any) => l.id === selectedLevel) ?? 0
    const color = LEVEL_COLORS[selectedLevelIdx % LEVEL_COLORS.length]
    const grades = selectedLevelData?.grades ?? []
    const selectedGradeData = grades.find((g: any) => g.id === selectedGrade)

    return (
        <div className="flex flex-col h-full">
            {/* ── Page Header ── */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Manajemen Kelas</h1>
                    <p className="text-slate-400 text-xs mt-0.5">Kelola Jenjang → Tingkat → Rombongan Belajar</p>
                </div>
                {activeYear && (
                    <div className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {activeYear.name}
                    </div>
                )}
            </div>

            {/* ── Feedback ── */}
            {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2 animate-fade-in">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm flex items-center gap-2 animate-fade-in">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {success}
                </div>
            )}

            {/* ── 3-Column Layout ── */}
            <div className="flex gap-3 flex-1 min-h-0">

                {/* ══ KOLOM 1: JENJANG ══ */}
                <div className="w-[220px] shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden h-full">
                    <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h2 className="text-xs font-bold text-gray-900">Jenjang</h2>
                            <p className="text-[11px] text-gray-400">{levels?.length ?? 0} jenjang</p>
                        </div>
                        <button
                            onClick={() => setShowAddLevel(!showAddLevel)}
                            className="w-6 h-6 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 rounded flex items-center justify-center text-gray-500 transition"
                            title="Tambah Jenjang"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>

                    {/* Add Jenjang Form */}
                    {showAddLevel && (
                        <div className="p-3 border-b border-gray-100 bg-emerald-50/60 space-y-2 animate-fade-in">
                            <p className="text-[11px] font-bold text-gray-600">Tambah Jenjang</p>
                            <input value={newLevelCode} onChange={e => setNewLevelCode(e.target.value)} maxLength={10}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white uppercase focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Kode (MTs, MA...)" />
                            <input value={newLevelName} onChange={e => setNewLevelName(e.target.value)} maxLength={100}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Nama Lengkap" />
                            <div className="flex gap-1.5">
                                <button onClick={() => { setShowAddLevel(false); setNewLevelCode(''); setNewLevelName('') }}
                                    className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition">Batal</button>
                                <button onClick={() => { if (newLevelCode && newLevelName) createLevelMut.mutate({ code: newLevelCode, name: newLevelName }) }}
                                    disabled={!newLevelCode || !newLevelName || createLevelMut.isPending}
                                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition">
                                    {createLevelMut.isPending ? '...' : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {levelsLoading ? (
                            [1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />)
                        ) : !levels?.length ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-3 py-10">
                                <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
                                <p className="text-xs text-gray-400">Belum ada jenjang</p>
                            </div>
                        ) : (
                            levels.map((level: any, idx: number) => {
                                const lc = LEVEL_COLORS[idx % LEVEL_COLORS.length]
                                const isActive = selectedLevel === level.id
                                const grades = level.grades ?? []
                                const totalRombel = grades.reduce((s: number, g: any) => s + (g._count?.classGroups ?? 0), 0)
                                return (
                                    <div
                                        key={level.id}
                                        onClick={() => { setSelectedLevel(isActive ? null : level.id); setSelectedGrade(null); setShowAddGrade(false); setShowAddRombel(false) }}
                                        className={`w-full text-left rounded-lg p-2.5 border transition-all group cursor-pointer ${isActive ? `${lc.light} border` : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${lc.dot}`} />
                                            <span className="text-xs font-bold text-gray-900 flex-1 truncate">{level.name}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'level', id: level.id, label: `jenjang "${level.name}"? Semua tingkat & rombel di bawahnya akan ikut dihapus` }) }}
                                                className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                        <div className="flex gap-1.5 pl-3.5">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${lc.badge}`}>{grades.length} tingkat</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">{totalRombel} rombel</span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* ══ KOLOM 2: TINGKAT ══ */}
                <div className="w-[180px] shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden h-full">
                    <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h2 className="text-xs font-bold text-gray-900">Tingkat</h2>
                            <p className="text-[11px] text-gray-400">
                                {selectedLevel ? `${grades.length} tingkat` : 'Pilih jenjang'}
                            </p>
                        </div>
                        {selectedLevel && (
                            <button
                                onClick={() => setShowAddGrade(!showAddGrade)}
                                className="w-6 h-6 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 rounded flex items-center justify-center text-gray-500 transition"
                                title="Tambah Tingkat"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Add Tingkat Form */}
                    {showAddGrade && selectedLevel && (
                        <div className="p-3 border-b border-gray-100 bg-emerald-50/60 space-y-2 animate-fade-in">
                            <p className="text-[11px] font-bold text-gray-600">Tambah Tingkat</p>
                            <input type="number" value={newGradeNumber} onChange={e => setNewGradeNumber(e.target.value ? +e.target.value : '')}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Nomor (7, 8...)" min={1} max={15} />
                            <div className="flex gap-1.5">
                                <button onClick={() => { setShowAddGrade(false); setNewGradeNumber('') }}
                                    className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition">Batal</button>
                                <button onClick={() => { if (newGradeNumber && selectedLevel) createGradeMut.mutate({ levelId: selectedLevel, number: Number(newGradeNumber) }) }}
                                    disabled={!newGradeNumber || createGradeMut.isPending}
                                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition">
                                    {createGradeMut.isPending ? '...' : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {!selectedLevel ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-3 py-10">
                                <svg className="w-7 h-7 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                                <p className="text-xs text-gray-400">Pilih jenjang</p>
                            </div>
                        ) : grades.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-3 py-10">
                                <p className="text-xs text-gray-400">Belum ada tingkat</p>
                            </div>
                        ) : (
                            grades.map((grade: any) => {
                                const isActive = selectedGrade === grade.id
                                return (
                                    <div
                                        key={grade.id}
                                        onClick={() => { setSelectedGrade(isActive ? null : grade.id); setShowAddRombel(false) }}
                                        className={`w-full text-left rounded-lg p-2.5 border transition-all group cursor-pointer ${isActive ? `${color.light} border` : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-800 flex-1">Tingkat {grade.number}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'grade', id: grade.id, label: `Tingkat ${grade.number}? Semua rombel di bawahnya akan ikut dihapus` }) }}
                                                className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{grade._count?.classGroups ?? 0} rombel</p>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* ══ KOLOM 3: ROMBEL ══ */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden h-full">
                    <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h2 className="text-xs font-bold text-gray-900">Rombongan Belajar</h2>
                            <p className="text-[11px] text-gray-400">
                                {selectedGradeData
                                    ? `Tingkat ${selectedGradeData.number} — ${selectedLevelData?.name}`
                                    : 'Pilih tingkat'}
                            </p>
                        </div>
                        {selectedGrade && (
                            <button
                                onClick={() => setShowAddRombel(!showAddRombel)}
                                className="w-6 h-6 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 rounded flex items-center justify-center text-gray-500 transition"
                                title="Tambah Rombel"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Add Rombel Form */}
                    {showAddRombel && selectedGrade && (
                        <div className="p-3 border-b border-gray-100 bg-emerald-50/60 animate-fade-in">
                            <p className="text-[11px] font-bold text-gray-600 mb-2">Tambah Rombel</p>
                            <div className="flex gap-2 items-end">
                                <div>
                                    <label className="text-[10px] font-semibold text-gray-500 block mb-1">Suffix</label>
                                    <input value={rombelSuffix} onChange={e => setRombelSuffix(e.target.value)} maxLength={5}
                                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white w-16 uppercase focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="A" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-gray-500 block mb-1">Kapasitas</label>
                                    <input type="number" value={rombelCapacity} onChange={e => setRombelCapacity(e.target.value ? +e.target.value : '')}
                                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white w-20 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="30" min={1} />
                                </div>
                                <button onClick={() => setShowAddRombel(false)}
                                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition">Batal</button>
                                <button
                                    onClick={() => { if (rombelSuffix && selectedGrade) createRombelMut.mutate({ gradeId: selectedGrade, suffix: rombelSuffix, capacity: rombelCapacity ? Number(rombelCapacity) : undefined }) }}
                                    disabled={!rombelSuffix || createRombelMut.isPending}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition">
                                    {createRombelMut.isPending ? '...' : 'Buat'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-3">
                        {!selectedGrade ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                <p className="text-sm text-gray-400">Pilih jenjang dan tingkat</p>
                            </div>
                        ) : cgLoading ? (
                            <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-lg" />)}</div>
                        ) : !classGroups?.length ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <p className="text-sm text-gray-400 mb-2">Belum ada rombel</p>
                                <button onClick={() => setShowAddRombel(true)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition">+ Tambah Rombel</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {classGroups.map((cg: any) => (
                                    <div
                                        key={cg.id}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, cg.id)}
                                        onClick={() => router.push(`/akademik/kelas/${cg.id}`)}
                                        className={`relative rounded-xl border-2 p-3 transition-all duration-200 cursor-pointer group ${draggedUserId ? 'border-dashed border-violet-300 bg-violet-50/30' : cg.isActive ? 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm' : 'border-gray-100 bg-gray-50 opacity-60'}`}
                                    >
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between mb-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color.bg} flex items-center justify-center text-white text-xs font-bold`}>
                                                    {cg.name}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{selectedLevelData?.code} {cg.name}</p>
                                                    <p className="text-[10px] text-gray-400">{cg._count?.santri ?? 0} santri{cg.capacity ? ` / ${cg.capacity}` : ''}</p>
                                                </div>
                                            </div>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${cg.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {cg.isActive ? 'ON' : 'OFF'}
                                            </span>
                                        </div>

                                        {/* Wali Kelas */}
                                        <div onClick={e => e.stopPropagation()}>
                                            {cg.waliKelas ? (
                                                <div className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-lg px-2 py-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 text-[9px] font-bold">
                                                            {cg.waliKelas.fullName?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                        <span className="text-[11px] font-medium text-violet-700 truncate max-w-[100px]">{cg.waliKelas.fullName}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setWaliMut.mutate({ classGroupId: cg.id, userId: null })}
                                                        className="w-4 h-4 rounded flex items-center justify-center text-violet-400 hover:text-red-500 hover:bg-red-50 transition"
                                                    >
                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 border border-dashed text-[10px] ${draggedUserId ? 'border-violet-400 text-violet-500 bg-violet-50' : 'border-gray-200 text-gray-400'}`}>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                    {draggedUserId ? 'Drop di sini' : 'Belum ada wali'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => setDeleteTarget({ type: 'rombel', id: cg.id, label: `rombel ${cg.name}` })}
                                                className="w-full px-2 py-1 rounded text-[10px] font-medium text-red-500 bg-red-50 hover:bg-red-100 transition">
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ══ KOLOM 4: WALI KELAS SIDEBAR ══ */}
                <div className="w-[200px] shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden h-full">
                    <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                        <h3 className="text-xs font-bold">Daftar Guru</h3>
                        <p className="text-[10px] text-violet-200 mt-0.5">Drag guru ke rombel</p>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                        {/* Belum ditugaskan */}
                        {waliCandidates?.filter((u: any) => !u.waliKelasOf?.length).length ? (
                            <div>
                                <p className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide bg-gray-50">
                                    Tersedia ({waliCandidates.filter((u: any) => !u.waliKelasOf?.length).length})
                                </p>
                                {waliCandidates.filter((u: any) => !u.waliKelasOf?.length).map((user: any) => (
                                    <div
                                        key={user.id}
                                        draggable
                                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', user.id); e.dataTransfer.effectAllowed = 'move'; setDraggedUserId(user.id) }}
                                        onDragEnd={() => setDraggedUserId(null)}
                                        className="flex items-center gap-2.5 px-3 py-2.5 cursor-grab active:cursor-grabbing hover:bg-violet-50 transition-all"
                                    >
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                            {user.fullName?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <span className="text-xs font-medium text-gray-700 flex-1 truncate">{user.fullName}</span>
                                        <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {/* Sudah ditugaskan */}
                        {waliCandidates?.filter((u: any) => u.waliKelasOf?.length).length ? (
                            <div>
                                <p className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide bg-gray-50">
                                    Ditugaskan ({waliCandidates.filter((u: any) => u.waliKelasOf?.length).length})
                                </p>
                                {waliCandidates.filter((u: any) => u.waliKelasOf?.length).map((user: any) => (
                                    <div key={user.id} className="flex items-center gap-2.5 px-3 py-2.5 opacity-60">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                            {user.fullName?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-600 truncate">{user.fullName}</p>
                                            <p className="text-[10px] text-violet-500">Wali {user.waliKelasOf?.[0]?.name}</p>
                                        </div>
                                        <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {!waliCandidates?.length && (
                            <p className="px-4 py-8 text-center text-xs text-gray-400 italic">Tidak ada guru tersedia</p>
                        )}
                    </div>

                    <div className="p-2.5 border-t border-gray-200 bg-blue-50">
                        <div className="flex gap-2 text-[11px] text-blue-700">
                            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                            Drag ke rombel untuk assign
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteTarget && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-800">Hapus?</h3>
                            <p className="text-sm text-slate-500 mt-1">Hapus {deleteTarget.label}?</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Batal</button>
                            <button onClick={() => {
                                if (deleteTarget.type === 'level') deleteLevelMut.mutate(deleteTarget.id)
                                else if (deleteTarget.type === 'grade') deleteGradeMut.mutate(deleteTarget.id)
                                else deleteRombelMut.mutate(deleteTarget.id)
                                setDeleteTarget(null)
                            }} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition shadow-md shadow-red-500/20">
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
