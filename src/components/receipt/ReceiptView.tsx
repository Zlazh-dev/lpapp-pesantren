'use client'

import { useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { formatDate, formatRupiah } from '@/utils/format'
import { Icon } from '@/components/icons'
import { exportReceiptImage } from './exportReceiptImage'

type ReceiptItem = {
    name: string
    amount: number
}

type ReceiptViewProps = {
    schoolName?: string
    receiptNo?: string | null
    invoiceCode: string
    periodLabel: string
    generatedAt?: Date | string | null
    items: ReceiptItem[]
    totalAmount: number
    paidAmount: number
    status: 'PAID' | 'PARTIAL' | 'PENDING'
    verificationUrl?: string
    showActions?: boolean
}

const STATUS_STYLE: Record<'PAID' | 'PARTIAL' | 'PENDING', string> = {
    PAID: 'bg-emerald-100 text-emerald-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    PENDING: 'bg-slate-200 text-slate-600',
}

const STATUS_LABEL: Record<'PAID' | 'PARTIAL' | 'PENDING', string> = {
    PAID: 'Lunas',
    PARTIAL: 'Sebagian',
    PENDING: 'Belum Lunas',
}

export default function ReceiptView({
    receiptNo,
    invoiceCode,
    periodLabel,
    generatedAt,
    items,
    totalAmount,
    paidAmount,
    status,
    verificationUrl,
    showActions = true,
}: ReceiptViewProps) {
    const receiptRef = useRef<HTMLDivElement>(null)
    const [isExporting, setIsExporting] = useState<false | 'png' | 'jpg'>(false)
    const qrValue = verificationUrl ?? `receipt:${invoiceCode}`
    const fileBaseName = `receipt-${invoiceCode.replace(/\s+/g, '-').toLowerCase()}`

    const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.amount, 0), [items])

    const handlePrint = () => {
        window.print()
    }

    const handleDownload = async (type: 'png' | 'jpg') => {
        if (!receiptRef.current) return
        setIsExporting(type)
        try {
            await exportReceiptImage(receiptRef.current, {
                type,
                fileName: `${fileBaseName}.${type}`,
                pixelRatio: 2,
                jpegQuality: 0.95,
                backgroundColor: '#ffffff',
            })
        } catch {
            alert('Gagal mengekspor gambar resi.')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="w-full">
            {showActions && (
                <div className="receipt-actions mb-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <Icon name="receipt" size={14} className="text-slate-600" />
                        Cetak
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDownload('png')}
                        disabled={isExporting !== false}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        <Icon name="download" size={14} className="text-slate-600" />
                        {isExporting === 'png' ? 'Mengekspor PNG...' : 'Unduh PNG'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDownload('jpg')}
                        disabled={isExporting !== false}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        <Icon name="download" size={14} className="text-slate-600" />
                        {isExporting === 'jpg' ? 'Mengekspor JPG...' : 'Unduh JPG'}
                    </button>
                </div>
            )}

            <div className="receipt-print-shell">
                <div
                    ref={receiptRef}
                    className="receipt-print-area receipt-card mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                    <div className="border-b border-dashed border-slate-200 pb-3 text-center">
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">LpApp.</p>
                        <p className="mt-1 text-[11px] text-slate-500">Bukti Pembayaran Resmi</p>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                        <div className="flex justify-between">
                            <span>No. Resi</span>
                            <span className="font-semibold text-slate-800">{receiptNo ?? '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tanggal</span>
                            <span className="font-medium">{generatedAt ? formatDate(generatedAt) : formatDate(new Date())}</span>
                        </div>
                    </div>

                    <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                        <div className="flex justify-between">
                            <span>Invoice</span>
                            <span className="font-semibold text-slate-800">{invoiceCode}</span>
                        </div>
                        <div className="mt-1 flex justify-between">
                            <span>Periode</span>
                            <span>{periodLabel}</span>
                        </div>
                    </div>

                    <div className="mt-3 border-y border-dashed border-slate-200 py-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rincian Item</p>
                        <div className="space-y-1.5 text-xs">
                            {items.map((item, index) => (
                                <div key={`${item.name}-${index}`} className="flex justify-between text-slate-700">
                                    <span>{item.name}</span>
                                    <span className="font-medium">{formatRupiah(item.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                            <span>Subtotal</span>
                            <span className="font-medium">{formatRupiah(subtotal || totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                            <span>Terbayar</span>
                            <span className="font-semibold text-emerald-700">{formatRupiah(paidAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-slate-600">Status</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status]}`}>
                                {STATUS_LABEL[status]}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="rounded-lg border border-slate-200 p-2">
                            <QRCodeSVG value={qrValue} size={72} level="M" includeMargin />
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-500">
                            Simpan resi ini sebagai bukti pembayaran resmi.
                            Terima kasih atas kerja sama Anda.
                        </p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @page {
                    size: A4;
                    margin: 12mm;
                }

                @media print {
                    html,
                    body {
                        width: 210mm;
                        min-height: 297mm;
                        background: #ffffff !important;
                    }

                    body * {
                        visibility: hidden !important;
                    }

                    .receipt-print-shell,
                    .receipt-print-shell * {
                        visibility: visible !important;
                    }

                    .receipt-print-shell {
                        position: fixed !important;
                        inset: 0 !important;
                        display: flex !important;
                        justify-content: center !important;
                        align-items: flex-start !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: #ffffff !important;
                    }

                    .receipt-print-area {
                        width: 186mm !important;
                        max-width: 186mm !important;
                        margin: 0 auto !important;
                    }

                    .receipt-card {
                        width: 186mm !important;
                        max-width: 186mm !important;
                        border-radius: 4mm !important;
                        border: 1px solid #d1d5db !important;
                        box-shadow: none !important;
                        background: #ffffff !important;
                    }

                    .receipt-actions {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    )
}
