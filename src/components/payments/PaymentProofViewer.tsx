'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

type PaymentProofViewerProps = {
    resourceId: string
    fileUrl: string
    proofKind: 'image' | 'pdf'
}

export default function PaymentProofViewer({ resourceId, fileUrl, proofKind }: PaymentProofViewerProps) {
    const [attempt, setAttempt] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const fileSrc = useMemo(() => `${fileUrl}?attempt=${attempt}`, [fileUrl, attempt])

    useEffect(() => {
        if (proofKind !== 'pdf') return
        if (!isLoading) return

        const timeout = window.setTimeout(() => {
            setIsLoading(false)
        }, 3000)

        return () => window.clearTimeout(timeout)
    }, [proofKind, isLoading, attempt])

    const handleReload = () => {
        setIsLoading(true)
        setErrorMessage(null)
        setAttempt((prev) => prev + 1)
    }

    const showViewer = !errorMessage

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Pratinjau Bukti Pembayaran</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <a
                        href={fileSrc}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Buka di Tab Baru
                    </a>
                    <button
                        type="button"
                        onClick={handleReload}
                        className="inline-flex rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Muat ulang
                    </button>
                </div>
            </div>

            {!resourceId.trim() && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    ID bukti pembayaran tidak valid.
                </div>
            )}

            {isLoading && (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Loading...
                </div>
            )}

            {errorMessage && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Gagal memuat bukti pembayaran.
                </div>
            )}

            {showViewer && proofKind === 'image' && (
                <Image
                    key={fileSrc}
                    src={fileSrc}
                    alt="Bukti pembayaran"
                    width={1440}
                    height={1920}
                    unoptimized
                    className="max-h-[75vh] w-full rounded-xl border border-slate-200 bg-white object-contain"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false)
                        setErrorMessage('failed')
                    }}
                />
            )}

            {showViewer && proofKind === 'pdf' && (
                <object
                    key={fileSrc}
                    data={fileSrc}
                    type="application/pdf"
                    className="h-[78vh] w-full rounded-xl border border-slate-200 bg-white"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false)
                        setErrorMessage('failed')
                    }}
                >
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        Pratinjau PDF tidak tersedia pada browser ini. Gunakan tombol &quot;Buka di Tab Baru&quot;.
                    </div>
                </object>
            )}
        </section>
    )
}
