'use client'

import { useState } from 'react'
import { Icon } from '@/components/icons'

type GuardianPhotoLightboxProps = {
    open: boolean
    imageUrl: string
    fullName: string
    onClose: () => void
}

export default function GuardianPhotoLightbox({ open, imageUrl, fullName, onClose }: GuardianPhotoLightboxProps) {
    const [zoom, setZoom] = useState(1)

    if (!open) return null

    const zoomIn = () => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))
    const zoomOut = () => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))

    return (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="mx-auto flex h-full max-w-4xl items-center justify-center"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="relative rounded-2xl bg-slate-950 p-3 shadow-2xl">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{fullName}</p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={zoomOut}
                                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-100"
                            >
                                -
                            </button>
                            <span className="w-10 text-center text-xs text-slate-300">{Math.round(zoom * 100)}%</span>
                            <button
                                type="button"
                                onClick={zoomIn}
                                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-100"
                            >
                                +
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-100"
                            >
                                <Icon name="close" size={16} className="text-slate-100" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[75vh] max-w-[85vw] overflow-auto rounded-lg bg-black p-2">
                        <img
                            src={imageUrl}
                            alt={`Foto ${fullName}`}
                            className="origin-center rounded-lg"
                            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
