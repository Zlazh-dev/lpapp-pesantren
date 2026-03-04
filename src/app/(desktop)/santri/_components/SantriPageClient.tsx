'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { trpc } from '@/utils/trpc'

const SantriImportModal = dynamic(() => import('./SantriImportModal'), { ssr: false })

const BILLING_CHIPS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    LUNAS: { label: 'Lunas', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    SEBAGIAN: { label: 'Sebagian', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    BELUM: { label: 'Belum Lunas', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    NONE: { label: 'Belum ada', bg: 'bg-slate-50', text: 'text-slate-400', dot: 'bg-slate-300' },
}

type SantriPageMode = 'scoped' | 'centralized'

export default function SantriPageClient({ mode = 'scoped' }: { mode?: SantriPageMode }) {
    const utils = trpc.useUtils()
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [page, setPage] = useState(1)
    const [classGroupFilter, setClassGroupFilter] = useState<string | undefined>()
    const [dormRoomFilter, setDormRoomFilter] = useState<number | undefined>()
    const [nisYearFilter, setNisYearFilter] = useState<string | undefined>()
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
    const [showImport, setShowImport] = useState(false)
    const [deletingTarget, setDeletingTarget] = useState<any>(null)

    // Debounced search
    const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null)
    const handleSearch = useCallback((value: string) => {
        setSearch(value)
        if (debounceRef[0]) clearTimeout(debounceRef[0])
        debounceRef[0] = setTimeout(() => { setDebouncedSearch(value); setPage(1) }, 300)
    }, [debounceRef])

    const { data: classGroups } = trpc.academic.classes.listAll.useQuery(undefined, {
        enabled: mode === 'scoped',
    })
    const { data: dormRooms } = trpc.dorm.room.list.useQuery(undefined, {
        enabled: mode === 'scoped',
    })
    const { data: nisYears } = trpc.santri.listNisYears.useQuery(undefined, {
        enabled: mode === 'centralized',
    })

    const listInput = {
        search: debouncedSearch || undefined,
        classGroupId: classGroupFilter,
        dormRoomId: dormRoomFilter,
        nisYearPrefix: nisYearFilter,
        sortKey: 'nis' as const,
        sortDir,
        page,
        limit: 12,
    } as const

    const scopedListQuery = trpc.santri.listScoped.useQuery(listInput, {
        enabled: mode === 'scoped',
    })
    const centralizedListQuery = trpc.santri.listCentralized.useQuery(listInput, {
        enabled: mode === 'centralized',
    })

    const activeListQuery = mode === 'centralized' ? centralizedListQuery : scopedListQuery
    const data = activeListQuery.data
    const isLoading = activeListQuery.isLoading
    const error = activeListQuery.error
    const scopeInfo = mode === 'scoped' ? scopedListQuery.data?.scopeInfo : null
    const canManage = mode === 'centralized'

    const deleteMut = trpc.santri.delete.useMutation({
        onSuccess: async () => {
            await Promise.all([
                utils.santri.list.invalidate(),
                utils.santri.listScoped.invalidate(),
                utils.santri.listCentralized.invalidate(),
            ])
        },
    })

    const templateMut = trpc.santri.templateXlsx.useMutation({
        onSuccess: (data: any) => {
            const bin = atob(data.base64)
            const bytes = new Uint8Array(bin.length)
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
            const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = data.filename; a.click()
            URL.revokeObjectURL(url)
        },
    })

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {canManage ? 'Manajemen Data Santri' : 'Data Santri'}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {canManage
                            ? 'Halaman terpusat untuk pengelolaan seluruh data santri.'
                            : 'Halaman operasional berbasis scope kamar/kelas yang terpasang ke user.'}
                    </p>
                </div>
                {canManage ? (
                    <div className="flex items-center gap-2">
                        <button onClick={() => templateMut.mutate()} disabled={templateMut.isPending}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1.5 disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            {templateMut.isPending ? '...' : 'Template'}
                        </button>
                        <button onClick={() => setShowImport(true)}
                            className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-all flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Import Excel
                        </button>
                        <Link href="/santri/new"
                            className="px-5 py-2.5 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 transition-all shadow-lg shadow-teal-500/25 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Tambah Santri
                        </Link>
                    </div>
                ) : (
                    <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-700">
                        Data dibatasi sesuai scope user.
                    </div>
                )}
            </div>

            {/* Search + Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                {/* NIS Tahun Quick Filter — centralized mode only */}
                {mode === 'centralized' && nisYears && nisYears.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tahun Masuk:</span>
                        <button
                            onClick={() => { setNisYearFilter(undefined); setPage(1) }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${!nisYearFilter
                                    ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}>
                            Semua
                        </button>
                        {nisYears.map((yr: string) => (
                            <button key={yr}
                                onClick={() => { setNisYearFilter(yr === nisYearFilter ? undefined : yr); setPage(1) }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${nisYearFilter === yr
                                        ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200'
                                    }`}>
                                20{yr}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[240px]">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input type="text" placeholder="Cari nama atau NIS santri..."
                            value={search} onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all" />
                    </div>
                    {mode === 'scoped' && (
                        <>
                            <select value={classGroupFilter ?? ''} onChange={(e) => { setClassGroupFilter(e.target.value || undefined); setPage(1) }}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all">
                                <option value="">Semua Rombel</option>
                                {classGroups?.map((cg: any) => (
                                    <option key={cg.id} value={cg.id}>{cg.name} ({cg._count.santri})</option>
                                ))}
                            </select>
                            <select value={dormRoomFilter ?? ''} onChange={(e) => { setDormRoomFilter(e.target.value ? parseInt(e.target.value) : undefined); setPage(1) }}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all">
                                <option value="">Semua Kamar</option>
                                {dormRooms?.map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.name} - {r.floor?.building?.complex?.name} ({r._count.assignments})</option>
                                ))}
                            </select>
                        </>
                    )}
                    <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50 transition-all flex items-center gap-1.5 text-slate-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                        NIS {sortDir === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
                {/* Active Filter Chips */}
                {mode === 'scoped' && (classGroupFilter || dormRoomFilter) && (
                    <div className="flex flex-wrap items-center gap-2">
                        {classGroupFilter && (() => {
                            const cg = classGroups?.find((c: any) => c.id === classGroupFilter)
                            return cg ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                    📚 Rombel: {cg.name}
                                    <button onClick={() => { setClassGroupFilter(undefined); setPage(1) }} className="text-blue-400 hover:text-blue-600 font-bold">×</button>
                                </span>
                            ) : null
                        })()}
                        {dormRoomFilter && (() => {
                            const rm = dormRooms?.find((r: any) => r.id === dormRoomFilter)
                            return rm ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-medium border border-teal-100">
                                    🏠 Kamar: {rm.floor?.building?.complex?.name} • {rm.floor?.building?.name} • Lt {rm.floor?.number} • {rm.name}
                                    <button onClick={() => { setDormRoomFilter(undefined); setPage(1) }} className="text-teal-400 hover:text-teal-600 font-bold">×</button>
                                </span>
                            ) : null
                        })()}
                        <button onClick={() => { setClassGroupFilter(undefined); setDormRoomFilter(undefined); setSearch(''); setDebouncedSearch(''); setPage(1) }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium hover:bg-slate-200 transition-colors">
                            Reset filter
                        </button>
                    </div>
                )}
            </div>

            {/* Card Grid */}
            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                    Gagal memuat data santri: {error.message}
                </div>
            ) : isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-20 h-20 rounded-full bg-slate-200" />
                                <div className="h-4 w-32 bg-slate-200 rounded" />
                                <div className="h-3 w-20 bg-slate-100 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : data?.data.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {data.data.map((santri: any) => {
                        const chip = BILLING_CHIPS[santri.billingSummary] ?? BILLING_CHIPS.NONE
                        const isComplete = !!(santri.birthDate && santri.birthPlace && santri.phone && santri.fatherName && santri.motherName && santri.classGroup && santri.dormRoom)
                        return (
                            <div key={santri.id}
                                className={`group rounded-2xl border overflow-hidden hover:shadow-xl transition-all duration-300 relative ${isComplete
                                    ? 'bg-white border-slate-200 hover:shadow-slate-200/50 hover:border-teal-200'
                                    : 'bg-red-50/40 border-red-200 hover:shadow-red-200/40 hover:border-red-300'
                                    }`}>
                                {canManage && (
                                    <button onClick={() => setDeletingTarget(santri)}
                                        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 z-10"
                                        title="Hapus">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                                <div className={`h-16 relative ${isComplete
                                    ? 'bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-500'
                                    : 'bg-gradient-to-br from-red-400 via-red-500 to-rose-500'
                                    }`}>
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent)]" />
                                    {!isComplete && (
                                        <div className="absolute bottom-1.5 right-2 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-bold text-red-600 uppercase tracking-wide">
                                            Data Belum Lengkap
                                        </div>
                                    )}
                                </div>
                                <div className="px-5 pb-5 -mt-10 flex flex-col items-center text-center">
                                    <Link href={`/santri/${santri.id}`} className="relative">
                                        {santri.photoUrl ? (
                                            <Image src={santri.photoUrl} alt={santri.fullName} width={80} height={80}
                                                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                                                {santri.fullName.charAt(0)}
                                            </div>
                                        )}
                                    </Link>
                                    <Link href={`/santri/${santri.id}`} className="mt-3 hover:text-teal-600 transition-colors">
                                        <h3 className="font-bold text-slate-800 text-base leading-tight">{santri.fullName}</h3>
                                    </Link>
                                    <p className="text-slate-400 text-sm mt-0.5 font-mono">NIS: {santri.nis}</p>
                                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                                        {santri.dormRoom && (
                                            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium border border-teal-100">
                                                {santri.dormRoom.floor?.building?.complex?.name ? santri.dormRoom.floor.building.complex.name + ' • ' : ''}{santri.dormRoom.name}
                                            </span>
                                        )}
                                        {santri.classGroup && (
                                            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                                {santri.classGroup.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="w-full h-px bg-slate-100 my-4" />
                                    <div className="w-full grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</p>
                                            <div className="mt-1 flex items-center justify-center gap-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />
                                                <span className={`text-xs font-semibold ${chip.text}`}>{chip.label}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Tagihan</p>
                                            <p className="text-sm font-bold text-slate-700 mt-1">{santri.totalBills}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Lunas</p>
                                            <p className="text-sm font-bold text-emerald-600 mt-1">{santri.paidBills}/{santri.totalBills}</p>
                                        </div>
                                    </div>
                                    <div className="w-full h-px bg-slate-100 my-4" />
                                    <div className="w-full flex gap-2">
                                        <Link href={`/master-data/santri/${santri.id}`}
                                            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold text-center hover:opacity-90 transition-all shadow-md shadow-teal-500/20">
                                            Detail Santri
                                        </Link>
                                        {canManage && (
                                            <Link href={`/master-data/santri/${santri.id}?edit=true`}
                                                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-all"
                                                title="Edit">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                            <p className="text-slate-500 font-medium">
                                {search
                                    ? 'Tidak ada santri yang sesuai pencarian'
                                    : mode === 'scoped' && scopeInfo && !scopeInfo.hasRelevantScope
                                        ? 'Anda belum memiliki scope santri yang relevan'
                                        : 'Belum ada data santri'}
                            </p>
                            <p className="text-slate-400 text-sm mt-1">
                                {mode === 'scoped' && scopeInfo && !scopeInfo.hasRelevantScope
                                    ? 'Hubungi admin untuk assign scope kamar, gedung, kompleks, atau rombel.'
                                    : 'Mulai dengan menambahkan santri pertama'}
                            </p>
                        </div>
                        {!search && canManage && (
                            <Link href="/santri/new" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white gradient-primary hover:opacity-90 transition-all shadow-lg shadow-teal-500/25">
                                + Tambah Santri
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between px-1">
                    <p className="text-sm text-slate-500">
                        Halaman {data.page} dari {data.totalPages} <span className="text-slate-400">({data.total} santri)</span>
                    </p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(1)} disabled={page <= 1}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs hover:bg-slate-50 disabled:opacity-40 transition-colors">⟨⟨</button>
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-50 disabled:opacity-40 transition-colors">← Prev</button>
                        <span className="px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-sm font-semibold">{page}</span>
                        <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-50 disabled:opacity-40 transition-colors">Next →</button>
                        <button onClick={() => setPage(data.totalPages)} disabled={page >= data.totalPages}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs hover:bg-slate-50 disabled:opacity-40 transition-colors">⟩⟩</button>
                    </div>
                </div>
            )}

            {/* Import Modal — lazy loaded */}
            {canManage && showImport && <SantriImportModal onClose={() => setShowImport(false)} />}

            {/* Delete Confirmation Modal */}
            {deletingTarget && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeletingTarget(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-800">Hapus Santri?</h3>
                            <p className="text-sm text-slate-500 mt-1">Data santri <strong>&quot;{deletingTarget.fullName}&quot;</strong> akan dihapus secara permanen.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setDeletingTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                            <button onClick={() => { deleteMut.mutate(deletingTarget.id); setDeletingTarget(null) }} disabled={deleteMut.isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-all shadow-md shadow-red-500/20 disabled:opacity-50">
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



