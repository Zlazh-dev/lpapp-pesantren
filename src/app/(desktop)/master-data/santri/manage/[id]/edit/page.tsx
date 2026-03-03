'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'
import FormSantri, { type FormSantriValues } from '../../_components/FormSantri'

export default function EditSantriPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const utils = trpc.useUtils()
    const [error, setError] = useState<string | null>(null)

    const { data: santri, isLoading, error: fetchError } = trpc.santri.getById.useQuery(id)

    const updateMut = trpc.santri.update.useMutation({
        onSuccess: () => {
            utils.santri.getById.invalidate(id)
            utils.santri.listCentralized.invalidate()
            router.push(`/master-data/santri/manage/${id}`)
        },
        onError: (err) => setError(err.message),
    })

    const handleSubmit = (values: FormSantriValues) => {
        setError(null)
        const hasAddress = Object.values(values.address).some((v) => v.trim())
        updateMut.mutate({
            id,
            fullName: values.fullName,
            nis: values.nis,
            gender: values.gender,
            birthPlace: values.birthPlace || undefined,
            birthDate: values.birthDate || undefined,
            phone: values.phone || undefined,
            fatherName: values.fatherName || undefined,
            motherName: values.motherName || undefined,
            fatherPhone: values.fatherPhone || undefined,
            motherPhone: values.motherPhone || undefined,
            waliName: values.waliName || null,
            waliPhone: values.waliPhone || null,
            description: values.description || null,
            photoUrl: values.photoUrl || undefined,
            dormRoomId: values.dormRoomId ? Number(values.dormRoomId) : null,
            nik: values.nik || null,
            noKK: values.noKK || null,
            enrollmentDate: values.enrollmentDate || null,
            educationLevel: values.educationLevel || null,
            address: hasAddress ? values.address : undefined,
        })
    }

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
                <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    if (fetchError) {
        return (
            <div className="max-w-3xl mx-auto">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
                    <p className="text-lg font-semibold text-red-700">Gagal memuat data</p>
                    <p className="text-sm text-red-500 mt-1">{fetchError.message}</p>
                    <Link
                        href="/master-data/santri/manage"
                        className="mt-4 inline-flex px-4 py-2 rounded-xl border border-red-300 bg-white text-sm font-medium text-red-700 hover:bg-red-50 transition-all"
                    >
                        Kembali ke List
                    </Link>
                </div>
            </div>
        )
    }

    if (!santri) return null

    const addr = (santri.address && typeof santri.address === 'object') ? santri.address as Record<string, string> : {}
    const defaultValues: Partial<FormSantriValues> = {
        fullName: santri.fullName,
        nis: santri.nis,
        gender: santri.gender as 'L' | 'P',
        birthPlace: santri.birthPlace ?? '',
        birthDate: santri.birthDate ? new Date(santri.birthDate).toISOString().slice(0, 10) : '',
        phone: santri.phone ?? '',
        fatherName: santri.fatherName ?? '',
        motherName: santri.motherName ?? '',
        fatherPhone: santri.fatherPhone ?? '',
        motherPhone: santri.motherPhone ?? '',
        waliName: (santri as any).waliName ?? '',
        waliPhone: (santri as any).waliPhone ?? '',
        description: (santri as any).description ?? '',
        photoUrl: santri.photoUrl ?? '',
        dormRoomId: (santri as any).dormRoomId ? String((santri as any).dormRoomId) : '',
        nik: (santri as any).nik ?? '',
        noKK: (santri as any).noKK ?? '',
        enrollmentDate: (santri as any).enrollmentDate ? new Date((santri as any).enrollmentDate).toISOString().slice(0, 10) : '',
        educationLevel: (santri as any).educationLevel ?? '',
        address: {
            jalan: addr.jalan ?? '',
            rt_rw: addr.rt_rw ?? '',
            kelurahan: addr.kelurahan ?? '',
            kecamatan: addr.kecamatan ?? '',
            kota: addr.kota ?? '',
            provinsi: addr.provinsi ?? '',
        },
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <Link
                    href={`/master-data/santri/manage/${id}`}
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Edit Data Santri</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Ubah data <span className="font-semibold text-slate-700">{santri.fullName}</span></p>
                </div>
            </div>

            <FormSantri
                mode="edit"
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
                isSubmitting={updateMut.isPending}
                error={error}
            />
        </div>
    )
}
