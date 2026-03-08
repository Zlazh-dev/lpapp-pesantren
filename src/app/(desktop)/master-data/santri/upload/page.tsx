'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import { TemplateDownloader } from './_components/TemplateDownloader'
import { FileUploader } from './_components/FileUploader'
import { DataPreviewTable } from './_components/DataPreviewTable'
import { UploadResultModal } from './_components/UploadResultModal'

export default function UploadSantriPage() {
    const router = useRouter()
    const [fileName, setFileName] = useState('')
    const [parsedRows, setParsedRows] = useState<any[]>([])
    const [parseError, setParseError] = useState('')
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<{ created: number; updated: number; errors: any[]; total: number } | null>(null)

    const uploadMut = trpc.santriUpload.uploadViaNis.useMutation()

    const handleUpload = async () => {
        if (!parsedRows.length) return
        setUploading(true)
        try {
            const res = await uploadMut.mutateAsync({ rows: parsedRows })
            setResult(res)
        } catch (e: any) {
            setParseError(e.message || 'Upload gagal')
        } finally {
            setUploading(false)
        }
    }

    const handleReset = () => {
        setParsedRows([])
        setResult(null)
        setFileName('')
        setParseError('')
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Upload Data Santri</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Upload data santri via file Excel. NIS sebagai patokan — data yang sama akan di-update.</p>
                </div>
            </div>

            {/* Step 1: Template */}
            <TemplateDownloader />

            {/* Step 2: Upload */}
            <FileUploader
                fileName={fileName}
                onFileNameChange={setFileName}
                onParsed={(rows) => { setParsedRows(rows); setResult(null) }}
                onError={setParseError}
            />

            {/* Error */}
            {parseError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{parseError}</div>
            )}

            {/* Step 3: Preview */}
            {parsedRows.length > 0 && !result && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-800">3. Preview Data ({parsedRows.length} baris)</h3>
                        <button onClick={handleUpload} disabled={uploading}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50">
                            {uploading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Mengupload...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    Upload Sekarang
                                </>
                            )}
                        </button>
                    </div>
                    <DataPreviewTable rows={parsedRows} />
                </div>
            )}

            {/* Result Modal */}
            {result && (
                <UploadResultModal
                    result={result}
                    onUploadAgain={handleReset}
                    onViewList={() => router.push('/master-data/santri/manage')}
                />
            )}
        </div>
    )
}
