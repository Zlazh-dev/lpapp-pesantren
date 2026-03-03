'use client'

import React, { useState } from 'react'
import { trpc } from '@/utils/trpc'

type TargetType = 'all' | 'gender' | 'kamar' | 'kelas'

interface Props {
    model: { id: string; name: string }
    onClose: () => void
    onSuccess: (msg: string) => void
}

export default function ActivateBillingModal({ model, onClose, onSuccess }: Props) {
    const [targetType, setTargetType] = useState<TargetType>('all')
    const [genderValue, setGenderValue] = useState<'L' | 'P'>('L')
    const [kamarId, setKamarId] = useState('')
    const [kelasId, setKelasId] = useState('')
    const [period, setPeriod] = useState('')
    const [periodMode, setPeriodMode] = useState<'GREGORIAN' | 'HIJRI'>('GREGORIAN')
    const [dueAt, setDueAt] = useState('')
    const [previewResult, setPreviewResult] = useState<any>(null)
    const [error, setError] = useState('')

    // Fetch reference data
    const { data: kamars } = trpc.kamar.list.useQuery()
    const { data: classes } = trpc.academic.classes.listAll.useQuery(undefined, { enabled: targetType === 'kelas' })

    const generateMut = trpc.invoice.generateFromModel.useMutation({
        onSuccess: (res) => {
            if (res.dryRun) {
                setPreviewResult(res)
            } else {
                onSuccess(`${res.createdCount} tagihan berhasil dibuat (${res.skippedCount} dilewati)`)
                onClose()
            }
        },
        onError: (e) => setError(e.message),
    })

    const toggleActive = trpc.billingModel.toggleActive.useMutation()

    const buildInput = (dryRun: boolean) => {
        if (!period) return null
        const [yearPart, monthPart] = period.split('-')
        return {
            billingModelId: model.id,
            periodKey: period,
            periodDisplayMode: periodMode,
            periodYear: Number(yearPart) || undefined,
            periodMonth: Number(monthPart) || undefined,
            dueAt: dueAt || undefined,
            dryRun,
            // Scope overrides based on target type
            ...(targetType === 'gender' ? { scopeOverride: { type: 'GENDER' as const, value: genderValue } } : {}),
            ...(targetType === 'kamar' ? { scopeOverride: { type: 'ROOM' as const, refId: kamarId } } : {}),
            ...(targetType === 'kelas' ? { scopeOverride: { type: 'CLASSGROUP' as const, refId: kelasId } } : {}),
        }
    }

    const handlePreview = () => {
        const input = buildInput(true)
        if (input) generateMut.mutate(input)
    }

    const handleGenerate = () => {
        const input = buildInput(false)
        if (!input) return
        // Also activate the model if it's not already
        toggleActive.mutate({ id: model.id, isActive: true })
        generateMut.mutate(input)
    }

    const targets: { value: TargetType; label: string; icon: React.ReactElement }[] = [
        { value: 'all', label: 'Seluruh Santri', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2m22-4l-4.5 4.5M22 7l-4.5-4.5M10 7a4 4 0 11-8 0 4 4 0 018 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0zm-3 3c-3.313 0-6 1.79-6 4v1h12v-1c0-2.21-2.687-4-6-4z" /></svg> },
        { value: 'gender', label: 'Berdasarkan Gender', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
        { value: 'kamar', label: 'Per Kamar', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { value: 'kelas', label: 'Per Kelas', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Aktifkan & Generate Tagihan</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Mengaktifkan <span className="font-semibold text-slate-600">{model.name}</span> dan membuat tagihan untuk target yang dipilih.
                        </p>
                    </div>

                    <div className="p-6 space-y-5">
                        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

                        {/* Target Selection */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Pilih Target</label>
                            <div className="grid grid-cols-2 gap-2">
                                {targets.map(t => (
                                    <button key={t.value}
                                        onClick={() => { setTargetType(t.value); setPreviewResult(null) }}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${targetType === t.value
                                            ? 'border-teal-400 bg-teal-50 text-teal-700'
                                            : 'border-slate-100 text-slate-600 hover:border-slate-200'
                                            }`}
                                    >
                                        {t.icon}
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Target-specific selectors */}
                        {targetType === 'gender' && (
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Jenis Kelamin</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setGenderValue('L')}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${genderValue === 'L' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-500'
                                            }`}>
                                        Laki-laki
                                    </button>
                                    <button onClick={() => setGenderValue('P')}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${genderValue === 'P' ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-slate-100 text-slate-500'
                                            }`}>
                                        Perempuan
                                    </button>
                                </div>
                            </div>
                        )}

                        {targetType === 'kamar' && (
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Pilih Kamar</label>
                                <select value={kamarId} onChange={e => setKamarId(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50">
                                    <option value="">- Pilih Kamar -</option>
                                    {kamars?.map((k: any) => <option key={k.id} value={String(k.id)}>{k.name}</option>)}
                                </select>
                            </div>
                        )}

                        {targetType === 'kelas' && (
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Pilih Kelas</label>
                                <select value={kelasId} onChange={e => setKelasId(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50">
                                    <option value="">- Pilih Kelas -</option>
                                    {(classes as any)?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Period & Due Date */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Mode Kalender</label>
                                <select value={periodMode} onChange={e => setPeriodMode(e.target.value as 'GREGORIAN' | 'HIJRI')}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50">
                                    <option value="GREGORIAN">Masehi</option>
                                    <option value="HIJRI">Hijriah</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Periode</label>
                                <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Jatuh Tempo</label>
                                <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50" />
                            </div>
                        </div>

                        {/* Preview result */}
                        {previewResult && (
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                                <p className="text-sm font-semibold text-blue-800">Preview Hasil:</p>
                                <p className="text-sm text-blue-700">
                                    <strong>{previewResult.wouldCreate}</strong> tagihan akan dibuat dari <strong>{previewResult.targetCount}</strong> santri
                                    ({previewResult.existingCount} sudah ada)
                                </p>
                                {previewResult.totalAmount > 0 && (
                                    <p className="text-sm text-blue-600">
                                        Total: Rp {previewResult.totalAmount?.toLocaleString('id-ID')}/santri
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <button onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition-all">
                            Batal
                        </button>
                        <button onClick={handlePreview}
                            disabled={!period || generateMut.isPending}
                            className="px-4 py-2 rounded-xl border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50 disabled:opacity-50 transition-all">
                            Preview
                        </button>
                        <button onClick={handleGenerate}
                            disabled={!period || generateMut.isPending}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-teal-500/20">
                            {generateMut.isPending ? 'Memproses...' : 'Aktifkan & Generate'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
