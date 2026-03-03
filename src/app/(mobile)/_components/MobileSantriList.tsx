'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import * as XLSX from 'xlsx'

/* ─── Consistent mobile button/kebab sizes ─── */
// Primary button:  h-10 px-4 text-sm rounded-xl
// Kebab button:    w-10 h-10 rounded-xl
// Filter button:   w-10 h-10 rounded-xl
// Search input:    h-10 text-sm rounded-xl

type PageVariant = 'master-data' | 'akademik' | 'keuangan'

interface MobileSantriListProps {
    variant: PageVariant
}

const PAGE_CONFIG: Record<PageVariant, {
    title: string
    subtitle: string
    addLabel: string
    addHref?: string
    addSection?: string
    detailPrefix: string
    uploadHref: string
    excelFilename: string
    gradient: string
}> = {
    'master-data': {
        title: 'Data Santri Aktif',
        subtitle: 'Kelola seluruh data santri pesantren.',
        addLabel: 'Tambah',
        addHref: '/m-master-data/santri/manage/new',
        detailPrefix: '/m-master-data/santri/manage',
        uploadHref: '/m-master-data/santri/upload',
        excelFilename: 'data_santri_pusat.xlsx',
        gradient: 'from-emerald-500 to-teal-500',
    },
    'akademik': {
        title: 'Data Santri',
        subtitle: 'Data santri bagian madrasah.',
        addLabel: 'Tambah',
        addSection: 'AKADEMIK',
        detailPrefix: '/m-akademik/santri',
        uploadHref: '/m-akademik/santri/upload',
        excelFilename: 'data_santri_madrasah.xlsx',
        gradient: 'from-blue-500 to-indigo-500',
    },
    'keuangan': {
        title: 'Data Santri',
        subtitle: 'Data santri bagian keuangan.',
        addLabel: 'Tambah',
        addSection: 'KEUANGAN',
        detailPrefix: '/m-keuangan/santri',
        uploadHref: '/m-master-data/santri/upload',
        excelFilename: 'data_santri_keuangan.xlsx',
        gradient: 'from-teal-500 to-emerald-500',
    },
}

export default function MobileSantriList({ variant }: MobileSantriListProps) {
    const config = PAGE_CONFIG[variant]
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [page, setPage] = useState(1)
    const [showKebab, setShowKebab] = useState(false)
    const [showFilter, setShowFilter] = useState(false)
    const [filterGender, setFilterGender] = useState('')
    const kebabRef = useRef<HTMLDivElement>(null)

    // Add modal (for section-based pages)
    const [showAddModal, setShowAddModal] = useState(false)
    const [nisInput, setNisInput] = useState('')
    const [addError, setAddError] = useState('')
    const [addSuccess, setAddSuccess] = useState('')

    const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null)
    const handleSearch = useCallback((value: string) => {
        setSearch(value)
        if (debounceRef[0]) clearTimeout(debounceRef[0])
        debounceRef[0] = setTimeout(() => { setDebouncedSearch(value); setPage(1) }, 300)
    }, [debounceRef])

    // Close kebab menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) setShowKebab(false)
        }
        if (showKebab) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showKebab])

    // Queries
    const masterQuery = trpc.santri.listCentralized.useQuery(
        { search: debouncedSearch || undefined, page, limit: 20, sortKey: 'fullName', sortDir: 'asc' },
        { enabled: variant === 'master-data' }
    )
    const sectionQuery = trpc.sectionMember.list.useQuery(
        { section: config.addSection as 'AKADEMIK' | 'KEUANGAN', search: debouncedSearch || undefined, page, limit: 20 },
        { enabled: variant !== 'master-data' }
    )

    const addMut = trpc.sectionMember.addByNis.useMutation({
        onSuccess: (result) => {
            setAddSuccess(`"${result.santri.fullName}" berhasil ditambahkan!`)
            setNisInput('')
            setAddError('')
            sectionQuery.refetch()
        },
        onError: (err) => { setAddError(err.message); setAddSuccess('') },
    })

    const handleAddByNis = () => {
        if (!nisInput.trim() || !config.addSection) return
        setAddError(''); setAddSuccess('')
        addMut.mutate({ nis: nisInput.trim(), section: config.addSection as 'AKADEMIK' | 'KEUANGAN' })
    }

    // Normalize data shape
    const rawData = variant === 'master-data' ? masterQuery.data : sectionQuery.data
    const isLoading = variant === 'master-data' ? masterQuery.isLoading : sectionQuery.isLoading
    const error = variant === 'master-data' ? masterQuery.error : sectionQuery.error
    const items: any[] = variant === 'master-data' ? (rawData as any)?.data ?? [] : (rawData as any)?.items ?? []
    const total: number = (rawData as any)?.total ?? 0
    const totalPages: number = (rawData as any)?.totalPages ?? 1

    // Client-side gender filter
    const filtered = filterGender ? items.filter((s: any) => s.gender === filterGender) : items

    const exportExcel = () => {
        const rows = items.map((s: any) => ({
            'NIS': s.nis, 'Nama': s.fullName, 'L/P': s.gender,
            'Kelas': s.classGroup?.name || '', 'Kamar': s.dormRoom?.name || '',
            'No HP': s.phone || '',
        }))
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Data')
        XLSX.writeFile(wb, config.excelFilename)
        setShowKebab(false)
    }

    return (
        <>
            <div className="space-y-4 animate-fade-in">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-slate-800">{config.title}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{config.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Add button */}
                        {config.addHref ? (
                            <Link href={config.addHref}
                                className={`h-10 px-4 rounded-xl bg-gradient-to-r ${config.gradient} text-white text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition-all shadow-md`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                {config.addLabel}
                            </Link>
                        ) : (
                            <button onClick={() => { setShowAddModal(true); setNisInput(''); setAddError(''); setAddSuccess('') }}
                                className={`h-10 px-4 rounded-xl bg-gradient-to-r ${config.gradient} text-white text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition-all shadow-md`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                {config.addLabel}
                            </button>
                        )}
                        {/* Kebab */}
                        <div className="relative" ref={kebabRef}>
                            <button onClick={() => setShowKebab(!showKebab)}
                                className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            {showKebab && (
                                <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl border border-slate-100 bg-white shadow-xl overflow-hidden animate-fade-in">
                                    <button onClick={exportExcel} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Export Excel
                                    </button>
                                    <button onClick={() => { router.push(config.uploadHref); setShowKebab(false) }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-50">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        Upload Excel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search + Filter */}
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="p-3 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    value={search}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Cari nama atau NIS..."
                                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm bg-slate-50/50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                                />
                            </div>
                            <button onClick={() => setShowFilter(!showFilter)}
                                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${filterGender ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                            </button>
                        </div>
                        {showFilter && (
                            <div className="flex gap-2 mt-2">
                                {[{ v: '', l: 'Semua' }, { v: 'L', l: 'Putra' }, { v: 'P', l: 'Putri' }].map(o => (
                                    <button key={o.v} onClick={() => { setFilterGender(o.v); setPage(1) }}
                                        className={`px-3 h-8 rounded-lg text-xs font-medium border transition-all ${filterGender === o.v ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                        {o.l}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                            {filterGender && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 pl-2 pr-1 py-0.5 text-[10px] font-medium text-emerald-700">
                                    {filterGender === 'L' ? 'Putra' : 'Putri'}
                                    <button onClick={() => { setFilterGender(''); setPage(1) }} className="w-3.5 h-3.5 rounded-full hover:bg-emerald-200 flex items-center justify-center text-[8px]">✕</button>
                                </span>
                            )}
                            <span className="ml-auto text-[11px] text-slate-400">{total} santri</span>
                        </div>
                    </div>

                    {/* Results */}
                    {error ? (
                        <div className="px-4 py-10 text-center">
                            <p className="text-sm text-red-500 font-medium">Gagal memuat data</p>
                            <p className="text-xs text-red-400 mt-1">{error.message}</p>
                        </div>
                    ) : isLoading ? (
                        <div className="divide-y divide-slate-50">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 animate-pulse bg-slate-50/50" />)}
                        </div>
                    ) : !filtered.length ? (
                        <div className="py-16 text-center">
                            <p className="text-sm text-slate-400">{search ? 'Tidak ditemukan' : 'Belum ada data'}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {filtered.map((s: any) => {
                                const kelas = s.classGroup?.name ?? ''
                                const isComplete = !!(
                                    s.birthDate && s.birthPlace && s.phone &&
                                    s.fatherName && s.motherName &&
                                    s.classGroup && s.dormRoom
                                )
                                return (
                                    <Link key={s.id} href={`${config.detailPrefix}/${s.id}`}
                                        className={`flex items-center gap-3 px-4 py-3 active:bg-slate-50 transition-colors relative ${!isComplete ? 'bg-red-50/60' : ''}`}>
                                        {/* Incomplete side accent */}
                                        {!isComplete && (
                                            <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-red-400" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{s.fullName}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-slate-400 font-mono">{s.nis}</p>
                                                {!isComplete && (
                                                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">Belum Lengkap</span>
                                                )}
                                            </div>
                                        </div>
                                        {kelas && <span className="shrink-0 text-[11px] text-slate-500 font-medium">{kelas}</span>}
                                        <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${s.gender === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>{s.gender}</span>
                                        <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </Link>
                                )
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-50 bg-slate-50/30">
                            <span className="text-[11px] text-slate-400">Hal {page}/{totalPages}</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all">←</button>
                                <span className="h-8 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center">{page}</span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all">→</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add by NIS Modal (bottom sheet) */}
            {showAddModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowAddModal(false)}>
                    <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 pb-8 shadow-2xl space-y-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-2" />
                        <h3 className="text-lg font-bold text-slate-800">Tambah Santri</h3>
                        <p className="text-sm text-slate-500">Masukkan NIS santri yang sudah terdaftar di Data Pusat.</p>
                        <div className="flex gap-2">
                            <input value={nisInput} onChange={(e) => setNisInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddByNis()}
                                placeholder="Masukkan NIS..."
                                autoFocus
                                className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all" />
                            <button onClick={handleAddByNis} disabled={!nisInput.trim() || addMut.isPending}
                                className="h-10 px-5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50">
                                {addMut.isPending ? '...' : 'Cari'}
                            </button>
                        </div>
                        {addError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{addError}</p>}
                        {addSuccess && <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">{addSuccess}</p>}
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
