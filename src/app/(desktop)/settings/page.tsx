'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { trpc } from '@/utils/trpc'

/* ── Reusable logo section component ── */
function LogoSection({
    title,
    description,
    settingKey,
    uploadType,
    badgeLabel,
    badgeColor,
}: {
    title: string
    description: string
    settingKey: string
    uploadType: 'sidebar' | 'document'
    badgeLabel: string
    badgeColor: string
}) {
    const utils = trpc.useUtils()
    const { data: logoUrl, isLoading } = trpc.settings.get.useQuery(settingKey)
    const setSettingMut = trpc.settings.set.useMutation({
        onSuccess: () => utils.settings.get.invalidate(settingKey),
    })

    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (file: File) => {
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch(`/api/upload-logo?type=${uploadType}`, { method: 'POST', body: formData })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Upload gagal')
            await setSettingMut.mutateAsync({ key: settingKey, value: data.url })
            setPreview(null)
        } catch (err: any) {
            alert(err.message || 'Gagal upload logo')
        } finally {
            setUploading(false)
        }
    }

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setPreview(URL.createObjectURL(file))
        handleUpload(file)
    }

    const removeLogo = async () => {
        await setSettingMut.mutateAsync({ key: settingKey, value: '' })
        setPreview(null)
    }

    const currentLogo = preview || logoUrl

    return (
        <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeColor}`}>
                            {badgeLabel}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{description}</p>
                </div>
            </div>

            {/* Preview + actions */}
            <div className="flex items-start gap-6">
                {/* Preview box */}
                <div className="flex flex-col items-center gap-2">
                    <div className="relative w-[100px] h-[100px] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden transition-all hover:border-emerald-300">
                        {isLoading ? (
                            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
                        ) : currentLogo ? (
                            <Image
                                src={currentLogo}
                                alt={title}
                                fill
                                className="object-contain p-2"
                                unoptimized
                            />
                        ) : (
                            <div className="text-center">
                                <svg className="w-7 h-7 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-[10px] text-slate-400 mt-1">Belum ada</p>
                            </div>
                        )}
                        {uploading && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400">Maks. 5MB</p>
                </div>

                {/* Actions */}
                <div className="flex-1 space-y-2 pt-1">
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={onFileChange}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-semibold text-white hover:opacity-90 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {uploading ? 'Mengupload...' : currentLogo ? 'Ganti Logo' : 'Upload Logo'}
                    </button>

                    {currentLogo && !uploading && (
                        <button
                            onClick={removeLogo}
                            disabled={setSettingMut.isPending}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 transition-all border border-red-200"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Hapus Logo
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ── Main Settings Page ── */
export default function SettingsPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Pengaturan</h1>
                <p className="text-sm text-slate-500 mt-1">Pengaturan global aplikasi pesantren</p>
            </div>

            {/* Logo Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                {/* Card header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Logo Pesantren</h2>
                        <p className="text-xs text-slate-400">Atur logo untuk tampilan aplikasi dan dokumen cetak secara terpisah</p>
                    </div>
                </div>

                {/* Two sections */}
                <div className="space-y-6">
                    {/* Logo Sidebar */}
                    <LogoSection
                        title="Logo Sidebar & Tampilan"
                        description="Digunakan di sidebar desktop, header mobile, dan halaman login"
                        settingKey="logo_url"
                        uploadType="sidebar"
                        badgeLabel="UI / Sidebar"
                        badgeColor="bg-teal-50 text-teal-700"
                    />

                    {/* Divider */}
                    <div className="border-t border-slate-100" />

                    {/* Logo Dokumen */}
                    <LogoSection
                        title="Logo Dokumen & Cetak"
                        description="Digunakan di header dokumen cetak data santri dan laporan lainnya"
                        settingKey="logo_document_url"
                        uploadType="document"
                        badgeLabel="Dokumen / Cetak"
                        badgeColor="bg-indigo-50 text-indigo-700"
                    />
                </div>

                {/* Info box */}
                <div className="mt-6 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="text-xs text-amber-700 flex items-start gap-2">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Kedua logo dapat diatur secara terpisah. Logo sidebar digunakan untuk tampilan aplikasi, sedangkan logo dokumen digunakan khusus untuk cetak data santri.
                    </p>
                </div>
            </div>
        </div>
    )
}
