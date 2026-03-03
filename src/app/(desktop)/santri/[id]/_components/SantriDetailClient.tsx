'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { trpc } from '@/utils/trpc'
import { formatDate, formatRupiah, getGenderLabel, getBillStatusLabel, getBillStatusColor } from '@/utils/format'
import Link from 'next/link'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { Icon } from '@/components/icons'
import { formatBillingPeriod } from '@/lib/billing/period'

type Tab = 'details' | 'tagihan' | 'akademik' | 'kesehatan' | 'aktivitas'

type FormData = {
    fullName: string; nis: string; gender: string; birthPlace: string; birthDate: string
    phone: string; fatherName: string; motherName: string; fatherPhone: string; motherPhone: string
    jalan: string; rt_rw: string; kelurahan: string; kecamatan: string; kota: string; provinsi: string; kodepos: string
}

export default function SantriDetailClient({ santriId }: { santriId: string }) {
    const id = santriId
    const { data: santri, isLoading } = trpc.santri.getById.useQuery(id)
    const { data: financeSummary } = trpc.billing.getSantriFinancialSummary.useQuery({ santriId: id }, { enabled: !!id })
    const { data: currentRoomRes } = trpc.dorm.getSantriCurrentRoom.useQuery({ santriId: id }, { enabled: !!id })

    // Academic ClassGroup cascade
    const { data: levels } = trpc.academic.levels.list.useQuery()
    const [selLevelId, setSelLevelId] = useState('')
    const [selGradeId, setSelGradeId] = useState('')
    const [selClassGroupId, setSelClassGroupId] = useState<string | null>(null)
    const selLevel = levels?.find((l: any) => l.id === selLevelId)
    const selGrades = selLevel?.grades ?? []
    const { data: classGroups } = trpc.academic.classes.listByGrade.useQuery({ gradeId: selGradeId }, { enabled: !!selGradeId })

    // Dorm rooms
    const { data: rooms } = trpc.dorm.room.list.useQuery()
    const [selRoomId, setSelRoomId] = useState<number | null>(null)

    const [activeTab, setActiveTab] = useState<Tab>('details')
    const [editing, setEditing] = useState(false)
    const [showQR, setShowQR] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [form, setForm] = useState<FormData | null>(null)
    const [notes, setNotes] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showFileWarning, setShowFileWarning] = useState(false)
    const [fileWarningMsg, setFileWarningMsg] = useState('')

    const utils = trpc.useUtils()
    const updateMut = trpc.santri.update.useMutation({
        onSuccess: () => { utils.santri.getById.invalidate(id); setEditing(false) },
    })
    const deleteMut = trpc.santri.delete.useMutation({
        onSuccess: () => { window.location.href = '/santri' },
    })
    const assignDormMut = trpc.dorm.assignment.assign.useMutation({
        onSuccess: () => utils.santri.getById.invalidate(id),
    })
    const removeDormMut = trpc.dorm.assignment.remove.useMutation({
        onSuccess: () => utils.santri.getById.invalidate(id),
    })

    const currentRoom = currentRoomRes?.room ?? null
    const parsedCurrentRoomId = currentRoom?.id ? Number(currentRoom.id) : null
    const currentRoomId = parsedCurrentRoomId !== null && !Number.isNaN(parsedCurrentRoomId) ? parsedCurrentRoomId : null

    useEffect(() => {
        if (santri && !form) {
            const addr = santri.address as Record<string, string> | null
            setForm({
                fullName: santri.fullName, nis: santri.nis, gender: santri.gender,
                birthPlace: santri.birthPlace ?? '', birthDate: santri.birthDate ? new Date(santri.birthDate).toISOString().split('T')[0] : '',
                phone: santri.phone ?? '', fatherName: santri.fatherName ?? '', motherName: santri.motherName ?? '', fatherPhone: santri.fatherPhone ?? '', motherPhone: santri.motherPhone ?? '',
                jalan: addr?.jalan ?? '', rt_rw: addr?.rt_rw ?? '', kelurahan: addr?.kelurahan ?? '',
                kecamatan: addr?.kecamatan ?? '', kota: addr?.kota ?? '', provinsi: addr?.provinsi ?? '', kodepos: addr?.kodepos ?? '',
            })
            // Preselect ClassGroup cascade
            if ((santri as any).classGroup) {
                const cg = (santri as any).classGroup
                setSelLevelId(cg.grade?.level?.id ?? '')
                setSelGradeId(cg.grade?.id ?? '')
                setSelClassGroupId(cg.id)
            }
            setSelRoomId(currentRoomId ?? (santri as any).dormRoom?.id ?? null)
        }
    }, [santri, form, currentRoomId])

    useEffect(() => {
        if (editing || !santri) return
        setSelRoomId(currentRoomId ?? (santri as any).dormRoom?.id ?? null)
    }, [editing, currentRoomId, santri])

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !santri) return

        // Strict client-side validation
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
        const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']
        const ext = file.name.lastIndexOf('.') >= 0 ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : ''

        if (!allowedTypes.includes(file.type)) {
            setFileWarningMsg(`File "${file.name}" bukan gambar yang valid.\nTipe file terdeteksi: ${file.type || 'tidak diketahui'}.\n\nHanya file gambar (JPG, PNG, WebP, GIF) yang diperbolehkan untuk foto profil.`)
            setShowFileWarning(true)
            e.target.value = ''
            return
        }
        if (ext && !allowedExts.includes(ext)) {
            setFileWarningMsg(`Ekstensi file "${ext}" tidak diperbolehkan.\n\nGunakan file dengan format: JPG, PNG, WebP, atau GIF.`)
            setShowFileWarning(true)
            e.target.value = ''
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            setFileWarningMsg(`Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB).\n\nMaksimal ukuran file: 10MB.`)
            setShowFileWarning(true)
            e.target.value = ''
            return
        }

        setUploading(true)
        try {
            const fd = new FormData(); fd.append('file', file)
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            if (!res.ok) {
                const errData = await res.json().catch(() => null)
                throw new Error(errData?.error || 'Gagal upload')
            }
            const data = await res.json()
            updateMut.mutate({ id: santri.id, photoUrl: data.url })
        } catch (err: any) {
            setFileWarningMsg(err?.message || 'Gagal upload foto. Pastikan file adalah gambar yang valid.')
            setShowFileWarning(true)
        }
        finally { setUploading(false); e.target.value = '' }
    }

    const handleSave = () => {
        if (!form || !santri) return
        const address = { jalan: form.jalan, rt_rw: form.rt_rw, kelurahan: form.kelurahan, kecamatan: form.kecamatan, kota: form.kota, provinsi: form.provinsi, kodepos: form.kodepos }
        const hasAddress = Object.values(address).some(v => v)
        // Save personal data + classGroupId
        updateMut.mutate({
            id: santri.id, fullName: form.fullName, nis: form.nis, gender: form.gender as 'L' | 'P',
            birthPlace: form.birthPlace || undefined, birthDate: form.birthDate || undefined,
            phone: form.phone || undefined, fatherName: form.fatherName || undefined, motherName: form.motherName || undefined, fatherPhone: form.fatherPhone || undefined, motherPhone: form.motherPhone || undefined,
            classGroupId: selClassGroupId,
            address: hasAddress ? address : undefined,
        })
        // Handle dorm assignment change
        const currentDormId = currentRoomId ?? (santri as any).dormRoom?.id ?? null
        if (selRoomId !== currentDormId) {
            if (selRoomId) {
                assignDormMut.mutate({ santriId: santri.id, roomId: selRoomId })
            } else if (currentDormId) {
                removeDormMut.mutate({ santriId: santri.id })
            }
        }
    }

    const startEditing = () => {
        if (!santri) return
        const addr = santri.address as Record<string, string> | null
        setForm({
            fullName: santri.fullName, nis: santri.nis, gender: santri.gender,
            birthPlace: santri.birthPlace ?? '', birthDate: santri.birthDate ? new Date(santri.birthDate).toISOString().split('T')[0] : '',
            phone: santri.phone ?? '', fatherName: santri.fatherName ?? '', motherName: santri.motherName ?? '', fatherPhone: santri.fatherPhone ?? '', motherPhone: santri.motherPhone ?? '',
            jalan: addr?.jalan ?? '', rt_rw: addr?.rt_rw ?? '', kelurahan: addr?.kelurahan ?? '',
            kecamatan: addr?.kecamatan ?? '', kota: addr?.kota ?? '', provinsi: addr?.provinsi ?? '', kodepos: addr?.kodepos ?? '',
        })
        // Reset cascade to current values
        const cg = (santri as any).classGroup
        if (cg) {
            setSelLevelId(cg.grade?.level?.id ?? '')
            setSelGradeId(cg.grade?.id ?? '')
            setSelClassGroupId(cg.id)
        } else {
            setSelLevelId(''); setSelGradeId(''); setSelClassGroupId(null)
        }
        setSelRoomId(currentRoomId ?? (santri as any).dormRoom?.id ?? null)
        setEditing(true)
        setActiveTab('details')
    }

    const F = (key: keyof FormData, val: string | number | null) => setForm(f => f ? { ...f, [key]: val } : f)

    if (isLoading) return (
        <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
            <div className="h-8 w-64 bg-slate-200 rounded" />
            <div className="h-48 bg-slate-200 rounded-2xl" />
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="grid grid-cols-2 gap-6"><div className="h-64 bg-slate-200 rounded-2xl" /><div className="h-64 bg-slate-200 rounded-2xl" /></div>
        </div>
    )
    if (!santri) return <div className="text-center py-12 text-slate-400">Santri tidak ditemukan. <Link href="/santri" className="text-teal-600 underline">Kembali ke daftar</Link></div>

    const address = santri.address as Record<string, string> | null
    const totalInvoiced = financeSummary?.totalInvoiced ?? 0
    const totalPaidVerified = financeSummary?.totalPaid ?? 0
    const totalUnpaid = financeSummary?.outstanding ?? 0
    const invoiceCount = financeSummary?.invoiceCount ?? 0
    const hasInvoices = invoiceCount > 0

    const TABS: { key: Tab; label: string; metric: string | number }[] = [
        { key: 'details', label: 'Detail', metric: '-' },
        { key: 'tagihan', label: 'Tagihan', metric: invoiceCount },
        { key: 'akademik', label: 'Akademik', metric: '-' },
        { key: 'kesehatan', label: 'Kesehatan', metric: '-' },
        { key: 'aktivitas', label: 'Aktivitas', metric: '-' },
    ]

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-slate-400">
                <Link href="/santri" className="hover:text-teal-600 transition-colors">Data Santri</Link>
                <Icon name="link" size={14} className="text-slate-400" />
                <span className="text-slate-700 font-medium">{santri.fullName}</span>
            </nav>

            {/* ========== Header Profile ========== */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 flex items-start gap-6">
                    {/* Photo */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-[150px] h-[150px] rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center relative overflow-hidden cursor-pointer group shrink-0 border-2 border-slate-200 hover:border-teal-300 transition-colors"
                    >
                        {santri.photoUrl ? (
                            <Image src={santri.photoUrl} alt={santri.fullName} fill className="object-cover" />
                        ) : (
                            <span className="text-5xl font-bold text-teal-400 group-hover:text-teal-500 transition-colors">{santri.fullName.charAt(0)}</span>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        {uploading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            </div>
                        )}
                        <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif,.bmp" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">{santri.fullName}</h1>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-sm font-mono font-medium">NIS: {santri.nis}</span>
                                    {currentRoom && <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-sm font-medium border border-teal-100">Kamar {currentRoom.name}</span>}
                                    {(santri as any).classGroup && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
                                            <Icon name="kelas" size={14} className="text-blue-600" />
                                            {(santri as any).classGroup.name}
                                        </span>
                                    )}

                                </div>

                                {/* Status badges */}
                                <div className="flex items-center gap-2 mt-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${santri.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${santri.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        {santri.isActive ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${santri.gender === 'L' ? 'bg-sky-50 text-sky-700' : 'bg-pink-50 text-pink-700'}`}>
                                        {santri.gender === 'L' ? 'Putra' : 'Putri'}
                                    </span>
                                    <span className="text-xs text-slate-400">Diperbarui {formatDate(santri.updatedAt)}</span>
                                </div>

                                {/* Quick contact */}
                                <div className="flex items-center gap-3 mt-3">
                                    {santri.phone && (
                                        <a href={`tel:${santri.phone}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            {santri.phone}
                                        </a>
                                    )}
                                    {santri.fatherPhone && (
                                        <a href={`https://wa.me/${santri.fatherPhone.replace(/^0/, '62')}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                                            WA Wali
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => setShowQR(!showQR)}
                                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50 transition-all text-sm font-medium flex items-center gap-1.5" title="QR Code">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                    QR
                                </button>

                                <button onClick={editing ? () => setEditing(false) : startEditing}
                                    className={`px-3 py-2 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-all ${editing ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    {editing ? 'Batal' : 'Edit'}
                                </button>
                                <button onClick={() => setShowDeleteConfirm(true)}
                                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all text-sm font-medium flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* QR */}
            {showQR && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
                    <QRCodeSVG value={JSON.stringify({ id: santri.id, nis: santri.nis, name: santri.fullName })} size={180} level="H" includeMargin />
                    <p className="text-sm text-slate-500 mt-3">NIS: {santri.nis} - Scan untuk absensi</p>
                </div>
            )}

            {/* ========== Tab Navigation ========== */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex border-b border-slate-100">
                    {TABS.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 px-4 py-3.5 text-center transition-all relative ${activeTab === tab.key ? 'text-teal-700 font-semibold' : 'text-slate-400 hover:text-slate-600'}`}>
                            <span className="text-sm">{tab.label}</span>
                            <span className={`block text-xs mt-0.5 ${activeTab === tab.key ? 'text-teal-500' : 'text-slate-300'}`}>{tab.metric}</span>
                            {activeTab === tab.key && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-teal-500 rounded-full" />}
                        </button>
                    ))}
                </div>

                {/* ========== Tab: Details ========== */}
                {activeTab === 'details' && (
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-6">
                            {/* Left Column: Data Pribadi */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        Data Pribadi
                                    </h3>
                                    <div className="space-y-4">
                                        {editing && form ? (<>
                                            <Field label="Nama Lengkap" value={form.fullName} onChange={v => F('fullName', v)} />
                                            <Field label="NIS" value={form.nis} onChange={v => F('nis', v)} />
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                                                <select value={form.gender} onChange={e => F('gender', e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all">
                                                    <option value="L">Laki-laki (Putra)</option><option value="P">Perempuan (Putri)</option>
                                                </select>
                                            </div>
                                            <Field label="Tempat Lahir" value={form.birthPlace} onChange={v => F('birthPlace', v)} />
                                            <Field label="Tanggal Lahir" type="date" value={form.birthDate} onChange={v => F('birthDate', v)} />
                                            <Field label="No. HP Santri" value={form.phone} onChange={v => F('phone', v)} />
                                            <Field label="Nama Ayah" value={form.fatherName} onChange={v => F('fatherName', v)} />
                                            <Field label="Nama Ibu" value={form.motherName} onChange={v => F('motherName', v)} />
                                            <Field label="No. HP Ayah" value={form.fatherPhone} onChange={v => F('fatherPhone', v)} />
                                            <Field label="No. HP Ibu" value={form.motherPhone} onChange={v => F('motherPhone', v)} />
                                        </>) : (<>
                                            {[
                                                ['Nama Lengkap', santri.fullName],
                                                ['NIS', santri.nis],
                                                ['Gender', getGenderLabel(santri.gender)],
                                                ['Tempat Lahir', santri.birthPlace ?? '-'],
                                                ['Tanggal Lahir', santri.birthDate ? formatDate(santri.birthDate) : '-'],
                                                ['No. HP Santri', santri.phone ?? '-'],
                                                ['Nama Ayah', santri.fatherName ?? '-'],
                                                ['Nama Ibu', santri.motherName ?? '-'],
                                                ['No. HP Ayah', santri.fatherPhone ?? '-'],
                                                ['No. HP Ibu', santri.motherPhone ?? '-'],
                                            ].map(([label, value]) => (
                                                <div key={label} className="flex justify-between items-start py-2.5 border-b border-slate-50 last:border-0">
                                                    <span className="text-sm text-slate-500">{label}</span>
                                                    <span className="text-sm font-medium text-slate-800 text-right">{value}</span>
                                                </div>
                                            ))}
                                        </>)}
                                    </div>
                                </div>

                                {/* Address section */}
                                <div>
                                    <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        Alamat
                                    </h3>
                                    {editing && form ? (
                                        <div className="space-y-4">
                                            <Field label="Jalan" value={form.jalan} onChange={v => F('jalan', v)} />
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="RT/RW" value={form.rt_rw} onChange={v => F('rt_rw', v)} placeholder="001/002" />
                                                <Field label="Kelurahan/Desa" value={form.kelurahan} onChange={v => F('kelurahan', v)} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="Kecamatan" value={form.kecamatan} onChange={v => F('kecamatan', v)} />
                                                <Field label="Kota/Kabupaten" value={form.kota} onChange={v => F('kota', v)} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="Provinsi" value={form.provinsi} onChange={v => F('provinsi', v)} />
                                                <Field label="Kode Pos" value={form.kodepos} onChange={v => F('kodepos', v)} placeholder="12345" />
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-700 leading-relaxed">
                                            {address ? [address.jalan, address.rt_rw && `RT/RW ${address.rt_rw}`, address.kelurahan, address.kecamatan, address.kota, address.provinsi, address.kodepos].filter(Boolean).join(', ') : '- Belum diisi -'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Info Pendidikan & Akomodasi */}
                            <div className="space-y-6">
                                {/* Rombel & Kamar */}
                                <div>
                                    <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                        Pendidikan & Akomodasi
                                    </h3>
                                    {editing && form ? (
                                        <div className="space-y-4">
                                            {/* ClassGroup Cascade: Jenjang to Tingkat to Rombel */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jenjang</label>
                                                <select value={selLevelId} onChange={e => { setSelLevelId(e.target.value); setSelGradeId(''); setSelClassGroupId(null) }}
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm">
                                                    <option value="">- Pilih Jenjang -</option>
                                                    {levels?.map((l: any) => <option key={l.id} value={l.id}>{l.code} - {l.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tingkat</label>
                                                <select value={selGradeId} onChange={e => { setSelGradeId(e.target.value); setSelClassGroupId(null) }}
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm" disabled={!selLevelId}>
                                                    <option value="">- Pilih Tingkat -</option>
                                                    {selGrades.map((g: any) => <option key={g.id} value={g.id}>Tingkat {g.number}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rombel (Kelas)</label>
                                                <select value={selClassGroupId ?? ''} onChange={e => setSelClassGroupId(e.target.value || null)}
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm" disabled={!selGradeId}>
                                                    <option value="">- Pilih Rombel -</option>
                                                    {classGroups?.map((cg: any) => <option key={cg.id} value={cg.id}>{cg.name}{cg.schoolYear ? ` (${cg.schoolYear.name})` : ''}</option>)}
                                                </select>
                                            </div>
                                            {/* Dorm Room */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kamar Asrama</label>
                                                <select value={selRoomId ?? ''} onChange={e => setSelRoomId(e.target.value ? parseInt(e.target.value) : null)}
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm">
                                                    <option value="">- Pilih Kamar -</option>
                                                    {rooms?.map((r: any) => <option key={r.id} value={r.id}>{r.name} - {r.floor?.building?.complex?.name} - {r.floor?.building?.name} - Lt. {r.floor?.number}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-100">
                                                <p className="text-xs text-teal-500 font-semibold uppercase tracking-wider">Kamar Asrama</p>
                                                <p className="text-lg font-bold text-teal-800 mt-1">{currentRoom?.name ?? "Belum di-assign kamar"}</p>
                                                {currentRoom && <p className="text-xs text-teal-500 mt-0.5">{currentRoom.complexName} - {currentRoom.buildingName} - Lantai {currentRoom.floorNumber}</p>}
                                            </div>
                                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                                                <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider">Rombel (Kelas)</p>
                                                <p className="text-lg font-bold text-blue-800 mt-1">{(santri as any).classGroup?.name ?? '-'}</p>
                                                {(santri as any).classGroup?.grade && <p className="text-xs text-blue-500 mt-0.5">{(santri as any).classGroup.grade.level.name} - Tingkat {(santri as any).classGroup.grade.number}</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Billing Quick Stats */}
                                <div>
                                    <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                        Ringkasan Keuangan
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-slate-500">Total Tagihan</span>
                                                <span className="text-lg font-bold text-slate-800">{formatRupiah(totalInvoiced)}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-emerald-600">Terbayar</span>
                                                <span className="text-lg font-bold text-emerald-700">{formatRupiah(totalPaidVerified)}</span>
                                            </div>
                                            {/* Progress bar */}
                                            <div className="mt-2 h-2 bg-emerald-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${totalInvoiced ? (totalPaidVerified / totalInvoiced) * 100 : 0}%` }} />
                                            </div>
                                            <p className="text-xs text-emerald-500 mt-1">{totalInvoiced ? Math.round((totalPaidVerified / totalInvoiced) * 100) : 0}% dari total</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-red-50/50 border border-red-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-red-500">Sisa Tagihan</span>
                                                <span className="text-lg font-bold text-red-600">{formatRupiah(totalUnpaid)}</span>
                                            </div>
                                        </div>
                                        {!hasInvoices && (
                                            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600">
                                                Belum ada tagihan diterbitkan untuk santri ini
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                        Catatan Admin
                                    </h3>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Tulis catatan tentang santri ini..."
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm resize-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all placeholder-slate-300" />
                                </div>
                            </div>
                        </div>

                        {/* Save Footer */}
                        {editing && (
                            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => setEditing(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">Batal</button>
                                <button onClick={handleSave} disabled={updateMut.isPending}
                                    className="px-5 py-2.5 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 text-sm inline-flex items-center gap-2">
                                    {updateMut.isPending ? 'Menyimpan...' : (
                                        <>
                                            <Icon name="save" size={16} className="text-white" />
                                            Simpan Perubahan
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                        {updateMut.error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{updateMut.error.message}</div>}
                    </div>
                )}

                {/* ========== Tab: Tagihan ========== */}
                {activeTab === 'tagihan' && <TagihanTab santriId={id} />}

                {/* ========== Tab: Akademik ========== */}
                {activeTab === 'akademik' && (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">Data Akademik</h3>
                        <p className="text-slate-400 mt-1 text-sm">Fitur nilai dan prestasi santri akan segera hadir</p>
                    </div>
                )}

                {/* ========== Tab: Kesehatan ========== */}
                {activeTab === 'kesehatan' && (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-pink-50 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">Data Kesehatan</h3>
                        <p className="text-slate-400 mt-1 text-sm">Fitur riwayat medis santri akan segera hadir</p>
                    </div>
                )}

                {/* ========== Tab: Aktivitas ========== */}
                {activeTab === 'aktivitas' && (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-purple-50 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">Log Aktivitas</h3>
                        <p className="text-slate-400 mt-1 text-sm">Fitur tracking aktivitas santri akan segera hadir</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-800">Hapus Santri?</h3>
                            <p className="text-sm text-slate-500 mt-1">Data santri <strong>&quot;{santri.fullName}&quot;</strong> akan dihapus secara permanen. Aksi ini tidak bisa dibatalkan.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                            <button onClick={() => { setShowDeleteConfirm(false); deleteMut.mutate(santri.id) }} disabled={deleteMut.isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-all shadow-md shadow-red-500/20 disabled:opacity-50">
                                {deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* File Warning Modal */}
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
        </div>
    )
}

/* ========== Reusable Field Component ========== */
function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all" />
        </div>
    )
}

/* ========== Tagihan Tab Component (Invoice-Based) ========== */
function TagihanTab({ santriId }: { santriId: string }) {
    const { data: invoices, isLoading } = trpc.invoice.getByStudent.useQuery(santriId)
    const utils = trpc.useUtils()
    const createPayment = trpc.payment.create.useMutation({ onSuccess: () => utils.invoice.getByStudent.invalidate(santriId) })
    const generateReceipt = trpc.payment.generateReceipt.useMutation()

    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [payModal, setPayModal] = useState<string | null>(null) // invoiceId
    const [payForm, setPayForm] = useState({ amount: '', method: 'CASH' as string, note: '' })
    const [error, setError] = useState('')

    const handlePay = () => {
        if (!payModal || !payForm.amount) return
        createPayment.mutate({
            invoiceId: payModal,
            amount: parseFloat(payForm.amount),
            method: payForm.method as any,
            note: payForm.note || undefined,
        }, {
            onSuccess: () => { setPayModal(null); setPayForm({ amount: '', method: 'CASH', note: '' }) },
            onError: (e: any) => setError(e.message),
        })
    }

    const handleReceipt = async (paymentId: string) => {
        const receipt = await generateReceipt.mutateAsync(paymentId)
        alert(`Resi dibuat: ${receipt.receiptNo}`)
    }

    const statusColor = (s: string) => {
        if (s === 'PAID') return 'bg-emerald-50 text-emerald-600'
        if (s === 'PARTIAL') return 'bg-amber-50 text-amber-600'
        if (s === 'VOID') return 'bg-slate-100 text-slate-400'
        return 'bg-red-50 text-red-600'
    }
    const statusLabel = (s: string) => {
        if (s === 'PAID') return 'Lunas'
        if (s === 'PARTIAL') return 'Sebagian'
        if (s === 'VOID') return 'Void'
        return 'Belum Lunas'
    }

    if (isLoading) return <div className="p-6"><div className="h-48 bg-slate-100 animate-pulse rounded-xl" /></div>

    return (
        <div className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

            {!invoices?.length ? (
                <div className="text-center py-12 text-slate-400">Belum ada tagihan (invoice). Generate dari halaman Model Tagihan.</div>
            ) : invoices.map((inv: any) => {
                const paidTotal = inv.payments?.reduce((s: number, p: any) => s + p.amount, 0) ?? 0
                const pct = inv.totalAmount ? Math.round((paidTotal / inv.totalAmount) * 100) : 0
                const expanded = expandedId === inv.id

                return (
                    <div key={inv.id} className="border border-slate-200 rounded-xl overflow-hidden transition-all hover:border-slate-300">
                        {/* Invoice Header */}
                        <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expanded ? null : inv.id)}>
                            <div className="flex items-center gap-3">
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-800">{inv.billingModel?.name}</h4>
                                    <p className="text-xs text-slate-400">Periode: {formatBillingPeriod(inv)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-sm font-mono font-bold text-slate-800">{formatRupiah(inv.totalAmount)}</div>
                                    <div className="text-xs font-mono text-emerald-600">{formatRupiah(paidTotal)} terbayar</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-red-300'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(inv.status)}`}>{statusLabel(inv.status)}</span>
                                </div>
                                <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {expanded && (
                            <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-25">
                                {/* Breakdown Items */}
                                {inv.items?.length > 0 && (
                                    <div>
                                        <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Rincian</h5>
                                        <div className="space-y-1">
                                            {inv.items.map((item: any) => (
                                                <div key={item.id} className="flex justify-between text-sm px-2 py-1">
                                                    <span className="text-slate-600">{item.label}</span>
                                                    <span className="font-mono text-slate-800">{formatRupiah(item.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Payment History */}
                                {inv.payments?.length > 0 && (
                                    <div>
                                        <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Riwayat Pembayaran</h5>
                                        <div className="space-y-2">
                                            {inv.payments.map((p: any) => (
                                                <div key={p.id} className="flex items-center justify-between bg-white rounded-lg border border-slate-100 px-3 py-2 text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono font-bold text-emerald-600">{formatRupiah(p.amount)}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-xs ${p.method === 'CASH' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{p.method}</span>
                                                        <span className="text-xs text-slate-400">{formatDate(p.paidAt)}</span>
                                                        {p.verifiedAt && (
                                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                                                                <Icon name="active" size={13} className="text-emerald-500" />
                                                                Verified
                                                            </span>
                                                        )}
                                                        {p.proofUrl && <a href={p.proofUrl} target="_blank" className="text-xs text-blue-500 hover:underline">Bukti</a>}
                                                    </div>
                                                    <button onClick={() => handleReceipt(p.id)} disabled={generateReceipt.isPending}
                                                        className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
                                                        <Icon name="receipt" size={14} className="text-current" />
                                                        Resi
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                                    <button onClick={() => { setPayModal(inv.id); setPayForm({ amount: String(inv.totalAmount - paidTotal), method: 'CASH', note: '' }) }}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-medium hover:bg-teal-600">
                                        <Icon name="add" size={14} className="text-white" />
                                        Tambah Pembayaran
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Payment Modal */}
            {payModal && (
                <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setPayModal(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800">Input Pembayaran</h3>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Nominal</label>
                            <input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" min={1} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Metode</label>
                            <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}
                                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
                                <option value="CASH">Cash</option>
                                <option value="TRANSFER">Transfer</option>
                                <option value="OTHER">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Catatan (opsional)</label>
                            <input value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))}
                                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="Catatan..." />
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <button onClick={() => setPayModal(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600">Batal</button>
                            <button onClick={handlePay} disabled={createPayment.isPending || !payForm.amount}
                                className="px-5 py-2 rounded-xl bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 disabled:opacity-50">
                                {createPayment.isPending ? 'Memproses...' : 'Simpan Pembayaran'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}




