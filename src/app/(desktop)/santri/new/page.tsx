'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import Link from 'next/link'
import Image from 'next/image'

const PROVINSI_LIST = [
    'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi', 'Sumatera Selatan',
    'Bengkulu', 'Lampung', 'Bangka Belitung', 'Kepulauan Riau', 'DKI Jakarta',
    'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Banten',
    'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Kalimantan Barat',
    'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
    'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara',
    'Gorontalo', 'Sulawesi Barat', 'Maluku', 'Maluku Utara', 'Papua',
    'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya',
]

export default function NewSantriPage() {
    const router = useRouter()
    const utils = trpc.useUtils()
    const { data: dormRooms } = trpc.kamar.listDormRooms.useQuery()
    const { data: classGroups } = trpc.kelas.list.useQuery()

    const createMut = trpc.santri.create.useMutation({
        onSuccess: () => {
            utils.santri.list.invalidate()
            router.refresh()
            router.push('/santri')
        },
    })

    const [form, setForm] = useState({
        fullName: '',
        nis: '',
        gender: 'L',
        birthDate: '',
        birthPlace: '',
        phone: '',
        fatherName: '',
        fatherPhone: '',
        dormRoomId: '',
        classGroupId: '',
        photoUrl: '',
        address: {
            jalan: '',
            rt_rw: '',
            kelurahan: '',
            kecamatan: '',
            kota: '',
            provinsi: '',
            kodepos: '',
        },
    })

    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setUploadError('Hanya file gambar yang diperbolehkan')
            return
        }

        setUploading(true)
        setUploadError('')

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) throw new Error('Gagal mengupload gambar')

            const data = await res.json()
            setForm(prev => ({ ...prev, photoUrl: data.url }))
        } catch (err: any) {
            setUploadError(err.message || 'Gagal mengupload gambar')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        createMut.mutate({
            fullName: form.fullName,
            nis: form.nis,
            gender: form.gender as 'L' | 'P',
            birthDate: form.birthDate || undefined,
            birthPlace: form.birthPlace || undefined,
            phone: form.phone || undefined,
            fatherName: form.fatherName || undefined,
            fatherPhone: form.fatherPhone || undefined,
            dormRoomId: form.dormRoomId ? parseInt(form.dormRoomId) : undefined,
            classGroupId: form.classGroupId || undefined,
            photoUrl: form.photoUrl || undefined,
            address: form.address,
        })
    }

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const updateAddress = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }))
    }

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/santri" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Tambah Santri Baru</h1>
                    <p className="text-slate-500">Isi data lengkap santri</p>
                </div>
            </div>

            {createMut.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {createMut.error.message}
                </div>
            )}

            {uploadError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {uploadError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Data Pribadi */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Data Pribadi
                    </h2>

                    <div className="mb-6 flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-shrink-0">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Foto Santri (3x4)</label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-[120px] h-[160px] bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-100 hover:border-teal-400 transition-colors relative"
                            >
                                {form.photoUrl ? (
                                    <Image src={form.photoUrl} alt="Preview" fill className="object-cover" />
                                ) : (
                                    <div className="text-center text-slate-400 p-4">
                                        <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-xs font-medium">Upload</span>
                                    </div>
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center backdrop-blur-sm">
                                        <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap *</label>
                                <input
                                    required
                                    value={form.fullName}
                                    onChange={(e) => updateField('fullName', e.target.value)}
                                    placeholder="Nama lengkap santri"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">NIS *</label>
                                <input
                                    required
                                    value={form.nis}
                                    onChange={(e) => updateField('nis', e.target.value)}
                                    placeholder="Nomor Induk Santri"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Kelamin</label>
                                <select
                                    value={form.gender}
                                    onChange={(e) => updateField('gender', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                                >
                                    <option value="L">Laki-laki</option>
                                    <option value="P">Perempuan</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tempat Lahir</label>
                                <input
                                    value={form.birthPlace}
                                    onChange={(e) => updateField('birthPlace', e.target.value)}
                                    placeholder="Tempat lahir"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Lahir</label>
                                <input
                                    type="date"
                                    value={form.birthDate}
                                    onChange={(e) => updateField('birthDate', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">No. HP Santri</label>
                                <input
                                    value={form.phone}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    placeholder="0812xxxxxxxx"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Orang Tua */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Data Wali/Orang Tua
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Wali/Orang Tua</label>
                            <input
                                value={form.fatherName}
                                onChange={(e) => updateField('fatherName', e.target.value)}
                                placeholder="Nama wali"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">No. HP Wali</label>
                            <input
                                value={form.fatherPhone}
                                onChange={(e) => updateField('fatherPhone', e.target.value)}
                                placeholder="0812xxxxxxxx"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Kamar & Kelas */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Penempatan
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kamar Asrama</label>
                            <select
                                value={form.dormRoomId}
                                onChange={(e) => updateField('dormRoomId', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            >
                                <option value="">Pilih kamar</option>
                                {dormRooms?.map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.floor?.building?.name} — {r.name} ({r._count.santri}/{r.capacity})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kelas/Rombel</label>
                            <select
                                value={form.classGroupId}
                                onChange={(e) => updateField('classGroupId', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            >
                                <option value="">Pilih kelas</option>
                                {classGroups?.map((cg: any) => (
                                    <option key={cg.id} value={cg.id}>{cg.grade?.level?.code} {cg.name} ({cg._count.santri} santri)</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Alamat */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Alamat
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Jalan</label>
                            <input
                                value={form.address.jalan}
                                onChange={(e) => updateAddress('jalan', e.target.value)}
                                placeholder="Nama jalan, nomor rumah"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">RT/RW</label>
                            <input
                                value={form.address.rt_rw}
                                onChange={(e) => updateAddress('rt_rw', e.target.value)}
                                placeholder="001/002"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kelurahan/Desa</label>
                            <input
                                value={form.address.kelurahan}
                                onChange={(e) => updateAddress('kelurahan', e.target.value)}
                                placeholder="Kelurahan"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kecamatan</label>
                            <input
                                value={form.address.kecamatan}
                                onChange={(e) => updateAddress('kecamatan', e.target.value)}
                                placeholder="Kecamatan"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kota/Kabupaten</label>
                            <input
                                value={form.address.kota}
                                onChange={(e) => updateAddress('kota', e.target.value)}
                                placeholder="Kota"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Provinsi</label>
                            <select
                                value={form.address.provinsi}
                                onChange={(e) => updateAddress('provinsi', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            >
                                <option value="">Pilih provinsi</option>
                                {PROVINSI_LIST.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kode Pos</label>
                            <input
                                value={form.address.kodepos}
                                onChange={(e) => updateAddress('kodepos', e.target.value)}
                                placeholder="60123"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                    <Link
                        href="/santri"
                        className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-medium"
                    >
                        Batal
                    </Link>
                    <button
                        type="submit"
                        disabled={createMut.isPending || uploading}
                        className="px-6 py-2.5 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-teal-500/25"
                    >
                        {createMut.isPending ? 'Menyimpan...' : 'Simpan Santri'}
                    </button>
                </div>
            </form>
        </div>
    )
}
