'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { trpc } from '@/utils/trpc'

type DeleteLevel = 'system-only' | 'system-and-invoices' | 'everything'

interface Props {
    model: { id: string; name: string; _count?: { invoices?: number; bills?: number } }
    onClose: () => void
    onSuccess: () => void
}

const LEVELS: { value: DeleteLevel; label: string; desc: string; color: string }[] = [
    {
        value: 'system-only',
        label: 'Hanya Hapus Sistemnya',
        desc: 'Menghapus konfigurasi billing tanpa menyentuh invoice atau pembayaran yang sudah ada.',
        color: 'border-amber-200 bg-amber-50',
    },
    {
        value: 'system-and-invoices',
        label: 'Hapus Sistem & Invoice',
        desc: 'Menghapus sistem dan semua invoice/tagihan yang dihasilkan. Pembayaran tetap tersimpan.',
        color: 'border-orange-200 bg-orange-50',
    },
    {
        value: 'everything',
        label: 'Hapus Seluruh Data',
        desc: 'Menghapus sistem, invoice, pembayaran, rekap, dan semua data terkait. Tidak dapat dibatalkan.',
        color: 'border-red-200 bg-red-50',
    },
]

export default function DeleteBillingModal({ model, onClose, onSuccess }: Props) {
    const [selected, setSelected] = useState<DeleteLevel>('system-only')
    const [confirmText, setConfirmText] = useState('')

    const deleteMut = trpc.billingModel.deleteWithData.useMutation({
        onSuccess: () => { onSuccess(); onClose() },
    })

    const needsConfirm = selected === 'everything'
    const canDelete = !needsConfirm || confirmText === model.name

    if (typeof document === 'undefined') return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Hapus Sistem Billing</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Pilih level penghapusan untuk <span className="font-semibold text-slate-600">{model.name}</span>
                        </p>
                    </div>

                    {/* Options */}
                    <div className="p-6 space-y-3">
                        {LEVELS.map((lv) => (
                            <label
                                key={lv.value}
                                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selected === lv.value ? lv.color + ' ring-2 ring-offset-1 ring-current/20' : 'border-slate-100 hover:border-slate-200'
                                    }`}
                            >
                                <input
                                    type="radio" name="delete-level"
                                    checked={selected === lv.value}
                                    onChange={() => setSelected(lv.value)}
                                    className="mt-1 accent-red-500"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{lv.label}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{lv.desc}</p>
                                </div>
                            </label>
                        ))}

                        {/* Confirm input for "everything" */}
                        {needsConfirm && (
                            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
                                <p className="text-xs font-semibold text-red-600 mb-2">
                                    ⚠️ Ketik nama billing <span className="font-bold">"{model.name}"</span> untuk konfirmasi
                                </p>
                                <input
                                    value={confirmText}
                                    onChange={e => setConfirmText(e.target.value)}
                                    placeholder={model.name}
                                    className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm bg-white text-red-800 placeholder:text-red-300"
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <button onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition-all">
                            Batal
                        </button>
                        <button
                            onClick={() => deleteMut.mutate({ id: model.id, level: selected })}
                            disabled={!canDelete || deleteMut.isPending}
                            className="px-5 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-all"
                        >
                            {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
