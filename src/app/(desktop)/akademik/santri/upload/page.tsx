'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import * as XLSX from 'xlsx'

const TEMPLATE_COLUMNS = [
    { header: 'NIS', key: 'nis', required: true },
    { header: 'Nama Lengkap', key: 'fullName', required: true },
    { header: 'Kelas', key: 'className', required: false },
]

export default function UploadAkademikSantriPage() {
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragOver, setDragOver] = useState(false)
    const [fileName, setFileName] = useState('')
    const [parsedRows, setParsedRows] = useState<any[]>([])
    const [parseError, setParseError] = useState('')
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<{ added: number; skipped: number; classUpdated: number; errors: any[]; total: number } | null>(null)

    const { data: classGroups } = trpc.academic.classes.listAll.useQuery(undefined, { staleTime: 60_000 })
    const uploadMut = trpc.sectionMember.bulkAddByNis.useMutation()

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            TEMPLATE_COLUMNS.map(c => c.header),
            // Example row
            ['12345', 'Ahmad Fauzi', classGroups?.[0]?.name ?? '7A'],
        ])
        ws['!cols'] = TEMPLATE_COLUMNS.map(c => ({ wch: Math.max(c.header.length + 5, 20) }))
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template Santri Madrasah')
        XLSX.writeFile(wb, 'template_upload_santri_madrasah.xlsx')
    }

    const processFile = useCallback((file: File) => {
        setParseError('')
        setParsedRows([])
        setResult(null)
        setFileName(file.name)

        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setParseError('File harus berformat .xlsx atau .xls')
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const wb = XLSX.read(data, { type: 'array' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json<any>(ws, { defval: '' })

                if (!jsonData.length) {
                    setParseError('File kosong atau tidak memiliki data')
                    return
                }

                const headerMap: Record<string, string> = {}
                for (const col of TEMPLATE_COLUMNS) {
                    headerMap[col.header] = col.key
                    headerMap[col.header.toLowerCase()] = col.key
                    headerMap[col.key] = col.key
                    headerMap[col.key.toLowerCase()] = col.key
                }

                const rows = jsonData.map((row: any) => {
                    const mapped: any = {}
                    for (const [rawKey, value] of Object.entries(row)) {
                        const key = headerMap[rawKey] || headerMap[rawKey.toLowerCase().trim()]
                        if (key && value !== '' && value !== null && value !== undefined) {
                            mapped[key] = String(value).trim()
                        }
                    }
                    return mapped
                }).filter((r: any) => r.nis && r.fullName)

                if (!rows.length) {
                    setParseError('Tidak ada baris valid. Pastikan kolom NIS dan Nama Lengkap terisi.')
                    return
                }

                setParsedRows(rows)
            } catch {
                setParseError('Gagal membaca file. Pastikan file Excel valid.')
            }
        }
        reader.readAsArrayBuffer(file)
    }, [])

    const handleUpload = async () => {
        if (!parsedRows.length) return
        setUploading(true)
        try {
            const res = await uploadMut.mutateAsync({ section: 'AKADEMIK', rows: parsedRows })
            setResult(res)
        } catch (e: any) {
            setParseError(e.message || 'Upload gagal')
        } finally {
            setUploading(false)
        }
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) processFile(file)
    }, [processFile])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) processFile(file)
    }, [processFile])

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Upload Santri Madrasah</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Upload santri ke bagian Madrasah. Santri harus sudah terdaftar di Data Pusat.</p>
                </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="text-sm text-blue-700">
                    <strong>Catatan:</strong> Santri harus sudah terdaftar di <strong>Data Pusat</strong>. Upload ini hanya menambahkan mereka ke bagian Madrasah dan mengatur kelasnya.
                    {classGroups && classGroups.length > 0 && (
                        <span className="block mt-1 text-blue-600">Kelas tersedia: {(classGroups as any[]).map((c: any) => c.name).join(', ')}</span>
                    )}
                </div>
            </div>

            {/* Step 1 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-800">1. Download Template</h3>
                        <p className="text-sm text-slate-500 mt-1">Template hanya berisi 3 kolom: <strong>NIS</strong> (wajib), <strong>Nama</strong> (wajib), dan <strong>Kelas</strong> (opsional).</p>
                        <button onClick={downloadTemplate} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download Template
                        </button>
                    </div>
                </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <div className="flex-1 space-y-3">
                        <h3 className="text-base font-bold text-slate-800">2. Upload File Excel</h3>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-400 bg-blue-50/50 scale-[1.01]' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'}`}>
                            <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                            <svg className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-blue-400' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm font-medium text-slate-600">{fileName ? `📄 ${fileName}` : 'Drag & drop file Excel di sini'}</p>
                            <p className="text-xs text-slate-400 mt-1">atau klik untuk pilih file (.xlsx)</p>
                        </div>
                        {parseError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{parseError}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview */}
            {parsedRows.length > 0 && !result && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-800">3. Preview Data ({parsedRows.length} baris)</h3>
                        <button onClick={handleUpload} disabled={uploading}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50">
                            {uploading ? (
                                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Mengupload...</>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Upload Sekarang</>
                            )}
                        </button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-3 py-2 text-left font-semibold text-slate-500">#</th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-500">NIS</th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Nama</th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Kelas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {parsedRows.slice(0, 20).map((r: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                                        <td className="px-3 py-2 font-medium text-slate-700">{r.nis}</td>
                                        <td className="px-3 py-2 text-slate-700">{r.fullName}</td>
                                        <td className="px-3 py-2 text-slate-500">{r.className || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {parsedRows.length > 20 && (
                            <div className="px-3 py-2 bg-slate-50 text-xs text-slate-400 text-center">... dan {parsedRows.length - 20} baris lainnya</div>
                        )}
                    </div>
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-800">✅ Hasil Upload</h3>
                    <div className="grid grid-cols-4 gap-3">
                        <div className="bg-emerald-50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-emerald-600">{result.added}</div>
                            <div className="text-xs text-emerald-500 font-medium mt-1">Ditambahkan</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-slate-400">{result.skipped}</div>
                            <div className="text-xs text-slate-400 font-medium mt-1">Sudah Ada</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{result.classUpdated}</div>
                            <div className="text-xs text-blue-500 font-medium mt-1">Kelas Diupdate</div>
                        </div>
                        <div className={`rounded-xl p-4 text-center ${result.errors.length ? 'bg-red-50' : 'bg-slate-50'}`}>
                            <div className={`text-2xl font-bold ${result.errors.length ? 'text-red-600' : 'text-slate-400'}`}>{result.errors.length}</div>
                            <div className={`text-xs font-medium mt-1 ${result.errors.length ? 'text-red-500' : 'text-slate-400'}`}>Error</div>
                        </div>
                    </div>
                    {result.errors.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-red-600">Detail Error:</h4>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {result.errors.map((err: any, i: number) => (
                                    <div key={i} className="text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-red-600">
                                        Baris {err.row} (NIS: {err.nis}): {err.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button onClick={() => { setParsedRows([]); setResult(null); setFileName('') }}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                            Upload Lagi
                        </button>
                        <button onClick={() => router.push('/akademik/santri')}
                            className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-all">
                            Lihat Data Santri
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
