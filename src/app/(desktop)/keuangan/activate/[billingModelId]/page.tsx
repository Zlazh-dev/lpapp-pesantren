'use client'

import React, { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'

type TargetType = 'all' | 'gender' | 'kamar' | 'kelas'

export default function ActivateBillingPage({ params }: { params: Promise<{ billingModelId: string }> }) {
    const { billingModelId } = use(params)
    const router = useRouter()

    const [targetType, setTargetType] = useState<TargetType>('all')
    const [genderValue, setGenderValue] = useState<'L' | 'P'>('L')
    const [kamarId, setKamarId] = useState('')
    const [kelasId, setKelasId] = useState('')
    const [period, setPeriod] = useState('')
    const [periodMode, setPeriodMode] = useState<'GREGORIAN' | 'HIJRI'>('GREGORIAN')
    const [dueAt, setDueAt] = useState('')
    const [previewResult, setPreviewResult] = useState<any>(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [generatedCount, setGeneratedCount] = useState(0)

    const { data: model, isLoading } = trpc.billingModel.getById.useQuery(billingModelId)
    const { data: kamars } = trpc.kamar.list.useQuery()
    const { data: classes } = trpc.academic.classes.listAll.useQuery(undefined, { enabled: targetType === 'kelas' })

    const generateMut = trpc.invoice.generateFromModel.useMutation({
        onSuccess: (res) => {
            if (res.dryRun) {
                setPreviewResult(res)
            } else {
                setGeneratedCount(res.createdCount ?? 0)
                setSuccess(true)
            }
        },
        onError: (e) => setError(e.message),
    })
    const toggleActive = trpc.billingModel.toggleActive.useMutation()

    const fmtRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')
    const totalAmount = model?.items?.reduce((s: number, i: any) => s + i.amount, 0) || model?.defaultAmount || 0

    const buildInput = (dryRun: boolean) => {
        if (!period) return null
        const [yearPart, monthPart] = period.split('-')
        return {
            billingModelId,
            periodKey: period,
            periodDisplayMode: periodMode,
            periodYear: Number(yearPart) || undefined,
            periodMonth: Number(monthPart) || undefined,
            dueAt: dueAt || undefined,
            dryRun,
            ...(targetType === 'gender' ? { scopeOverride: { type: 'GENDER' as const, value: genderValue } } : {}),
            ...(targetType === 'kamar' ? { scopeOverride: { type: 'ROOM' as const, refId: kamarId } } : {}),
            ...(targetType === 'kelas' ? { scopeOverride: { type: 'CLASSGROUP' as const, refId: kelasId } } : {}),
        }
    }

    const handlePreview = () => {
        setError('')
        const input = buildInput(true)
        if (input) generateMut.mutate(input)
    }

    const handleGenerate = () => {
        setError('')
        const input = buildInput(false)
        if (!input) return
        if (!model?.isActive) toggleActive.mutate({ id: billingModelId, isActive: true })
        generateMut.mutate(input)
    }

    const targets: { value: TargetType; label: string; desc: string; icon: React.ReactElement }[] = [
        {
            value: 'all', label: 'Seluruh Santri', desc: 'Berlaku untuk semua santri yang terdaftar',
            icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0zm-3 3c-3.313 0-6 1.79-6 4v1h12v-1c0-2.21-2.687-4-6-4z" /></svg>,
        },
        {
            value: 'gender', label: 'Berdasarkan Gender', desc: 'Hanya santri laki-laki atau perempuan',
            icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
        },
        {
            value: 'kamar', label: 'Per Kamar', desc: 'Hanya santri di kamar tertentu',
            icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
        },
        {
            value: 'kelas', label: 'Per Kelas', desc: 'Hanya santri di kelas tertentu',
            icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
        },
    ]

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse w-72" />
                <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
                <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            </div>
        )
    }

    if (!model) {
        return (
            <div className="max-w-3xl mx-auto text-center py-20">
                <p className="text-lg font-medium text-slate-500">Sistem billing tidak ditemukan</p>
                <Link href="/keuangan" className="mt-4 inline-flex px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Kembali
                </Link>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="max-w-3xl mx-auto animate-fade-in">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                        <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Tagihan Berhasil Di-generate!</h2>
                    <p className="text-sm text-slate-500">
                        {generatedCount} tagihan baru telah dibuat untuk <strong>{model.name}</strong>.
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-4">
                        <Link href="/keuangan"
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold shadow-md shadow-teal-500/20 hover:opacity-90 transition-all">
                            Kembali ke Keuangan
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/keuangan"
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:shadow-sm transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Aktifkan & Generate Tagihan</h1>
                    <p className="text-sm text-slate-400">Mengaktifkan dan membuat tagihan untuk <span className="font-semibold text-slate-600">{model.name}</span></p>
                </div>
            </div>

            {/* Model Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">{model.name}</h3>
                        {model.description && <p className="text-sm text-slate-400 mt-0.5">{model.description}</p>}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${model.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {model.isActive ? 'Aktif' : 'Nonaktif — akan diaktifkan'}
                    </span>
                </div>
                <div className="flex gap-4 mt-3 text-sm">
                    <div><span className="text-slate-400">Periode:</span> <span className="font-medium">{model.periodType === 'bulanan' ? 'Bulanan' : model.periodType === 'tahunan' ? 'Tahunan' : 'Sekali Bayar'}</span></div>
                    <div><span className="text-slate-400">Total:</span> <span className="font-bold text-teal-600">{fmtRp(totalAmount)}</span></div>
                </div>
                {model.items && model.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                        {model.items.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">{item.label}</span>
                                <span className="font-medium text-slate-700">{fmtRp(item.amount)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

            {/* Target Selection */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <h2 className="text-base font-bold text-slate-800">Pilih Target Santri</h2>
                <div className="grid grid-cols-2 gap-3">
                    {targets.map(t => (
                        <button key={t.value}
                            onClick={() => { setTargetType(t.value); setPreviewResult(null) }}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${targetType === t.value
                                ? 'border-teal-400 bg-teal-50/50'
                                : 'border-slate-100 hover:border-slate-200'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${targetType === t.value ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'
                                }`}>
                                {t.icon}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">{t.label}</p>
                                <p className="text-[11px] text-slate-400">{t.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Target-specific inputs */}
                {targetType === 'gender' && (
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Jenis Kelamin</label>
                        <div className="flex gap-3">
                            <button onClick={() => setGenderValue('L')}
                                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${genderValue === 'L' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-500'
                                    }`}>Laki-laki</button>
                            <button onClick={() => setGenderValue('P')}
                                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${genderValue === 'P' ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-slate-100 text-slate-500'
                                    }`}>Perempuan</button>
                        </div>
                    </div>
                )}
                {targetType === 'kamar' && (
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Pilih Kamar</label>
                        <select value={kamarId} onChange={e => setKamarId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50">
                            <option value="">- Pilih Kamar -</option>
                            {kamars?.map((k: any) => <option key={k.id} value={String(k.id)}>{k.name}</option>)}
                        </select>
                    </div>
                )}
                {targetType === 'kelas' && (
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Pilih Kelas</label>
                        <select value={kelasId} onChange={e => setKelasId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50">
                            <option value="">- Pilih Kelas -</option>
                            {(classes as any)?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Period & Due Date */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <h2 className="text-base font-bold text-slate-800">Periode & Jatuh Tempo</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Mode Kalender</label>
                        <select value={periodMode} onChange={e => setPeriodMode(e.target.value as any)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50">
                            <option value="GREGORIAN">Masehi</option>
                            <option value="HIJRI">Hijriah</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Periode</label>
                        <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Jatuh Tempo</label>
                        <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50" />
                    </div>
                </div>
            </div>

            {/* Preview & Results */}
            {previewResult && (
                <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6 space-y-2">
                    <p className="text-sm font-bold text-blue-800">Preview Hasil</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-blue-700">{previewResult.wouldCreate}</p>
                            <p className="text-xs text-blue-500">Akan Dibuat</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-600">{previewResult.targetCount}</p>
                            <p className="text-xs text-slate-400">Total Santri</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-amber-600">{previewResult.existingCount}</p>
                            <p className="text-xs text-amber-500">Sudah Ada</p>
                        </div>
                    </div>
                    {previewResult.totalAmount > 0 && (
                        <p className="text-sm text-blue-600 pt-2 border-t border-blue-200">
                            Total per santri: <strong>{fmtRp(previewResult.totalAmount)}</strong>
                        </p>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
                <Link href="/keuangan"
                    className="px-5 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition-all">
                    Batal
                </Link>
                <button onClick={handlePreview}
                    disabled={!period || generateMut.isPending}
                    className="px-5 py-3 rounded-xl border border-blue-200 text-blue-600 text-sm font-semibold hover:bg-blue-50 disabled:opacity-50 transition-all">
                    Preview
                </button>
                <button onClick={handleGenerate}
                    disabled={!period || generateMut.isPending}
                    className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2">
                    {generateMut.isPending ? (
                        <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Memproses...
                        </>
                    ) : 'Aktifkan & Generate Tagihan'}
                </button>
            </div>
        </div>
    )
}
