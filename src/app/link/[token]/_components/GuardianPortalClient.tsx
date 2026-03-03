'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/utils/trpc'
import { formatDate, formatRupiah, getGenderLabel } from '@/utils/format'
import { Icon } from '@/components/icons'
import GuardianProfilePhoto from './GuardianProfilePhoto'
import ReceiptView from '@/components/receipt/ReceiptView'

const INVOICE_STATUS_STYLE: Record<string, { label: string; className: string }> = {
    PAID: { label: 'Lunas', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    PARTIAL: { label: 'Sebagian', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    PENDING: { label: 'Belum Lunas', className: 'bg-slate-100 text-slate-600 border-slate-200' },
    WAITING: { label: 'Menunggu Verifikasi', className: 'bg-sky-50 text-sky-700 border-sky-200' },
    VOID: { label: 'Void', className: 'bg-slate-100 text-slate-500 border-slate-200' },
}

function formatAddress(address: unknown): string | null {
    if (!address || typeof address !== 'object' || Array.isArray(address)) return null
    const value = address as Record<string, unknown>

    const parts: string[] = []
    const jalan = typeof value.jalan === 'string' ? value.jalan : ''
    const rtRw = typeof value.rt_rw === 'string' ? value.rt_rw : ''
    const kelurahan = typeof value.kelurahan === 'string' ? value.kelurahan : ''
    const kecamatan = typeof value.kecamatan === 'string' ? value.kecamatan : ''
    const kota = typeof value.kota === 'string' ? value.kota : ''
    const provinsi = typeof value.provinsi === 'string' ? value.provinsi : ''
    const kodepos = typeof value.kodepos === 'string' ? value.kodepos : ''

    if (jalan) parts.push(jalan)
    if (rtRw) parts.push(`RT/RW ${rtRw}`)
    if (kelurahan) parts.push(kelurahan)
    if (kecamatan) parts.push(kecamatan)
    if (kota) parts.push(kota)
    if (provinsi) parts.push(provinsi)
    if (kodepos) parts.push(kodepos)

    return parts.length > 0 ? parts.join(', ') : null
}

export default function GuardianPortalClient({ token }: { token: string }) {
    const utils = trpc.useUtils()
    const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<string, boolean>>({})
    const [uploadInvoiceId, setUploadInvoiceId] = useState<string | null>(null)
    const [uploadAmount, setUploadAmount] = useState('')
    const [uploadNote, setUploadNote] = useState('')
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [receiptInvoiceId, setReceiptInvoiceId] = useState<string | null>(null)

    const { data, isLoading, error } = trpc.link.resolveToken.useQuery(
        { token },
        { retry: false, refetchOnWindowFocus: false }
    )

    const uploadProof = trpc.link.uploadPaymentProof.useMutation({
        onSuccess: async () => {
            setUploadInvoiceId(null)
            setUploadAmount('')
            setUploadNote('')
            setUploadFile(null)
            await utils.link.resolveToken.invalidate({ token })
            await utils.link.listInvoicesByToken.invalidate({ token })
        },
    })

    const progress = useMemo(() => {
        if (!data) return 0
        if (data.billingSummary.totalInvoiced <= 0) return 0
        return Math.min(100, Math.round((data.billingSummary.totalPaid / data.billingSummary.totalInvoiced) * 100))
    }, [data])

    const uploadTargetInvoice = useMemo(
        () => data?.invoices.find((invoice) => invoice.id === uploadInvoiceId) ?? null,
        [data, uploadInvoiceId]
    )
    const receiptInvoice = useMemo(
        () => data?.invoices.find((invoice) => invoice.id === receiptInvoiceId) ?? null,
        [data, receiptInvoiceId]
    )

    const submitProof = async () => {
        if (!uploadTargetInvoice || !uploadFile) return

        const amount = Number(uploadAmount)
        if (!Number.isInteger(amount) || amount <= 0) {
            alert('Nominal harus bilangan bulat dan lebih dari 0.')
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', uploadFile)
            formData.append('token', token)

            const response = await fetch('/api/upload', { method: 'POST', body: formData })
            const payload = await response.json().catch(() => null)
            if (!response.ok || !payload?.url) {
                throw new Error(payload?.error ?? 'Gagal upload gambar bukti.')
            }

            await uploadProof.mutateAsync({
                token,
                invoiceId: uploadTargetInvoice.id,
                amount,
                imageUrl: payload.url as string,
                note: uploadNote.trim() || undefined,
            })
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Gagal mengirim bukti pembayaran.'
            alert(message)
        } finally {
            setUploading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 px-4 py-10">
                <div className="mx-auto max-w-5xl animate-pulse space-y-4">
                    <div className="h-24 rounded-2xl bg-slate-200" />
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="h-32 rounded-2xl bg-slate-200" />
                        <div className="h-32 rounded-2xl bg-slate-200" />
                        <div className="h-32 rounded-2xl bg-slate-200" />
                    </div>
                    <div className="h-64 rounded-2xl bg-slate-200" />
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-50 px-4 py-20">
                <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                        <Icon name="warning" size={24} className="text-red-600" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800">Link Tidak Valid</h1>
                    <p className="mt-2 text-sm text-slate-600">Link tidak valid atau sudah kedaluwarsa.</p>
                </div>
            </div>
        )
    }

    const addressText = formatAddress(data.santri.address)
    const classLabel = data.santri.classGroup
        ? `${data.santri.classGroup.grade.level.code} ${data.santri.classGroup.grade.number} - ${data.santri.classGroup.name}`
        : 'Belum terdaftar kelas'
    const roomLabel = data.santri.currentRoom
        ? `${data.santri.currentRoom.name} - ${data.santri.currentRoom.complexName} - ${data.santri.currentRoom.buildingName} - Lantai ${data.santri.currentRoom.floorNumber}`
        : 'Belum di-assign'

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <GuardianProfilePhoto fullName={data.santri.fullName} photoUrl={data.santri.photoUrl} />
                            <div>
                                <p className="text-sm text-slate-500">{data.santri.isActive ? 'Portal Publik' : 'Portal Alumni'}</p>
                                <h1 className="mt-1 text-2xl font-bold text-slate-900">{data.santri.fullName}</h1>
                                <p className="mt-1 text-sm text-slate-600">NIS: {data.santri.nis}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!data.santri.isActive && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                    Alumni
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                                <Icon name="user" size={14} className="text-slate-500" />
                                {getGenderLabel(data.santri.gender)}
                            </span>
                        </div>
                    </div>

                    {(data.santri.birthDate || data.santri.fatherName || data.santri.motherName || data.santri.fatherPhone || addressText) && (
                        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 md:grid-cols-2">
                            <div>
                                <span className="text-slate-500">Tanggal Lahir: </span>
                                {data.santri.birthDate ? formatDate(data.santri.birthDate) : '-'}
                            </div>
                            <div>
                                <span className="text-slate-500">Nama Ayah: </span>
                                {data.santri.fatherName || '-'}
                            </div>
                            <div>
                                <span className="text-slate-500">Nama Ibu: </span>
                                {data.santri.motherName || '-'}
                            </div>
                            <div>
                                <span className="text-slate-500">No. HP Ayah: </span>
                                {data.santri.fatherPhone || '-'}
                            </div>
                            <div>
                                <span className="text-slate-500">No. HP Ibu: </span>
                                {data.santri.motherPhone || '-'}
                            </div>
                            <div>
                                <span className="text-slate-500">No. Santri: </span>
                                {data.santri.phone || '-'}
                            </div>
                            {addressText && (
                                <div className="md:col-span-2">
                                    <span className="text-slate-500">Alamat: </span>
                                    {addressText}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                            <Icon name="kelas" size={20} className="text-blue-600" />
                        </div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Kelas</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{classLabel}</p>
                        {data.santri.classGroup?.schoolYear?.name && (
                            <p className="mt-1 text-xs text-slate-500">TA {data.santri.classGroup.schoolYear.name}</p>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                            <Icon name="room" size={20} className="text-teal-600" />
                        </div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Kamar</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{roomLabel}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                            <Icon name="money" size={20} className="text-amber-600" />
                        </div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Ringkasan Keuangan</p>
                        <div className="mt-2 space-y-1 text-sm">
                            <p className="text-slate-700">Total: <span className="font-semibold">{formatRupiah(data.billingSummary.totalInvoiced)}</span></p>
                            <p className="text-emerald-700">Terbayar: <span className="font-semibold">{formatRupiah(data.billingSummary.totalPaid)}</span></p>
                            <p className="text-red-700">Sisa: <span className="font-semibold">{formatRupiah(data.billingSummary.outstanding)}</span></p>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-slate-800">Tagihan</h2>
                        <span className="text-xs text-slate-500">{data.billingSummary.invoiceCount} tagihan</span>
                    </div>

                    {data.billingSummary.invoiceCount === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                            Belum ada tagihan diterbitkan.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.invoices.map((invoice) => {
                                const statusKey = invoice.pendingProofCount > 0 && invoice.status !== 'PAID'
                                    ? 'WAITING'
                                    : invoice.status
                                const style = INVOICE_STATUS_STYLE[statusKey] ?? INVOICE_STATUS_STYLE.PENDING
                                const isExpanded = expandedInvoiceIds[invoice.id] ?? false

                                return (
                                    <div key={invoice.id} className="rounded-xl border border-slate-200">
                                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{invoice.code}</p>
                                                <p className="text-xs text-slate-500">
                                                    Periode {invoice.periodLabel}
                                                    {invoice.dueDate ? ` - Jatuh Tempo ${formatDate(invoice.dueDate)}` : ''}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Terbayar {formatRupiah(invoice.paidAmount)} | Sisa {formatRupiah(invoice.outstandingAmount)}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${style.className}`}>
                                                    {style.label}
                                                </span>
                                                <span className="text-sm font-semibold text-slate-800">{formatRupiah(invoice.totalAmount)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedInvoiceIds((prev) => ({ ...prev, [invoice.id]: !isExpanded }))}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                                >
                                                    <Icon name={isExpanded ? 'close' : 'info'} size={14} className="text-slate-500" />
                                                    {isExpanded ? 'Tutup' : 'Detail'}
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-slate-100 px-4 py-3">
                                                <div className="mb-3 rounded-lg bg-slate-50 p-3">
                                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline Pembayaran</p>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                        <span className={`rounded-full px-2 py-1 ${invoice.latestProof ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                            Bukti dikirim
                                                        </span>
                                                        <span className={`rounded-full px-2 py-1 ${invoice.pendingProofCount > 0 ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-500'}`}>
                                                            Menunggu verifikasi
                                                        </span>
                                                        <span className={`rounded-full px-2 py-1 ${invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                                            Lunas
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div>
                                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Item Tagihan</p>
                                                        {invoice.items.length > 0 ? (
                                                            <ul className="space-y-1.5 text-sm">
                                                                {invoice.items.map((item) => (
                                                                    <li key={item.id} className="flex items-center justify-between text-slate-700">
                                                                        <span>{item.name}</span>
                                                                        <span className="font-medium">{formatRupiah(item.amount)}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-sm text-slate-500">Tidak ada item.</p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pembayaran Terverifikasi</p>
                                                        {invoice.payments.length > 0 ? (
                                                            <ul className="space-y-1.5 text-sm">
                                                                {invoice.payments.map((payment) => (
                                                                    <li key={payment.id} className="flex items-center justify-between text-slate-700">
                                                                        <span>{payment.verifiedAt ? formatDate(payment.verifiedAt) : '-'}</span>
                                                                        <span className="font-medium text-emerald-700">{formatRupiah(payment.amount)}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-sm text-slate-500">Belum ada pembayaran terverifikasi.</p>
                                                        )}

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setUploadInvoiceId(invoice.id)}
                                                                disabled={!invoice.canUploadProof || uploading || uploadProof.isPending}
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                                                            >
                                                                <Icon name="upload" size={14} className="text-slate-600" />
                                                                Kirim Bukti Pembayaran
                                                            </button>

                                                            {invoice.payments.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setReceiptInvoiceId(invoice.id)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                                >
                                                                    <Icon name="receipt" size={14} className="text-slate-600" />
                                                                    Lihat Resi
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {uploadTargetInvoice && (
                <div className="fixed inset-0 z-50 bg-black/45 p-4 backdrop-blur-sm" onClick={() => setUploadInvoiceId(null)}>
                    <div className="mx-auto mt-12 w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <h3 className="text-base font-semibold text-slate-900">Kirim Bukti Pembayaran</h3>
                        <p className="mt-1 text-xs text-slate-500">
                            {uploadTargetInvoice.code} - Periode {uploadTargetInvoice.periodLabel}
                        </p>

                        <div className="mt-4 space-y-3">
                            <label className="block text-xs font-semibold text-slate-600">
                                Upload bukti (jpg/png)
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                                    className="mt-1 block w-full rounded-lg border border-slate-200 p-2 text-xs"
                                />
                            </label>

                            <label className="block text-xs font-semibold text-slate-600">
                                Nominal
                                <input
                                    type="number"
                                    min={1}
                                    value={uploadAmount}
                                    onChange={(event) => setUploadAmount(event.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    placeholder="Contoh: 500000"
                                />
                            </label>

                            <label className="block text-xs font-semibold text-slate-600">
                                Catatan (opsional)
                                <textarea
                                    value={uploadNote}
                                    onChange={(event) => setUploadNote(event.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    rows={3}
                                    placeholder="Contoh: Transfer BCA atas nama Ayah"
                                />
                            </label>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setUploadInvoiceId(null)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={submitProof}
                                disabled={uploading || uploadProof.isPending}
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                            >
                                {uploading || uploadProof.isPending ? 'Mengirim...' : 'Kirim Bukti'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {receiptInvoice && (
                <div className="fixed inset-0 z-50 bg-black/45 p-4 backdrop-blur-sm" onClick={() => setReceiptInvoiceId(null)}>
                    <div className="mx-auto mt-8 w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-900">Resi Pembayaran</h3>
                            <button type="button" onClick={() => setReceiptInvoiceId(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                                <Icon name="close" size={16} className="text-slate-500" />
                            </button>
                        </div>
                        <ReceiptView
                            schoolName="Pesantren"
                            receiptNo={receiptInvoice.receiptNo}
                            invoiceCode={receiptInvoice.code}
                            periodLabel={receiptInvoice.periodLabel}
                            generatedAt={receiptInvoice.payments[0]?.verifiedAt ?? new Date()}
                            items={receiptInvoice.items.map((item) => ({ name: item.name, amount: item.amount }))}
                            totalAmount={receiptInvoice.totalAmount}
                            paidAmount={receiptInvoice.paidAmount}
                            status={receiptInvoice.status === 'PAID' ? 'PAID' : receiptInvoice.status === 'PARTIAL' ? 'PARTIAL' : 'PENDING'}
                            verificationUrl={typeof window !== 'undefined' ? `${window.location.origin}/api/receipt/${receiptInvoice.receiptPaymentId ?? ''}` : undefined}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
