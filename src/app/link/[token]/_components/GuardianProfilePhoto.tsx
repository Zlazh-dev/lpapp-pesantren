'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { Icon } from '@/components/icons'

const GuardianPhotoLightbox = dynamic(() => import('./GuardianPhotoLightbox'), { ssr: false })

type GuardianProfilePhotoProps = {
    fullName: string
    photoUrl: string | null
}

export default function GuardianProfilePhoto({ fullName, photoUrl }: GuardianProfilePhotoProps) {
    const [open, setOpen] = useState(false)
    const initial = useMemo(() => (fullName?.trim()?.[0] ?? 'S').toUpperCase(), [fullName])
    const canPreview = !!photoUrl

    return (
        <>
            <button
                type="button"
                onClick={() => canPreview && setOpen(true)}
                className="group relative h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                title="Lihat foto"
            >
                {photoUrl ? (
                    <img src={photoUrl} alt={`Foto ${fullName}`} className="h-full w-full object-cover" />
                ) : (
                    <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-500">
                        {initial}
                    </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700">
                        <Icon name="eye" size={13} className="text-slate-700" />
                        Lihat foto
                    </span>
                </span>
            </button>

            {photoUrl && (
                <GuardianPhotoLightbox
                    open={open}
                    imageUrl={photoUrl}
                    fullName={fullName}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    )
}
