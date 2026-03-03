'use client'

import { useState } from 'react'
import { trpc } from '@/utils/trpc'
import { formatRupiah } from '@/utils/format'
import { hijriMonthNameId } from '@/lib/billing/period'
import Link from 'next/link'
import DeleteBillingModal from './DeleteBillingModal'

type ItemRow = { label: string; amount: string; sortOrder: number }
type ScopeRow = { scopeType: string; scopeRefId: string; scopeValue: string; include: boolean }

export default function PengaturanTagihanTab() {
    const { data: models, isLoading } = trpc.billingModel.list.useQuery()
    const utils = trpc.useUtils()
    const invalidate = () => {
        utils.billingModel.list.invalidate()
        utils.invoice.invalidate()
    }

    const createModel = trpc.billingModel.create.useMutation({ onSuccess: invalidate })
    const updateModel = trpc.billingModel.update.useMutation({ onSuccess: invalidate })
    const toggleActive = trpc.billingModel.toggleActive.useMutation({ onSuccess: invalidate })

    // Form state
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState({ name: '', description: '', periodType: 'bulanan' as 'bulanan' | 'tahunan' | 'sekali' })
    const [items, setItems] = useState<ItemRow[]>([{ label: '', amount: '', sortOrder: 0 }])
    const [scopes, setScopes] = useState<ScopeRow[]>([{ scopeType: 'ALL', scopeRefId: '', scopeValue: '', include: true }])
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Modal state (only delete stays as modal)
    const [deleteModel, setDeleteModel] = useState<any>(null)

    // Academic data for scopes
    const { data: levels } = trpc.academic.levels.list.useQuery()
    const { data: kamars } = trpc.kamar.list.useQuery()

    const showError = (e: any) => { setError(e?.message || 'Terjadi kesalahan'); setTimeout(() => setError(''), 5000) }
    const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }

    const resetForm = () => {
        setForm({ name: '', description: '', periodType: 'bulanan' })
        setItems([{ label: '', amount: '', sortOrder: 0 }])
        setScopes([{ scopeType: 'ALL', scopeRefId: '', scopeValue: '', include: true }])
        setEditingId(null)
        setShowForm(false)
    }

    const startEdit = (m: any) => {
        setForm({ name: m.name, description: m.description ?? '', periodType: m.periodType })
        setItems(m.items?.length ? m.items.map((i: any) => ({ label: i.label, amount: String(i.amount), sortOrder: i.sortOrder })) : [{ label: '', amount: '', sortOrder: 0 }])
        setScopes(m.scopes?.length ? m.scopes.map((s: any) => ({ scopeType: s.scopeType, scopeRefId: s.scopeRefId ?? '', scopeValue: s.scopeValue ?? '', include: s.include })) : [{ scopeType: 'ALL', scopeRefId: '', scopeValue: '', include: true }])
        setEditingId(m.id)
        setShowForm(true)
    }

    const handleSubmit = () => {
        const validItems = items.filter(i => i.label && i.amount).map((i, idx) => ({ label: i.label, amount: parseFloat(i.amount), sortOrder: idx }))
        const validScopes = scopes.filter(s => s.scopeType).map(s => ({
            scopeType: s.scopeType as any,
            scopeRefId: s.scopeRefId || null,
            scopeValue: s.scopeValue || null,
            include: s.include,
        }))

        if (editingId) {
            updateModel.mutate({ id: editingId, ...form, items: validItems, scopes: validScopes }, {
                onSuccess: () => { showSuccess('Model diperbarui'); resetForm() },
                onError: showError,
            })
        } else {
            createModel.mutate({ ...form, items: validItems, scopes: validScopes }, {
                onSuccess: () => { showSuccess('Sistem billing berhasil dibuat'); resetForm() },
                onError: showError,
            })
        }
    }

    const totalFromItems = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)
    const periodLabel = (pt: string) => pt === 'bulanan' ? 'Bulanan' : pt === 'tahunan' ? 'Tahunan' : 'Sekali Bayar'

    if (isLoading) {
        return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />)}</div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Sistem Billing</h2>
                    <p className="text-slate-500 text-sm mt-1">Buat dan kelola sistem billing, atur target, dan generate tagihan.</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(!showForm) }}
                    className="px-4 py-2 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors text-sm">
                    {showForm ? 'Tutup' : '+ Buat Sistem Billing'}
                </button>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
            {success && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm">{success}</div>}

            {/* ========== Create/Edit Form ========== */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800">{editingId ? 'Edit Sistem Billing' : 'Buat Sistem Billing Baru'}</h3>

                    {/* Basic fields */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Nama Billing</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"
                                placeholder="Syahriyah Bulanan" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Deskripsi</label>
                            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"
                                placeholder="Iuran Bulanan Pondok" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Periode</label>
                            <select value={form.periodType} onChange={e => setForm(f => ({ ...f, periodType: e.target.value as any }))}
                                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50">
                                <option value="bulanan">Bulanan</option>
                                <option value="tahunan">Tahunan</option>
                                <option value="sekali">Sekali Bayar</option>
                            </select>
                        </div>
                    </div>

                    {/* Item breakdown */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Rincian Item</label>
                            <span className="text-sm font-bold text-teal-600">Total: {formatRupiah(totalFromItems)}</span>
                        </div>
                        <div className="space-y-2">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input value={item.label} onChange={e => { const n = [...items]; n[idx].label = e.target.value; setItems(n) }}
                                        placeholder="Label item" className="flex-[2] px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                                    <input type="number" value={item.amount} onChange={e => { const n = [...items]; n[idx].amount = e.target.value; setItems(n) }}
                                        placeholder="Nominal" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" min={0} />
                                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                        className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => setItems([...items, { label: '', amount: '', sortOrder: items.length }])}
                                className="text-sm text-teal-600 hover:text-teal-700 font-medium">+ Tambah Item</button>
                        </div>
                    </div>

                    {/* Scope / Targeting */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Target Berlaku</label>
                        <div className="space-y-2">
                            {scopes.map((scope, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <select value={scope.scopeType} onChange={e => {
                                        const n = [...scopes]; n[idx] = { ...n[idx], scopeType: e.target.value, scopeRefId: '', scopeValue: '' }; setScopes(n)
                                    }} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                                        <option value="ALL">Semua Santri</option>
                                        <option value="ACADEMIC_LEVEL">Jenjang</option>
                                        <option value="GRADE">Tingkat</option>
                                        <option value="ROOM">Kamar</option>
                                        <option value="GENDER">Jenis Kelamin</option>
                                    </select>
                                    {scope.scopeType === 'ACADEMIC_LEVEL' && (
                                        <select value={scope.scopeRefId} onChange={e => { const n = [...scopes]; n[idx].scopeRefId = e.target.value; setScopes(n) }}
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                                            <option value="">- Pilih Jenjang -</option>
                                            {levels?.map((l: any) => <option key={l.id} value={l.id}>{l.code} - {l.name}</option>)}
                                        </select>
                                    )}
                                    {scope.scopeType === 'ROOM' && (
                                        <select value={scope.scopeRefId} onChange={e => { const n = [...scopes]; n[idx].scopeRefId = e.target.value; setScopes(n) }}
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                                            <option value="">- Pilih Kamar -</option>
                                            {kamars?.map((k: any) => <option key={k.id} value={String(k.id)}>{k.name}</option>)}
                                        </select>
                                    )}
                                    {scope.scopeType === 'GENDER' && (
                                        <select value={scope.scopeValue} onChange={e => { const n = [...scopes]; n[idx].scopeValue = e.target.value; setScopes(n) }}
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                                            <option value="">- Pilih -</option>
                                            <option value="L">Laki-laki</option>
                                            <option value="P">Perempuan</option>
                                        </select>
                                    )}
                                    {scopes.length > 1 && (
                                        <button onClick={() => setScopes(scopes.filter((_, i) => i !== idx))}
                                            className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!scopes.some(s => s.scopeType === 'ALL') && (
                                <button onClick={() => setScopes([...scopes, { scopeType: 'ALL', scopeRefId: '', scopeValue: '', include: true }])}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Tambah Target</button>
                            )}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                        <button onClick={resetForm} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Batal</button>
                        <button onClick={handleSubmit} disabled={createModel.isPending || updateModel.isPending}
                            className="px-5 py-2 rounded-xl bg-teal-500 text-white font-medium text-sm hover:bg-teal-600 disabled:opacity-50">
                            {editingId ? 'Simpan Perubahan' : 'Simpan Sistem'}
                        </button>
                    </div>
                </div>
            )}

            {/* ========== Billing System Cards ========== */}
            {(!models || models.length === 0) ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    Belum ada sistem billing. Klik "+ Buat Sistem Billing" untuk memulai.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {models?.map((m: any) => {
                        const total = m.items?.reduce((s: number, i: any) => s + i.amount, 0) || m.defaultAmount || 0
                        const scopeLabel = m.scopes?.[0]?.scopeType === 'ALL' ? 'Semua Santri' : m.scopes?.map((s: any) => s.scopeType).join(', ') || 'Belum diatur'
                        const invoiceCount = (m._count?.invoices ?? 0) + (m._count?.bills ?? 0)
                        return (
                            <div key={m.id} className={`bg-white rounded-2xl border transition-all card-hover ${m.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                                <div className="p-5 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{m.name}</h4>
                                            {m.description && <p className="text-sm text-slate-400 mt-0.5">{m.description}</p>}
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${m.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {m.isActive ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-sm">
                                        <div><span className="text-slate-400">Periode:</span> <span className="font-medium">{periodLabel(m.periodType)}</span></div>
                                        <div><span className="text-slate-400">Total:</span> <span className="font-bold text-teal-600">{formatRupiah(total)}</span></div>
                                        <div><span className="text-slate-400">Target:</span> <span className="font-medium">{scopeLabel}</span></div>
                                    </div>
                                    {m.items?.length > 0 && (
                                        <div className="flex gap-2 flex-wrap">
                                            {m.items.map((i: any) => (
                                                <span key={i.id} className="px-2 py-0.5 rounded-md bg-slate-50 text-xs text-slate-600 border border-slate-100">
                                                    {i.label}: {formatRupiah(i.amount)}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* ── Action Buttons ── */}
                                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                                        <button onClick={() => startEdit(m)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                                            Edit
                                        </button>
                                        <Link href={`/keuangan/activate/${m.id}`}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${m.isActive
                                                    ? 'text-teal-600 bg-teal-50 hover:bg-teal-100'
                                                    : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                                }`}>
                                            {m.isActive ? 'Generate Tagihan' : 'Aktifkan'}
                                        </Link>
                                        {m.isActive && (
                                            <button onClick={() => toggleActive.mutate({ id: m.id, isActive: false })}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">
                                                Nonaktifkan
                                            </button>
                                        )}
                                        <button onClick={() => setDeleteModel(m)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 ml-auto transition-colors">
                                            Hapus
                                        </button>
                                        <span className="text-xs text-slate-400 self-center">{invoiceCount} tagihan</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ========== Modals ========== */}
            {deleteModel && (
                <DeleteBillingModal
                    model={deleteModel}
                    onClose={() => setDeleteModel(null)}
                    onSuccess={() => { invalidate(); showSuccess('Sistem billing berhasil dihapus') }}
                />
            )}
        </div>
    )
}
