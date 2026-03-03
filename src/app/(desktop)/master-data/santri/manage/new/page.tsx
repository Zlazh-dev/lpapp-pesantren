'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'
import FormSantri, { type FormSantriValues } from '../_components/FormSantri'

export default function TambahSantriPage() {
    const router = useRouter()
    const utils = trpc.useUtils()
    const [error, setError] = useState<string | null>(null)

    const createMut = trpc.santri.create.useMutation({
        onSuccess: () => {
            utils.santri.listCentralized.invalidate()
            router.push('/master-data/santri/manage')
        },
        onError: (err) => setError(err.message),
    })

    const handleSubmit = (values: FormSantriValues) => {
        setError(null)
        const hasAddress = Object.values(values.address).some((v) => v.trim())
        createMut.mutate({
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
            waliName: values.waliName || undefined,
            waliPhone: values.waliPhone || undefined,
            description: values.description || undefined,
            photoUrl: values.photoUrl || undefined,
            nik: values.nik || undefined,
            noKK: values.noKK || undefined,
            enrollmentDate: values.enrollmentDate || undefined,
            educationLevel: values.educationLevel || undefined,
            address: hasAddress ? values.address : undefined,
        })
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <Link
                    href="/master-data/santri/manage"
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Tambah Data Santri</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Isi data santri baru.</p>
                </div>
            </div>

            <FormSantri
                mode="create"
                onSubmit={handleSubmit}
                isSubmitting={createMut.isPending}
                error={error}
            />
        </div>
    )
}
