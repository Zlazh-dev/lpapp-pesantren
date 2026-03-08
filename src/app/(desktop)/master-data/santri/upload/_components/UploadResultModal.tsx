'use client'

import { createPortal } from 'react-dom'

interface UploadResult {
    created: number
    updated: number
    errors: { row: number; nis: string; message: string }[]
    total: number
}

interface UploadResultModalProps {
    result: UploadResult
    onUploadAgain: () => void
    onViewList: () => void
}

export function UploadResultModal({ result, onUploadAgain, onViewList }: UploadResultModalProps) {
    if (typeof document === 'undefined') return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-fade-in">
                <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Hasil Upload Selesai</h3>
                    <p className="text-sm text-slate-500 mt-1">Total {result.total} baris diproses</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-600">{result.created}</div>
                        <div className="text-xs text-emerald-500 font-medium mt-1">Baru Dibuat</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{result.updated}</div>
                        <div className="text-xs text-blue-500 font-medium mt-1">Diperbarui</div>
                    </div>
                    <div className={`rounded-xl p-4 text-center ${result.errors.length ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <div className={`text-2xl font-bold ${result.errors.length ? 'text-red-600' : 'text-slate-400'}`}>{result.errors.length}</div>
                        <div className={`text-xs font-medium mt-1 ${result.errors.length ? 'text-red-500' : 'text-slate-400'}`}>Dilewati</div>
                    </div>
                </div>

                {result.errors.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-red-600">Detail Baris yang Dilewati:</h4>
                        <div className="max-h-36 overflow-y-auto space-y-1">
                            {result.errors.map((err, i) => (
                                <div key={i} className="text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-red-600">
                                    Baris {err.row} (NIS: {err.nis}): {err.message}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onUploadAgain}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        Upload Lagi
                    </button>
                    <button
                        onClick={onViewList}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-teal-500/20"
                    >
                        Lihat Data Santri
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
