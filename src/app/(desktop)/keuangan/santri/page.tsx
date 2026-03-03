'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import * as XLSX from 'xlsx'

export default function KeuanganSantriPage() {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [page, setPage] = useState(1)
    const [filterRoom, setFilterRoom] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [filterGender, setFilterGender] = useState('')
    const [showFilterPanel, setShowFilterPanel] = useState(false)
    const [expandedFilter, setExpandedFilter] = useState<string | null>(null)
    const [showKebab, setShowKebab] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [nisInput, setNisInput] = useState('')
    const [addError, setAddError] = useState('')
    const [addSuccess, setAddSuccess] = useState('')
    const filterRef = useRef<HTMLDivElement>(null)
    const kebabRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setShowFilterPanel(false); setExpandedFilter(null)
            }
        }
        if (showFilterPanel) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showFilterPanel])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) setShowKebab(false)
        }
        if (showKebab) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showKebab])

    const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null)
    const handleSearch = useCallback((value: string) => {
        setSearch(value)
        if (debounceRef[0]) clearTimeout(debounceRef[0])
        debounceRef[0] = setTimeout(() => { setDebouncedSearch(value); setPage(1) }, 300)
    }, [debounceRef])

    const { data: dormRooms } = trpc.kamar.listDormRooms.useQuery(undefined, { staleTime: 60_000 })
    const { data: classGroups } = trpc.academic.classes.listAll.useQuery(undefined, { staleTime: 60_000 })

    const LIMIT = 20
    const listQuery = trpc.sectionMember.list.useQuery({
        section: 'KEUANGAN',
        search: debouncedSearch || undefined,
        dormRoomId: filterRoom ? Number(filterRoom) : undefined,
        classGroupId: filterClass || undefined,
        page,
        limit: LIMIT,
    })

    const addMut = trpc.sectionMember.addByNis.useMutation({
        onSuccess: (result) => {
            setAddSuccess(`Santri "${result.santri.fullName}" berhasil ditambahkan!`)
            setNisInput(''); setAddError(''); listQuery.refetch()
        },
        onError: (err) => { setAddError(err.message); setAddSuccess('') },
    })

    const { data, isLoading, error } = listQuery
    const activeFilterCount = (filterRoom ? 1 : 0) + (filterClass ? 1 : 0) + (filterGender ? 1 : 0)
    const activeRoomLabel = filterRoom ? (dormRooms ?? []).find((r: any) => String(r.id) === filterRoom)?.name ?? '' : ''
    const activeClassLabel = filterClass ? (classGroups ?? []).find((c: any) => c.id === filterClass)?.name ?? '' : ''
    const activeGenderLabel = filterGender === 'L' ? 'Laki-laki' : filterGender === 'P' ? 'Perempuan' : ''
    const filteredData = filterGender ? (data?.items ?? []).filter((s: any) => s.gender === filterGender) : (data?.items ?? [])
    const startIndex = (page - 1) * LIMIT

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            {/* ── Header ── */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">Data Santri — Perbendaharaan</h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {data ? `Menampilkan ${filteredData.length} dari ${data.total} santri` : 'Memuat...'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setShowAddModal(true); setNisInput(''); setAddError(''); setAddSuccess('') }}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            Tambah Santri
                        </button>
                        <div className="relative" ref={kebabRef}>
                            <button onClick={() => setShowKebab(!showKebab)}
                                className="w-8 h-8 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 rounded flex items-center justify-center transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            {showKebab && (
                                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                                    <button onClick={() => {
                                        const rows = (data?.items ?? []).map((s: any) => ({
                                            'NIS': s.nis, 'Nama Lengkap': s.fullName, 'Gender': s.gender,
                                            'Kamar': s.dormRoom?.name || '', 'Kelas': s.classGroup?.name || '',
                                            'No HP': s.phone || '',
                                        }))
                                        const ws = XLSX.utils.json_to_sheet(rows)
                                        const wb = XLSX.utils.book_new()
                                        XLSX.utils.book_append_sheet(wb, ws, 'Data Santri Keuangan')
                                        XLSX.writeFile(wb, 'data_santri_keuangan.xlsx')
                                        setShowKebab(false)
                                    }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition">
                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Export Excel
                                    </button>
                                    <button onClick={() => { router.push('/master-data/santri/upload'); setShowKebab(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition border-t border-gray-100">
                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        Upload via Excel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Search & Filter Bar ── */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Cari nama atau NIS..." value={search} onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded text-xs placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none" />
                    </div>
                    <div className="relative" ref={filterRef}>
                        <button type="button" onClick={() => { setShowFilterPanel(!showFilterPanel); setExpandedFilter(null) }}
                            className={`relative h-[30px] px-3 border rounded text-xs font-medium flex items-center gap-1.5 transition ${activeFilterCount > 0 ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                            Filter
                            {activeFilterCount > 0 && (
                                <span className="min-w-[16px] h-4 rounded-full bg-teal-600 text-white text-[9px] font-bold flex items-center justify-center px-1">{activeFilterCount}</span>
                            )}
                        </button>

                        {showFilterPanel && (
                            <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden">
                                <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-700">Filter</span>
                                    {activeFilterCount > 0 && (
                                        <button onClick={() => { setFilterRoom(''); setFilterClass(''); setFilterGender(''); setPage(1) }} className="text-[11px] font-medium text-red-500 hover:text-red-700 transition">Reset semua</button>
                                    )}
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {/* Kamar */}
                                    <div>
                                        <button type="button" onClick={() => setExpandedFilter(expandedFilter === 'kamar' ? null : 'kamar')}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition text-left">
                                            <span className="w-6 h-6 rounded bg-teal-50 flex items-center justify-center shrink-0">
                                                <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                            </span>
                                            <span className="flex-1 text-xs font-medium text-gray-700">Kamar</span>
                                            {filterRoom && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />}
                                            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedFilter === 'kamar' ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                        {expandedFilter === 'kamar' && (
                                            <div className="bg-gray-50 max-h-40 overflow-y-auto">
                                                <button onClick={() => { setFilterRoom(''); setPage(1) }} className={`w-full text-left px-5 py-1.5 text-xs transition ${!filterRoom ? 'text-teal-600 font-semibold bg-teal-50' : 'text-gray-600 hover:bg-gray-100'}`}>Semua Kamar</button>
                                                {(dormRooms ?? []).map((room: any) => (
                                                    <button key={room.id} onClick={() => { setFilterRoom(String(room.id)); setPage(1) }} className={`w-full text-left px-5 py-1.5 text-xs transition ${filterRoom === String(room.id) ? 'text-teal-600 font-semibold bg-teal-50' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                        {room.floor?.building?.name ? `${room.floor.building.name} — ` : ''}{room.floor?.number != null ? `Lt. ${room.floor.number} — ` : ''}{room.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Kelas */}
                                    <div>
                                        <button type="button" onClick={() => setExpandedFilter(expandedFilter === 'kelas' ? null : 'kelas')}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition text-left">
                                            <span className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                            </span>
                                            <span className="flex-1 text-xs font-medium text-gray-700">Kelas</span>
                                            {filterClass && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                                            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedFilter === 'kelas' ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                        {expandedFilter === 'kelas' && (
                                            <div className="bg-gray-50 max-h-40 overflow-y-auto">
                                                <button onClick={() => { setFilterClass(''); setPage(1) }} className={`w-full text-left px-5 py-1.5 text-xs transition ${!filterClass ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}>Semua Kelas</button>
                                                {(classGroups ?? []).map((cg: any) => (
                                                    <button key={cg.id} onClick={() => { setFilterClass(cg.id); setPage(1) }} className={`w-full text-left px-5 py-1.5 text-xs transition ${filterClass === cg.id ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                        {cg.grade?.level?.name ? `${cg.grade.level.name} — ` : ''}{cg.name}{cg.schoolYear?.name ? ` (${cg.schoolYear.name})` : ''}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Gender */}
                                    <div>
                                        <button type="button" onClick={() => setExpandedFilter(expandedFilter === 'gender' ? null : 'gender')}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition text-left">
                                            <span className="w-6 h-6 rounded bg-purple-50 flex items-center justify-center shrink-0">
                                                <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            </span>
                                            <span className="flex-1 text-xs font-medium text-gray-700">Gender</span>
                                            {filterGender && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />}
                                            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedFilter === 'gender' ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                        {expandedFilter === 'gender' && (
                                            <div className="bg-gray-50">
                                                {[{ value: '', label: 'Semua' }, { value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }].map((opt) => (
                                                    <button key={opt.value} onClick={() => { setFilterGender(opt.value); setPage(1) }} className={`w-full text-left px-5 py-1.5 text-xs transition ${filterGender === opt.value ? 'text-purple-600 font-semibold bg-purple-50' : 'text-gray-600 hover:bg-gray-100'}`}>{opt.label}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Filter Pills */}
                {activeFilterCount > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {activeRoomLabel && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 pl-2 pr-1 py-0.5 text-[10px] font-medium text-teal-700">
                                {activeRoomLabel}
                                <button onClick={() => { setFilterRoom(''); setPage(1) }} className="w-3.5 h-3.5 rounded-full hover:bg-teal-200 flex items-center justify-center transition">✕</button>
                            </span>
                        )}
                        {activeClassLabel && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 pl-2 pr-1 py-0.5 text-[10px] font-medium text-blue-700">
                                {activeClassLabel}
                                <button onClick={() => { setFilterClass(''); setPage(1) }} className="w-3.5 h-3.5 rounded-full hover:bg-blue-200 flex items-center justify-center transition">✕</button>
                            </span>
                        )}
                        {activeGenderLabel && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 pl-2 pr-1 py-0.5 text-[10px] font-medium text-purple-700">
                                {activeGenderLabel}
                                <button onClick={() => { setFilterGender(''); setPage(1) }} className="w-3.5 h-3.5 rounded-full hover:bg-purple-200 flex items-center justify-center transition">✕</button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ── Table ── */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-10">No</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">NIS</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kelas</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kamar</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gender</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {error ? (
                            <tr><td colSpan={7} className="px-4 py-10 text-center">
                                <p className="text-xs text-red-600 font-medium">Gagal memuat data santri</p>
                                <p className="text-xs text-red-400 mt-0.5">{error.message}</p>
                                <button onClick={() => listQuery.refetch()} className="mt-2 px-3 py-1.5 rounded border border-red-200 text-xs text-red-600 hover:bg-red-50 transition">Coba Lagi</button>
                            </td></tr>
                        ) : isLoading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-16 text-center">
                                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <p className="text-sm text-gray-400">{search || activeFilterCount ? 'Tidak ada santri yang sesuai filter' : 'Belum ada data santri'}</p>
                            </td></tr>
                        ) : (
                            filteredData.map((santri: any, idx: number) => {
                                const jenjang = santri.classGroup?.grade?.level?.name ?? ''
                                const kelasName = santri.classGroup?.name ?? ''
                                const kelas = jenjang && kelasName ? `${jenjang} ${kelasName}` : kelasName || jenjang || ''
                                const kamar = santri.dormRoom?.name ?? ''
                                return (
                                    <tr key={santri.id} onClick={() => router.push(`/keuangan/santri/${santri.id}`)}
                                        className="hover:bg-gray-50/80 cursor-pointer transition group">
                                        <td className="px-4 py-2.5"><span className="text-[11px] text-gray-400">{startIndex + idx + 1}</span></td>
                                        <td className="px-4 py-2.5"><span className="text-xs font-mono font-medium text-gray-700">{santri.nis}</span></td>
                                        <td className="px-4 py-2.5">
                                            <p className="text-xs font-semibold text-gray-900 group-hover:text-teal-700 transition truncate max-w-[200px]">{santri.fullName}</p>
                                            {santri.phone && <p className="text-[10px] text-gray-400 mt-0.5">{santri.phone}</p>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {kelas ? <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">{kelas}</span> : <span className="text-[10px] text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {kamar ? <span className="inline-block px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-medium">{kamar}</span> : <span className="text-[10px] text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${santri.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>{santri.gender}</span>
                                        </td>
                                        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center">
                                                <button onClick={() => router.push(`/keuangan/santri/${santri.id}`)}
                                                    className="w-7 h-7 bg-gray-100 hover:bg-teal-100 hover:text-teal-700 text-gray-500 rounded flex items-center justify-center transition">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Pagination ── */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                    {data ? `Menampilkan ${startIndex + 1}–${Math.min(startIndex + LIMIT, data.total)} dari ${data.total} santri` : ''}
                </div>
                {data && data.totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                            className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Prev
                        </button>
                        <div className="flex gap-0.5">
                            {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                                .slice(Math.max(0, page - 3), Math.min(data.totalPages, page + 2))
                                .map((p) => (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={`w-7 h-7 rounded text-xs font-medium transition ${p === page ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                                        {p}
                                    </button>
                                ))}
                        </div>
                        <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                            className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition">
                            Next
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                )}
            </div>

            {/* ── Add by NIS Modal ── */}
            {showAddModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Tambah Santri ke Perbendaharaan</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Masukkan NIS santri yang sudah terdaftar di Data Pusat.</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition">✕</button>
                        </div>
                        <div className="flex gap-2">
                            <input value={nisInput} onChange={(e) => setNisInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addMut.mutate({ nis: nisInput.trim(), section: 'KEUANGAN' })}
                                placeholder="Masukkan NIS..." autoFocus
                                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition" />
                            <button onClick={() => addMut.mutate({ nis: nisInput.trim(), section: 'KEUANGAN' })} disabled={!nisInput.trim() || addMut.isPending}
                                className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-50">
                                {addMut.isPending ? '...' : 'Cari'}
                            </button>
                        </div>
                        {addError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>}
                        {addSuccess && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{addSuccess}</p>}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
