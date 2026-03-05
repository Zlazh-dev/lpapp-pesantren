'use client'

import { use, useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import { formatDate, getGenderLabel } from '@/utils/format'
import PrintDataSantri from '@/components/print/PrintDataSantri'
import QRCode from 'qrcode'

export default function DetailSantriPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const utils = trpc.useUtils()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const kkFileInputRef = useRef<HTMLInputElement>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [photoUploading, setPhotoUploading] = useState(false)
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const [showFileWarning, setShowFileWarning] = useState(false)
    const [fileWarningMsg, setFileWarningMsg] = useState('')
    const [kkUploading, setKkUploading] = useState(false)
    const [kkError, setKkError] = useState<string | null>(null)
    const [showKkModal, setShowKkModal] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showQrModal, setShowQrModal] = useState(false)
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const printRef = useRef<HTMLDivElement>(null)

    const { data: santri, isLoading, error } = trpc.santri.getById.useQuery(id)
    const { data: logoUrl } = trpc.settings.get.useQuery('logo_document_url')

    const deleteMut = trpc.santri.delete.useMutation({
        onSuccess: () => {
            utils.santri.listCentralized.invalidate()
            router.push('/master-data/santri/manage')
        },
    })

    const updateMut = trpc.santri.update.useMutation({
        onSuccess: () => {
            utils.santri.getById.invalidate(id)
            setPhotoPreview(null)
        },
    })

    const deactivateMut = trpc.santri.deactivate.useMutation({
        onSuccess: () => {
            utils.santri.listCentralized.invalidate()
            router.push('/master-data/santri/manage')
        },
    })


    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false)
            }
        }
        if (showMenu) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showMenu])

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Strict validation
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
        const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']
        const ext = file.name.lastIndexOf('.') >= 0 ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : ''

        if (!allowedTypes.includes(file.type)) {
            setFileWarningMsg(`File "${file.name}" bukan gambar yang valid.\nTipe file terdeteksi: ${file.type || 'tidak diketahui'}.\n\nHanya file gambar (JPG, PNG, WebP, GIF) yang diperbolehkan untuk foto profil.`)
            setShowFileWarning(true)
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }
        if (ext && !allowedExts.includes(ext)) {
            setFileWarningMsg(`Ekstensi file "${ext}" tidak diperbolehkan.\n\nGunakan file dengan format: JPG, PNG, WebP, atau GIF.`)
            setShowFileWarning(true)
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            setFileWarningMsg(`Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB).\n\nMaksimal ukuran file: 10MB.`)
            setShowFileWarning(true)
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }

        // Upload through server API for processing + validation
        setPhotoUploading(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            if (!res.ok) {
                const errData = await res.json().catch(() => null)
                throw new Error(errData?.error || 'Gagal upload foto')
            }
            const data = await res.json()
            setPhotoPreview(data.url)
            updateMut.mutate({ id, photoUrl: data.url })
        } catch (err: any) {
            setFileWarningMsg(err?.message || 'Gagal upload foto. Pastikan file adalah gambar yang valid.')
            setShowFileWarning(true)
        } finally {
            setPhotoUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleKkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setKkUploading(true)
        setKkError(null)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/upload-kk', { method: 'POST', body: fd })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Upload gagal')
            updateMut.mutate({ id, kkFileUrl: data.url, kkFileKey: data.public_id })
        } catch (err: any) {
            setKkError(err.message || 'Gagal upload file KK')
        } finally {
            setKkUploading(false)
            if (kkFileInputRef.current) kkFileInputRef.current.value = ''
        }
    }

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                        <div className="aspect-[3/4] bg-slate-200 rounded-xl animate-pulse" />
                        <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mx-auto" />
                        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mx-auto" />
                    </div>
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ── Error ──
    if (error) {
        return (
            <div className="max-w-5xl mx-auto">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <p className="text-lg font-semibold text-red-700">Gagal memuat data santri</p>
                    <p className="text-sm text-red-500 mt-1">{error.message}</p>
                    <Link href="/master-data/santri/manage" className="mt-5 inline-flex px-5 py-2.5 rounded-xl border border-red-300 bg-white text-sm font-medium text-red-700 hover:bg-red-50 transition-all">
                        ← Kembali ke List
                    </Link>
                </div>
            </div>
        )
    }

    if (!santri) return null

    const jenjang = (santri as any).classGroup?.grade?.level?.name ?? '-'
    const kelas = (santri as any).classGroup?.name ?? '-'
    const kamarName = (santri as any).dormRoom?.name ?? '-'
    const lantaiRaw = (santri as any).dormRoom?.floor?.number ?? null
    const lantaiName = lantaiRaw != null ? `Lantai ${lantaiRaw}` : '-'
    const gedungName = (santri as any).dormRoom?.floor?.building?.name ?? '-'
    const initial = santri.fullName.charAt(0).toUpperCase()
    const displayPhoto = photoPreview || santri.photoUrl

    // Calculate age from birthDate
    const calcAge = (bd: string | Date | null | undefined): string => {
        if (!bd) return '-'
        const birth = new Date(bd)
        const now = new Date()
        let age = now.getFullYear() - birth.getFullYear()
        const m = now.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
        return `${age} tahun`
    }

    // (billing moved to /finance sub-page)

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif,.bmp" onChange={handlePhotoUpload} className="hidden" />

            {/* Header Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/master-data/santri/manage" className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:shadow-sm transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-800">Detail Santri</h1>
                </div>
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all"
                        title="Menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>

                    {showMenu && (
                        <div data-kebab className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 py-1.5 z-50 animate-fade-in">
                            <Link
                                href={`/master-data/santri/manage/${id}/finance`}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                                onClick={() => setShowMenu(false)}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Finance
                            </Link>
                            <Link
                                href={`/master-data/santri/manage/${id}/edit`}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                onClick={() => setShowMenu(false)}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Data
                            </Link>
                            <button
                                onClick={async () => {
                                    setShowMenu(false)
                                    const qrUrl = `${window.location.origin}/santri/${id}`
                                    const dataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2, color: { dark: '#1e293b' } })
                                    setQrDataUrl(dataUrl)
                                    setShowQrModal(true)
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                                Cetak QR Code
                            </button>
                            <button
                                onClick={() => {
                                    setShowMenu(false)
                                    setTimeout(() => {
                                        const el = printRef.current
                                        if (!el) return
                                        const child = el.firstElementChild as HTMLElement | null
                                        if (!child) return
                                        const w = window.open('', '_blank')
                                        if (!w) return
                                        w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cetak Data - ${santri.fullName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page {
      size: A4;
      margin: 10mm 14mm 10mm 14mm;
    }
  </style>
</head>
<body>${child.outerHTML}</body>
</html>`)
                                        w.document.close()
                                        setTimeout(() => { w.print() }, 800)
                                    }, 100)
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Cetak Data
                            </button>
                            <button
                                onClick={() => {
                                    setShowMenu(false)
                                    setShowDeactivateConfirm(true)
                                }}
                                disabled={deactivateMut.isPending}
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Nonaktifkan
                            </button>

                            <div className="my-1.5 border-t border-slate-100" />
                            <button
                                onClick={() => {
                                    setShowMenu(false)
                                    setShowDeleteConfirm(true)
                                }}
                                disabled={deleteMut.isPending}
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Hapus
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Main Layout: Photo LEFT │ Data RIGHT ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

                {/* ── LEFT column: Photo + Orang Tua ── */}
                <div className="space-y-6">
                    {/* Photo Profile Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        {/* Square photo with hover overlay */}
                        <div className="relative group">
                            {displayPhoto ? (
                                <Image
                                    src={displayPhoto}
                                    alt={santri.fullName}
                                    width={320}
                                    height={400}
                                    className="w-full aspect-[3/4] object-cover"
                                />
                            ) : (
                                <div className="w-full aspect-[3/4] bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-600 flex items-center justify-center">
                                    <span className="text-white/90 text-7xl font-bold">{initial}</span>
                                </div>
                            )}

                            {/* Hover overlay with Lihat + Upload */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-5 gap-3">
                                <button
                                    onClick={() => { if (displayPhoto) setShowPhotoModal(true) }}
                                    disabled={!displayPhoto}
                                    title="Lihat foto"
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-teal-600 text-sm font-medium transition-all shadow-lg backdrop-blur-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Lihat
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Upload foto"
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-teal-600 text-sm font-medium transition-all shadow-lg backdrop-blur-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Upload
                                </button>
                            </div>

                            {/* Upload spinner */}
                            {(updateMut.isPending || photoUploading) && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Name + badges below photo */}
                        <div className="p-5 text-center space-y-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">{santri.fullName}</h2>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">NIS: {santri.nis}</p>
                            </div>
                        </div>
                    </div>

                    {/* Data Orang Tua - below photo */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Data Orang Tua / Wali</h3>
                        </div>
                        <dl className="space-y-3">
                            <Field label="Nama Ayah" value={santri.fatherName} />
                            <Field label="Nama Ibu" value={santri.motherName} />
                            <Field label="No. HP Ayah" value={santri.fatherPhone} />
                            <Field label="No. HP Ibu" value={santri.motherPhone} />
                            <Field label="Nama Wali" value={(santri as any).waliName} />
                            <Field label="No. HP Wali" value={(santri as any).waliPhone} />
                        </dl>
                    </div>

                    {/* Deskripsi */}
                    {(santri as any).description && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                    </svg>
                                </div>
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Deskripsi Wali Santri</h3>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{(santri as any).description}</p>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Data Cards ── */}
                <div className="space-y-6">
                    {/* Data Pribadi */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                                <svg className="w-4.5 h-4.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Data Pribadi</h3>
                        </div>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                            <Field label="Nama Lengkap" value={santri.fullName} />
                            <Field label="NIS" value={santri.nis} mono />
                            <Field label="Gender" value={getGenderLabel(santri.gender)} />
                            <Field label="Tempat Lahir" value={santri.birthPlace} />
                            <Field label="Tanggal Lahir" value={santri.birthDate ? formatDate(santri.birthDate) : null} />
                            <Field label="Umur" value={calcAge(santri.birthDate)} />
                            <Field label="No. HP" value={santri.phone} />
                            <Field label="Gedung" value={gedungName} />
                            <Field label="Lantai" value={lantaiName} />
                            <Field label="Kamar" value={kamarName} />
                            <Field label="Jenjang" value={jenjang} />
                            <Field label="Kelas" value={kelas} />
                            <Field label="NIK" value={(santri as any).nik} mono />
                            <Field label="No. KK" value={(santri as any).noKK} mono />
                            <Field label="Tanggal Masuk" value={(santri as any).enrollmentDate ? formatDate((santri as any).enrollmentDate) : null} />
                            <Field label="Jenjang Pendidikan" value={(santri as any).educationLevel} />
                        </dl>
                    </div>

                    {/* Alamat */}
                    {(() => {
                        const addr = (santri.address && typeof santri.address === 'object') ? santri.address as Record<string, string> : null
                        return (
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
                                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Alamat</h3>
                                </div>
                                {addr && Object.values(addr).some((v) => v) ? (
                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                        <div className="md:col-span-2">
                                            <Field label="Jalan" value={addr.jalan} />
                                        </div>
                                        <Field label="RT/RW" value={addr.rt_rw} />
                                        <Field label="Kelurahan / Desa" value={addr.kelurahan} />
                                        <Field label="Kecamatan" value={addr.kecamatan} />
                                        <Field label="Kota / Kabupaten" value={addr.kota} />
                                        <Field label="Provinsi" value={addr.provinsi} />
                                    </dl>
                                ) : (
                                    <p className="text-sm text-slate-300 italic">Belum diisi</p>
                                )}
                            </div>
                        )
                    })()}

                    {/* File Kartu Keluarga (KK) */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">File Kartu Keluarga (KK)</h3>
                        </div>

                        <div className="space-y-4">
                            {/* KK Preview Thumbnail */}
                            {(santri as any).kkFileUrl ? (
                                <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                                    {((santri as any).kkFileUrl as string).startsWith('data:image') || ((santri as any).kkFileUrl as string).match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={(santri as any).kkFileUrl}
                                                alt="Kartu Keluarga"
                                                className="w-full max-h-48 object-contain p-2"
                                            />
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        const url = (santri as any).kkFileUrl as string
                                                        if (url.startsWith('data:')) {
                                                            setShowKkModal(true)
                                                        } else {
                                                            window.open(url, '_blank', 'noopener,noreferrer')
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-teal-600 text-sm font-medium transition-all shadow-lg backdrop-blur-sm"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Lihat
                                                </button>
                                            </div>
                                        </>
                                    ) : ((santri as any).kkFileUrl as string).match(/\.pdf($|\?)/i) ? (
                                        /* ── PDF: show placeholder + preview button (no auto-load) ── */
                                        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                                            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700">File KK — PDF</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Klik tombol untuk melihat pratinjau</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setShowKkModal(true)}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Pratinjau
                                                </button>
                                                <a
                                                    href={(santri as any).kkFileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                    Buka
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ── Other document types ── */
                                        <div className="flex items-center gap-4 p-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700">File KK telah diupload</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Format: Dokumen</p>
                                            </div>
                                            <a
                                                href={(santri as any).kkFileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-600 text-xs font-medium hover:bg-teal-100 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Lihat
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-slate-400">Belum ada file KK yang diupload</p>
                                </div>
                            )}

                            {/* Upload Button */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => kkFileInputRef.current?.click()}
                                    disabled={kkUploading}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    {kkUploading ? 'Uploading...' : (santri as any).kkFileUrl ? 'Ganti File KK' : 'Upload File KK'}
                                </button>
                                <input
                                    ref={kkFileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={handleKkUpload}
                                    className="hidden"
                                />
                                {kkUploading && (
                                    <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                )}
                            </div>

                            {/* Error Message */}
                            {kkError && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-xs text-red-600">{kkError}</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>


            {/* ═══ Photo Viewer Modal ═══ */}
            {showPhotoModal && displayPhoto && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setShowPhotoModal(false)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />

                    {/* Modal container */}
                    <div className="relative z-10 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
                            {/* Modal header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">Foto Santri</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{santri.fullName} — NIS: {santri.nis}</p>
                                </div>
                                <button
                                    onClick={() => setShowPhotoModal(false)}
                                    className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Photo */}
                            <div className="p-4 bg-slate-50">
                                <Image
                                    src={displayPhoto}
                                    alt={santri.fullName}
                                    width={600}
                                    height={800}
                                    className="w-full rounded-xl object-contain max-h-[65vh] mx-auto"
                                />
                            </div>

                            {/* Modal footer */}
                            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-white">
                                <button
                                    onClick={() => { setShowPhotoModal(false); fileInputRef.current?.click() }}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-teal-200 hover:text-teal-700 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Ganti Foto
                                </button>
                                <button
                                    onClick={() => setShowPhotoModal(false)}
                                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-md shadow-teal-500/20"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* KK View Modal */}
            {showKkModal && (santri as any).kkFileUrl && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4"
                    onClick={() => setShowKkModal(false)}
                >
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700">File Kartu Keluarga (KK)</h3>
                            <button
                                onClick={() => setShowKkModal(false)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 flex items-center justify-center">
                            {((santri as any).kkFileUrl as string).startsWith('data:image') ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={(santri as any).kkFileUrl}
                                    alt="Kartu Keluarga"
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                                />
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <p className="text-sm">File ini bukan gambar.</p>
                                    <a
                                        href={(santri as any).kkFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
                                    >
                                        Download File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ═══ Deactivate Confirmation Modal ═══ */}
            {showDeactivateConfirm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeactivateConfirm(false)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-800">Nonaktifkan Santri?</h3>
                            <p className="text-sm text-slate-500 mt-1">Santri <strong>&quot;{santri.fullName}&quot;</strong> akan dipindahkan ke Arsip dan dikeluarkan dari kelas serta kamar yang ditempati.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowDeactivateConfirm(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeactivateConfirm(false)
                                    deactivateMut.mutate(santri.id)
                                }}
                                disabled={deactivateMut.isPending}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                            >
                                {deactivateMut.isPending ? 'Menonaktifkan...' : 'Ya, Nonaktifkan'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ═══ Delete Confirmation Modal ═══ */}
            {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-800">Hapus Santri?</h3>
                            <p className="text-sm text-slate-500 mt-1">Data santri <strong>&quot;{santri.fullName}&quot;</strong> akan dihapus secara permanen. Aksi ini tidak bisa dibatalkan.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false)
                                    deleteMut.mutate(santri.id)
                                }}
                                disabled={deleteMut.isPending}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-all shadow-md shadow-red-500/20 disabled:opacity-50"
                            >
                                {deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ═══ KK PDF Preview Modal ═══ */}
            {showKkModal && (santri as any).kkFileUrl && ((santri as any).kkFileUrl as string).match(/\.pdf($|\?)/i) && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowKkModal(false)}>
                    <div className="w-full max-w-4xl h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-semibold text-slate-700">Pratinjau File KK — {santri.fullName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={(santri as any).kkFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Buka di Tab Baru
                                </a>
                                <button onClick={() => setShowKkModal(false)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                        <iframe
                            src={(() => {
                                const url: string = (santri as any).kkFileUrl
                                if (url.startsWith('/uploads/')) {
                                    return `/api/kk-preview?path=${encodeURIComponent(url)}`
                                }
                                return `${url}#toolbar=0&navpanes=0&scrollbar=1`
                            })()}
                            className="flex-1 w-full border-0"
                            title="Pratinjau Kartu Keluarga"
                        />
                    </div>
                </div>,
                document.body
            )}

            {/* ═══ File Warning Modal ═══ */}
            {showFileWarning && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowFileWarning(false)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                            <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-800">File Tidak Dapat Diupload</h3>
                            <p className="text-sm text-slate-500 mt-2 whitespace-pre-line">{fileWarningMsg}</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                            <p className="text-xs text-amber-700 font-medium flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Format yang didukung: JPG, PNG, WebP, GIF (maks. 10MB)
                            </p>
                        </div>
                        <button
                            onClick={() => setShowFileWarning(false)}
                            className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-md shadow-teal-500/20"
                        >
                            Mengerti
                        </button>
                    </div>
                </div>,
                document.body
            )}
            {/* ═══ QR Code Modal ═══ */}
            {showQrModal && qrDataUrl && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQrModal(false)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">QR Code Santri</h3>
                            <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="text-center space-y-3">
                            <div className="inline-block p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 mx-auto" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{santri.fullName}</p>
                                <p className="text-sm text-slate-500 font-mono">{santri.nis}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => {
                                    const w = window.open('', '_blank')
                                    if (!w) return
                                    w.document.write(`<!DOCTYPE html><html><head><title>QR Code - ${santri.fullName}</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;}img{width:300px;height:300px;}h2{margin:20px 0 4px;font-size:18px;}p{margin:0;color:#666;font-size:14px;font-family:monospace;}</style></head><body><img src="${qrDataUrl}" /><h2>${santri.fullName}</h2><p>${santri.nis}</p></body></html>`)
                                    w.document.close()
                                    setTimeout(() => { w.print(); w.close() }, 400)
                                }}
                                className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 transition-all text-xs font-medium"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Print
                            </button>
                            <button
                                onClick={() => {
                                    const canvas = document.createElement('canvas')
                                    canvas.width = 400; canvas.height = 480
                                    const ctx = canvas.getContext('2d')!
                                    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 480)
                                    const img = new window.Image()
                                    img.onload = () => {
                                        ctx.drawImage(img, 50, 30, 300, 300)
                                        ctx.fillStyle = '#1e293b'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'
                                        ctx.fillText(santri.fullName, 200, 370)
                                        ctx.fillStyle = '#64748b'; ctx.font = '14px monospace'
                                        ctx.fillText(santri.nis, 200, 395)
                                        const a = document.createElement('a')
                                        a.download = `QR_${santri.nis}.png`; a.href = canvas.toDataURL('image/png'); a.click()
                                    }
                                    img.src = qrDataUrl
                                }}
                                className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all text-xs font-medium"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                PNG
                            </button>
                            <button
                                onClick={() => {
                                    const canvas = document.createElement('canvas')
                                    canvas.width = 400; canvas.height = 480
                                    const ctx = canvas.getContext('2d')!
                                    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 480)
                                    const img = new window.Image()
                                    img.onload = () => {
                                        ctx.drawImage(img, 50, 30, 300, 300)
                                        ctx.fillStyle = '#1e293b'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'
                                        ctx.fillText(santri.fullName, 200, 370)
                                        ctx.fillStyle = '#64748b'; ctx.font = '14px monospace'
                                        ctx.fillText(santri.nis, 200, 395)
                                        const a = document.createElement('a')
                                        a.download = `QR_${santri.nis}.jpg`; a.href = canvas.toDataURL('image/jpeg', 0.95); a.click()
                                    }
                                    img.src = qrDataUrl
                                }}
                                className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all text-xs font-medium"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                JPG
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Hidden print container */}
            <div ref={printRef} className="hidden">
                <PrintDataSantri santri={santri as any} logoUrl={logoUrl} />
            </div>
        </div >
    )
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div>
            <dt className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</dt>
            <dd className={`mt-1 text-sm font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>
                {value || <span className="text-slate-300 font-normal italic">Belum diisi</span>}
            </dd>
        </div>
    )
}
