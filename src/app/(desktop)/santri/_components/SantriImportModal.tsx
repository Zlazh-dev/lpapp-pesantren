'use client'

import { useState, useRef } from 'react'
import { trpc } from '@/utils/trpc'

interface Props { onClose: () => void }

export default function SantriImportModal({ onClose }: Props) {
    const utils = trpc.useUtils()
    const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
    const [file64, setFile64] = useState('')
    const [preview, setPreview] = useState<any>(null)
    const [commitResult, setCommitResult] = useState<any>(null)
    const [error, setError] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)

    const previewMut = trpc.santri.importXlsxPreview.useMutation({
        onSuccess: (data: any) => { setPreview(data); setStep('preview') },
        onError: (err: any) => setError(err.message),
    })

    const commitMut = trpc.santri.importXlsxCommit.useMutation({
        onSuccess: async (data: any) => {
            setCommitResult(data)
            setStep('done')
            await Promise.all([
                utils.santri.list.invalidate(),
                utils.santri.listScoped.invalidate(),
                utils.santri.listCentralized.invalidate(),
            ])
        },
        onError: (err: any) => setError(err.message),
    })

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setError('')
        if (file.size > 10 * 1024 * 1024) { setError('File terlalu besar (maks 10MB)'); return }
        const reader = new FileReader()
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]
            setFile64(base64)
            previewMut.mutate({ fileBase64: base64 })
        }
        reader.readAsDataURL(file)
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">📥 Import Data Santri (Excel)</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                </div>

                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

                {step === 'upload' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">Upload file <code>.xlsx</code> dengan format sesuai template. NIS digunakan sebagai kunci unik — data yang sudah ada akan di-update, data baru akan dibuat.</p>
                        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect}
                            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-teal-50 file:text-teal-700 file:font-semibold hover:file:bg-teal-100" />
                        {previewMut.isPending && <p className="text-sm text-slate-400 animate-pulse">Membaca file...</p>}
                    </div>
                )}

                {step === 'preview' && preview && (
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">✅ {preview.validRows.length} Valid</div>
                            <div className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold">❌ {preview.invalidRows.length} Invalid</div>
                            <div className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm">Total: {preview.totalRows} baris</div>
                        </div>
                        {preview.invalidRows.length > 0 && (
                            <div className="border border-red-100 rounded-xl overflow-hidden">
                                <div className="px-4 py-2 bg-red-50 text-red-700 text-xs font-semibold">Baris Invalid</div>
                                <div className="max-h-40 overflow-y-auto">
                                    {preview.invalidRows.slice(0, 20).map((r: any) => (
                                        <div key={r.rowNumber} className="px-4 py-2 border-t border-red-50 text-sm">
                                            <span className="font-mono text-red-500">Baris {r.rowNumber}</span>: {r.errors.join('; ')}
                                        </div>
                                    ))}
                                    {preview.invalidRows.length > 20 && <div className="px-4 py-2 text-xs text-red-400">...dan {preview.invalidRows.length - 20} lainnya</div>}
                                </div>
                            </div>
                        )}
                        {preview.validRows.length > 0 && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-semibold">Preview Data Valid (maks 10)</div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-t border-slate-100">
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Baris</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">NIS</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Nama</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">L/P</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {preview.validRows.slice(0, 10).map((r: any) => (
                                            <tr key={r.rowNumber}>
                                                <td className="px-3 py-2 text-slate-400 font-mono">{r.rowNumber}</td>
                                                <td className="px-3 py-2 font-mono">{r.data.nis}</td>
                                                <td className="px-3 py-2">{r.data.full_name}</td>
                                                <td className="px-3 py-2">{r.data.gender}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {preview.validRows.length > 10 && <div className="px-4 py-2 text-xs text-slate-400">...dan {preview.validRows.length - 10} baris lainnya</div>}
                            </div>
                        )}
                        <div className="flex gap-3 pt-2">
                            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200">Batal</button>
                            <button onClick={() => commitMut.mutate({ fileBase64: file64 })}
                                disabled={commitMut.isPending || preview.validRows.length === 0}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-teal-500 text-white font-semibold text-sm hover:bg-teal-600 disabled:opacity-50">
                                {commitMut.isPending ? 'Memproses...' : `Proses Import (${preview.validRows.length} baris)`}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'done' && commitResult && (
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                            <p className="font-semibold text-emerald-800">Import Selesai!</p>
                            <div className="flex gap-4 text-sm">
                                <span className="text-emerald-600">🆕 Dibuat: <strong>{commitResult.createdCount}</strong></span>
                                <span className="text-blue-600">🔄 Diupdate: <strong>{commitResult.updatedCount}</strong></span>
                                {commitResult.failedRows.length > 0 && <span className="text-red-600">❌ Gagal: <strong>{commitResult.failedRows.length}</strong></span>}
                            </div>
                        </div>
                        {commitResult.failedRows.length > 0 && (
                            <div className="border border-red-100 rounded-xl overflow-hidden">
                                <div className="px-4 py-2 bg-red-50 text-red-700 text-xs font-semibold">Baris Gagal</div>
                                <div className="max-h-32 overflow-y-auto">
                                    {commitResult.failedRows.slice(0, 10).map((r: any, i: number) => (
                                        <div key={i} className="px-4 py-2 border-t border-red-50 text-sm">
                                            Baris {r.rowNumber} ({r.nis}): {r.reason}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button onClick={onClose} className="w-full px-4 py-2.5 rounded-xl bg-teal-500 text-white font-semibold text-sm hover:bg-teal-600">Selesai</button>
                    </div>
                )}
            </div>
        </div>
    )
}
