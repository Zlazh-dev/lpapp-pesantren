'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { trpc } from '@/utils/trpc'
import { PROVINCE_NAMES, getKabupatenByProvince } from '@/utils/wilayah'

export type AddressValues = {
    jalan: string
    rt_rw: string
    kelurahan: string
    kecamatan: string
    kota: string
    provinsi: string
}

export type FormSantriValues = {
    fullName: string
    nis: string
    gender: 'L' | 'P'
    birthPlace: string
    birthDate: string
    phone: string
    fatherName: string
    motherName: string
    fatherPhone: string
    motherPhone: string
    waliName: string
    waliPhone: string
    description: string
    photoUrl: string
    dormRoomId: string
    nik: string
    noKK: string
    enrollmentDate: string
    deactivatedAt: string
    educationLevel: string
    address: AddressValues
}

const EMPTY_ADDRESS: AddressValues = {
    jalan: '',
    rt_rw: '',
    kelurahan: '',
    kecamatan: '',
    kota: '',
    provinsi: '',
}

const EMPTY_FORM: FormSantriValues = {
    fullName: '',
    nis: '',
    gender: 'L',
    birthPlace: '',
    birthDate: '',
    phone: '',
    fatherName: '',
    motherName: '',
    fatherPhone: '',
    motherPhone: '',
    waliName: '',
    waliPhone: '',
    description: '',
    photoUrl: '',
    dormRoomId: '',
    nik: '',
    noKK: '',
    enrollmentDate: '',
    deactivatedAt: '',
    educationLevel: '',
    address: { ...EMPTY_ADDRESS },
}

type FormSantriProps = {
    mode: 'create' | 'edit'
    defaultValues?: Partial<FormSantriValues>
    onSubmit: (values: FormSantriValues) => void
    isSubmitting: boolean
    error?: string | null
}

export default function FormSantri({ mode, defaultValues, onSubmit, isSubmitting, error }: FormSantriProps) {
    const [form, setForm] = useState<FormSantriValues>(() => ({
        ...EMPTY_FORM,
        ...defaultValues,
        address: { ...EMPTY_ADDRESS, ...defaultValues?.address },
    }))

    const { data: dormRooms } = trpc.kamar.listDormRooms.useQuery(undefined, { staleTime: 60_000 })
    const { data: generatedNis } = trpc.santri.generateNis.useQuery(undefined, {
        enabled: mode === 'create',
        staleTime: 0,
    })

    // Auto-fill NIS on create mode when generated value arrives
    useEffect(() => {
        if (mode === 'create' && generatedNis?.nis) {
            setForm((prev) => prev.nis === '' ? { ...prev, nis: generatedNis.nis } : prev)
        }
    }, [mode, generatedNis])

    // Auto-fill enrollment date on create mode
    useEffect(() => {
        if (mode === 'create') {
            setForm((prev) => prev.enrollmentDate === '' ? { ...prev, enrollmentDate: new Date().toISOString().slice(0, 10) } : prev)
        }
    }, [mode])

    const [validationError, setValidationError] = useState<string | null>(null)

    const F = (key: keyof Omit<FormSantriValues, 'address'>, val: string) =>
        setForm((prev) => ({ ...prev, [key]: val }))

    const FA = (key: keyof AddressValues, val: string) =>
        setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: val } }))

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setValidationError(null)

        // Validation rules
        const errors: string[] = []
        const phonePattern = /[^0-9+\-\s]/
        if (form.phone && phonePattern.test(form.phone)) errors.push('No. HP Santri hanya boleh berisi angka')
        if (form.fatherPhone && phonePattern.test(form.fatherPhone)) errors.push('No. HP Ayah hanya boleh berisi angka')
        if (form.motherPhone && phonePattern.test(form.motherPhone)) errors.push('No. HP Ibu hanya boleh berisi angka')
        if (form.waliPhone && phonePattern.test(form.waliPhone)) errors.push('No. HP Wali hanya boleh berisi angka')
        if (form.nik && /[^0-9]/.test(form.nik)) errors.push('NIK hanya boleh berisi 16 digit angka')
        if (form.noKK && /[^0-9]/.test(form.noKK)) errors.push('No. KK hanya boleh berisi 16 digit angka')
        if (form.nik && form.nik.length > 0 && form.nik.length !== 16) errors.push('NIK harus tepat 16 digit')
        if (form.noKK && form.noKK.length > 0 && form.noKK.length !== 16) errors.push('No. KK harus tepat 16 digit')

        if (errors.length > 0) {
            setValidationError(errors.join('. '))
            setTimeout(() => setValidationError(null), 5000)
            return
        }

        onSubmit(form)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}
            {validationError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-start gap-2.5 animate-fade-in">
                    <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="flex-1">
                        <p className="font-semibold text-amber-800 mb-0.5">Validasi Gagal</p>
                        <p>{validationError}</p>
                    </div>
                    <button type="button" onClick={() => setValidationError(null)} className="text-amber-400 hover:text-amber-600 shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}



            {/* Data Pribadi */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Data Pribadi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldInput label="Nama Lengkap *" value={form.fullName} onChange={(v) => F('fullName', v)}
                        placeholder="Contoh: Ahmad Fulan" required />
                    <FieldInput label="NIS *" value={form.nis} onChange={(v) => F('nis', v)}
                        placeholder="Nomor Induk Santri" required minLength={4} />
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Gender *</label>
                        <select
                            value={form.gender}
                            onChange={(e) => F('gender', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                        >
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                        </select>
                    </div>
                    <FieldInput label="Tempat Lahir" value={form.birthPlace} onChange={(v) => F('birthPlace', v)}
                        placeholder="Contoh: Surabaya" />
                    <FieldInput label="Tanggal Lahir" value={form.birthDate} onChange={(v) => F('birthDate', v)}
                        type="date" />
                    <FieldInput label="No. HP Santri" value={form.phone} onChange={(v) => F('phone', v)}
                        placeholder="08xxxxxxxxxx" />
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Kamar</label>
                        <select
                            value={form.dormRoomId}
                            onChange={(e) => F('dormRoomId', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                        >
                            <option value="">- Tidak Ada / Belum Ditempatkan -</option>
                            {(dormRooms ?? []).map((room: any) => (
                                <option key={room.id} value={String(room.id)}>
                                    {room.floor?.building?.name ? `${room.floor.building.name} — ` : ''}
                                    {room.floor?.number != null ? `Lt. ${room.floor.number} — ` : ''}
                                    {room.name}
                                    {room._count?.santri != null ? ` (${room._count.santri}/${room.capacity})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <FieldInput label="NIK" value={form.nik} onChange={(v) => F('nik', v)}
                        placeholder="16 digit NIK" maxLength={16} />
                    <FieldInput label="No. KK" value={form.noKK} onChange={(v) => F('noKK', v)}
                        placeholder="16 digit Nomor KK" maxLength={16} />
                    <FieldInput label="Tanggal Masuk" value={form.enrollmentDate} onChange={(v) => F('enrollmentDate', v)}
                        type="date" />
                    {mode === 'edit' && (
                        <FieldInput label="Tanggal Keluar" value={form.deactivatedAt} onChange={(v) => F('deactivatedAt', v)}
                            type="date" />
                    )}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Jenjang Pendidikan</label>
                        <select
                            value={form.educationLevel}
                            onChange={(e) => F('educationLevel', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                        >
                            <option value="">— Pilih Jenjang —</option>
                            <option value="Ma'had Aly">Ma&apos;had Aly</option>
                            <option value="Tahfidz">Tahfidz</option>
                            <option value="Formal">Formal</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Alamat */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Alamat</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <FieldInput label="Jalan" value={form.address.jalan} onChange={(v) => FA('jalan', v)}
                            placeholder="Nama jalan dan nomor rumah" />
                    </div>
                    <FieldInput label="RT/RW" value={form.address.rt_rw} onChange={(v) => FA('rt_rw', v)}
                        placeholder="Contoh: 001/002" />
                    <FieldInput label="Kelurahan / Desa" value={form.address.kelurahan} onChange={(v) => FA('kelurahan', v)}
                        placeholder="Nama kelurahan/desa" />
                    <FieldInput label="Kecamatan" value={form.address.kecamatan} onChange={(v) => FA('kecamatan', v)}
                        placeholder="Nama kecamatan" />
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Provinsi</label>
                        <select
                            value={form.address.provinsi}
                            onChange={(e) => {
                                FA('provinsi', e.target.value)
                                FA('kota', '') // Reset kabupaten when province changes
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                        >
                            <option value="">— Pilih Provinsi —</option>
                            {PROVINCE_NAMES.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Kota / Kabupaten</label>
                        <select
                            value={form.address.kota}
                            onChange={(e) => FA('kota', e.target.value)}
                            disabled={!form.address.provinsi}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">{form.address.provinsi ? '— Pilih Kabupaten/Kota —' : '— Pilih Provinsi Dulu —'}</option>
                            {getKabupatenByProvince(form.address.provinsi).map(k => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Data Orang Tua */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Data Orang Tua / Wali</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldInput label="Nama Ayah" value={form.fatherName} onChange={(v) => F('fatherName', v)}
                        placeholder="Nama lengkap ayah" />
                    <FieldInput label="Nama Ibu" value={form.motherName} onChange={(v) => F('motherName', v)}
                        placeholder="Nama lengkap ibu" />
                    <FieldInput label="No. HP Ayah" value={form.fatherPhone} onChange={(v) => F('fatherPhone', v)}
                        placeholder="08xxxxxxxxxx" />
                    <FieldInput label="No. HP Ibu" value={form.motherPhone} onChange={(v) => F('motherPhone', v)}
                        placeholder="08xxxxxxxxxx" />
                    <FieldInput label="Nama Wali Santri" value={form.waliName} onChange={(v) => F('waliName', v)}
                        placeholder="Nama lengkap wali santri" />
                    <FieldInput label="No. HP Wali Santri" value={form.waliPhone} onChange={(v) => F('waliPhone', v)}
                        placeholder="08xxxxxxxxxx" />
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Deskripsi Wali Santri (opsional)</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => F('description', e.target.value)}
                            placeholder="Catatan tambahan tentang wali santri (opsional)"
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all placeholder-slate-400 resize-y"
                        />
                    </div>
                </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3">
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || !form.fullName || !form.nis}
                    className="px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-90 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    {isSubmitting
                        ? 'Menyimpan...'
                        : mode === 'create'
                            ? 'Tambah Santri'
                            : 'Simpan Perubahan'}
                </button>
            </div>
        </form>
    )
}

function FieldInput({
    label, value, onChange, placeholder, type = 'text', required, minLength, maxLength,
}: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; type?: string; required?: boolean; minLength?: number; maxLength?: number;
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                minLength={minLength}
                maxLength={maxLength}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all placeholder-slate-400"
            />
        </div>
    )
}
