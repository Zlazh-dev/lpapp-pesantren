'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { trpc } from '@/utils/trpc'
import * as XLSX from 'xlsx'

export default function ManajemenSantriPage() {
    const router = useRouter()
    const utils = trpc.useUtils()
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [page, setPage] = useState(1)
    const [filterRoom, setFilterRoom] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [filterGender, setFilterGender] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
    const [showFilterPanel, setShowFilterPanel] = useState(false)
    const [expandedFilter, setExpandedFilter] = useState<string | null>(null)
    const [showKebab, setShowKebab] = useState(false)
    const filterRef = useRef<HTMLDivElement>(null)
    const kebabRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setShowFilterPanel(false)
                setExpandedFilter(null)
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
    const listQuery = trpc.santri.listCentralized.useQuery({
        search: debouncedSearch || undefined,
        dormRoomId: filterRoom ? Number(filterRoom) : undefined,
        classGroupId: filterClass || undefined,
        sortKey: 'fullName',
        sortDir: 'asc',
        page,
        limit: LIMIT,
    })

    const deleteMut = trpc.santri.delete.useMutation({
        onSuccess: () => { setDeleteTarget(null); utils.santri.listCentralized.invalidate() },
    })

    const { data, isLoading, error } = listQuery
    const activeFilterCount = (filterRoom ? 1 : 0) + (filterClass ? 1 : 0) + (filterGender ? 1 : 0)
    const activeRoomLabel = filterRoom ? (dormRooms ?? []).find((r: any) => String(r.id) === filterRoom)?.name ?? 'Kamar' : ''
    const activeClassLabel = filterClass ? (classGroups ?? []).find((c: any) => c.id === filterClass)?.name ?? 'Kelas' : ''
    const activeGenderLabel = filterGender === 'L' ? 'Laki-laki' : filterGender === 'P' ? 'Perempuan' : ''

    const filteredData = filterGender
        ? (data?.data ?? []).filter((s: any) => s.gender === filterGender)
        : (data?.data ?? [])

    const startIndex = (page - 1) * LIMIT

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            {/* ── Header ── */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">Data Santri</h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {data ? `Menampilkan ${filteredData.length} dari ${data.total} santri` : 'Memuat...'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/master-data/santri/manage/new"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            Tambah Santri
                        </Link>
                        <div className="relative" ref={kebabRef}>
                            <button
                                onClick={() => setShowKebab(!showKebab)}
                                className="w-8 h-8 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 rounded flex items-center justify-center transition"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            {showKebab && (
                                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden animate-fade-in">
                                    <button onClick={() => {
                                        const items = data?.data ?? []
                                        const rows = items.map((s: any) => {
                                            const addr = s.address || {}
                                            return {
                                                'NIS': s.nis, 'Nama Lengkap': s.fullName, 'Gender': s.gender,
                                                'Tanggal Lahir': s.birthDate ? new Date(s.birthDate).toLocaleDateString('id-ID') : '',
                                                'Tempat Lahir': s.birthPlace || '', 'No HP': s.phone || '',
                                                'NIK': s.nik || '', 'No KK': s.noKK || '',
                                                'Tanggal Masuk': s.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString('id-ID') : '',
                                                'Jenjang Pendidikan': s.educationLevel || '',
                                                'Nama Ayah': s.fatherName || '', 'Nama Ibu': s.motherName || '',
                                                'No HP Ayah': s.fatherPhone || '', 'No HP Ibu': s.motherPhone || '',
                                                'Nama Wali': s.waliName || '', 'No HP Wali': s.waliPhone || '',
                                                'Deskripsi Wali Santri': s.description || '',
                                                'Provinsi': addr.provinsi || '', 'Kota/Kabupaten': addr.kota || '',
                                                'Kecamatan': addr.kecamatan || '', 'Kelurahan': addr.kelurahan || '',
                                                'Jalan': addr.jalan || '', 'RT/RW': addr.rt_rw || '',
                                                'Kamar': s.dormRoom?.name || '', 'Kelas': s.classGroup?.name || '',
                                            }
                                        })
                                        const ws = XLSX.utils.json_to_sheet(rows)
                                        const wb = XLSX.utils.book_new()
                                        XLSX.utils.book_append_sheet(wb, ws, 'Data Santri')
                                        XLSX.writeFile(wb, 'data_santri_pusat.xlsx')
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
                    {/* Search */}
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            placeholder="Cari nama atau NIS..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    {/* Filter Button */}
                    <div className="relative" ref={filterRef}>
                        <button
                            type="button"
                            onClick={() => { setShowFilterPanel(!showFilterPanel); setExpandedFilter(null) }}
                            className={`relative h-[30px] px-3 border rounded text-xs font-medium flex items-center gap-1.5 transition ${activeFilterCount > 0
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                            Filter
                            {activeFilterCount > 0 && (
                                <span className="min-w-[16px] h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center px-1">{activeFilterCount}</span>
                            )}
                        </button>

                        {/* Filter Dropdown */}
                        {showFilterPanel && (
                            <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden animate-fade-in">
                                <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-700">Filter</span>
                                    {activeFilterCount > 0 && (
                                        <button onClick={() => { setFilterRoom(''); setFilterClass(''); setFilterGender(''); setPage(1) }}
                                            className="text-[11px] font-medium text-red-500 hover:text-red-700 transition">
                                            Reset semua
                                        </button>
                                    )}
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {/* Kamar Filter */}
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
                                                <button onClick={() => { setFilterRoom(''); setPage(1) }}
                                                    className={`w-full text-left px-5 py-1.5 text-xs transition ${!filterRoom ? 'text-teal-600 font-semibold bg-teal-50' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                    Semua Kamar
                                                </button>
                                                {(dormRooms ?? []).map((room: any) => (
                                                    <button key={room.id} onClick={() => { setFilterRoom(String(room.id)); setPage(1) }}
                                                        className={`w-full text-left px-5 py-1.5 text-xs transition ${filterRoom === String(room.id) ? 'text-teal-600 font-semibold bg-teal-50' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                        {room.floor?.building?.name ? `${room.floor.building.name} — ` : ''}{room.floor?.number != null ? `Lt. ${room.floor.number} — ` : ''}{room.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Kelas Filter */}
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
                                                <button onClick={() => { setFilterClass(''); setPage(1) }}
                                                    className={`w-full text-left px-5 py-1.5 text-xs transition ${!filterClass ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                    Semua Kelas
                                                </button>
                                                {(classGroups ?? []).map((cg: any) => (
                                                    <button key={cg.id} onClick={() => { setFilterClass(cg.id); setPage(1) }}
                                                        className={`w-full text-left px-5 py-1.5 text-xs transition ${filterClass === cg.id ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                        {cg.grade?.level?.name ? `${cg.grade.level.name} — ` : ''}{cg.name}{cg.schoolYear?.name ? ` (${cg.schoolYear.name})` : ''}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Gender Filter */}
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
                                                    <button key={opt.value} onClick={() => { setFilterGender(opt.value); setPage(1) }}
                                                        className={`w-full text-left px-5 py-1.5 text-xs transition ${filterGender === opt.value ? 'text-purple-600 font-semibold bg-purple-50' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                        {opt.label}
                                                    </button>
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
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Jenjang</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kelas</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kamar</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gedung</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kelengkapan</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {error ? (
                            <tr><td colSpan={9} className="px-4 py-10 text-center">
                                <p className="text-xs text-red-600 font-medium">Gagal memuat data</p>
                                <p className="text-xs text-red-400 mt-0.5">{error.message}</p>
                                <button onClick={() => listQuery.refetch()} className="mt-2 px-3 py-1.5 rounded border border-red-200 text-xs text-red-600 hover:bg-red-50 transition">Coba Lagi</button>
                            </td></tr>
                        ) : isLoading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {Array.from({ length: 9 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan={9} className="px-4 py-16 text-center">
                                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <p className="text-sm text-gray-400 font-medium">{search || activeFilterCount ? 'Tidak ada santri yang sesuai filter' : 'Belum ada data santri'}</p>
                            </td></tr>
                        ) : (
                            filteredData.map((santri: any, idx: number) => {
                                const jenjang = santri.classGroup?.grade?.level?.name ?? ''
                                const kelas = santri.classGroup?.name ?? ''
                                const kamar = santri.dormRoom?.name ?? ''
                                const gedung = santri.dormRoom?.floor?.building?.name ?? ''
                                const isComplete = !!(santri.birthDate && santri.birthPlace && santri.phone && santri.fatherName && santri.motherName && santri.classGroup && santri.dormRoom)
                                const completeness = [
                                    santri.birthDate, santri.birthPlace, santri.nik, santri.phone,
                                    santri.fatherName, santri.motherName, santri.address,
                                    santri.classGroup, santri.dormRoom,
                                ].filter(Boolean).length
                                const completenessPercent = Math.round((completeness / 9) * 100)

                                return (
                                    <tr
                                        key={santri.id}
                                        onClick={() => router.push(`/master-data/santri/manage/${santri.id}`)}
                                        className="hover:bg-gray-50/80 cursor-pointer transition group"
                                    >
                                        <td className="px-4 py-2.5">
                                            <span className="text-[11px] text-gray-400">{startIndex + idx + 1}</span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs font-mono font-medium text-gray-700">{santri.nis}</span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div>
                                                <p className="text-xs font-semibold text-gray-900 group-hover:text-emerald-700 transition truncate max-w-[200px]">{santri.fullName}</p>
                                                {santri.birthPlace && santri.birthDate && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{santri.birthPlace}, {new Date(santri.birthDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {jenjang ? (
                                                <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-semibold">{jenjang}</span>
                                            ) : <span className="text-[10px] text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs font-medium text-gray-700">{kelas || <span className="text-gray-300">—</span>}</span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-gray-700">{kamar || <span className="text-gray-300">—</span>}</span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-gray-700">{gedung || <span className="text-gray-300">—</span>}</span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${completenessPercent >= 90 ? 'bg-emerald-500' : completenessPercent >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                                        style={{ width: `${completenessPercent}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-semibold text-gray-600 w-8 text-right">{completenessPercent}%</span>
                                            </div>
                                            {!isComplete && (
                                                <span className="inline-block mt-0.5 px-1.5 py-0 text-[9px] font-bold text-red-500 bg-red-50 rounded">Belum Lengkap</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => router.push(`/master-data/santri/manage/${santri.id}`)}
                                                    className="w-7 h-7 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 text-gray-500 rounded flex items-center justify-center transition"
                                                    title="Lihat Detail"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget({ id: santri.id, name: santri.fullName })}
                                                    className="w-7 h-7 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                                                    title="Hapus"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                    {data ? `Menampilkan ${startIndex + 1}–${Math.min(startIndex + LIMIT, data.total)} dari ${data.total} data` : ''}
                </div>
                {data && data.totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                            className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Prev
                        </button>
                        <div className="flex gap-0.5">
                            {Array.from({ length: data.totalPages }, (_, i) => i + 1).slice(
                                Math.max(0, page - 3), Math.min(data.totalPages, page + 2)
                            ).map((p) => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`w-7 h-7 rounded text-xs font-medium transition ${p === page ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
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

            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">Hapus Santri?</h3>
                            <p className="text-sm text-gray-500 mt-1">Data santri <strong>&quot;{deleteTarget.name}&quot;</strong> akan dihapus. Aksi ini tidak bisa dibatalkan.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={() => deleteMut.mutate(deleteTarget.id)} disabled={deleteMut.isPending}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition shadow-md shadow-red-500/20 disabled:opacity-50">
                                {deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
