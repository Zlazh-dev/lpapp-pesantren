'use client'

import { useRef, useCallback, useState } from 'react'
import * as XLSX from 'xlsx'
import { TEMPLATE_COLUMNS } from './TemplateDownloader'

interface FileUploaderProps {
    onParsed: (rows: any[]) => void
    onError: (msg: string) => void
    fileName: string
    onFileNameChange: (name: string) => void
}

function buildHeaderMap(): Record<string, string> {
    const map: Record<string, string> = {}
    for (const col of TEMPLATE_COLUMNS) {
        map[col.header] = col.key
        map[col.header.toLowerCase()] = col.key
        map[col.key] = col.key
        map[col.key.toLowerCase()] = col.key
    }
    // Aliases untuk backward compat + variasi input manual
    map['tanggal keluar'] = 'deactivatedAt'
    map['tgl keluar'] = 'deactivatedAt'
    map['deactivatedat'] = 'deactivatedAt'
    map['tanggal lahir'] = 'birthDate'
    map['tgl lahir'] = 'birthDate'
    map['tanggal masuk'] = 'enrollmentDate'
    map['tgl masuk'] = 'enrollmentDate'
    map['rt/rw'] = 'rt_rw'
    map['rtrw'] = 'rt_rw'
    map['rt rw'] = 'rt_rw'
    map['dusun (opsional)'] = 'dusun'
    return map
}

export function FileUploader({ onParsed, onError, fileName, onFileNameChange }: FileUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragOver, setDragOver] = useState(false)

    const processFile = useCallback((file: File) => {
        onError('')
        onFileNameChange(file.name)

        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            onError('File harus berformat .xlsx atau .xls')
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
                    onError('File kosong atau tidak memiliki data')
                    return
                }

                const headerMap = buildHeaderMap()
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
                    onError('Tidak ada baris valid. Pastikan kolom NIS dan Nama Lengkap terisi.')
                    return
                }

                onParsed(rows)
            } catch {
                onError('Gagal membaca file. Pastikan file Excel valid.')
            }
        }
        reader.readAsArrayBuffer(file)
    }, [onParsed, onError, onFileNameChange])

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
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <div className="flex-1 space-y-3">
                    <h3 className="text-base font-bold text-slate-800">2. Upload File Excel</h3>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-400 bg-blue-50/50 scale-[1.01]' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'}`}
                    >
                        <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                        <svg className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-blue-400' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm font-medium text-slate-600">
                            {fileName ? `📄 ${fileName}` : 'Drag & drop file Excel di sini'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">atau klik untuk pilih file (.xlsx)</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
