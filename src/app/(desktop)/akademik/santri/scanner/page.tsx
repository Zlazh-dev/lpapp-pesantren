'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'

export default function AkademikSantriScannerPage() {
    const router = useRouter()
    const scannerRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [status, setStatus] = useState<'idle' | 'scanning' | 'processing' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')
    const [lastNis, setLastNis] = useState('')
    const processingRef = useRef(false)

    const scanQrMut = trpc.sectionMember.scanQr.useMutation()

    useEffect(() => {
        let html5Qr: any = null

        const startScanner = async () => {
            const { Html5Qrcode } = await import('html5-qrcode')
            html5Qr = new Html5Qrcode('qr-reader')
            scannerRef.current = html5Qr

            try {
                await html5Qr.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 280, height: 280 } },
                    async (decodedText: string) => {
                        if (processingRef.current) return
                        processingRef.current = true
                        setStatus('processing')
                        setLastNis(decodedText.trim())
                        setMessage(`Memproses NIS: ${decodedText.trim()}...`)

                        try {
                            await html5Qr.stop()
                        } catch { }

                        try {
                            const result = await scanQrMut.mutateAsync({
                                nis: decodedText.trim(),
                                section: 'AKADEMIK',
                            })
                            setStatus('success')
                            setMessage(
                                result.wasAdded
                                    ? `✅ "${result.santriName}" berhasil ditambahkan ke Madrasah. Membuka detail...`
                                    : `✅ Data ditemukan: "${result.santriName}". Membuka detail...`
                            )
                            setTimeout(() => {
                                router.push(`/akademik/santri/${result.santriId}`)
                            }, 1200)
                        } catch (err: any) {
                            setStatus('error')
                            setMessage(err?.message ?? 'Terjadi kesalahan saat memproses QR code.')
                        }
                    },
                    () => { /* ignore scan failures */ }
                )
                setStatus('scanning')
            } catch (err: any) {
                setStatus('error')
                setMessage('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.')
            }
        }

        startScanner()

        return () => {
            if (html5Qr) {
                html5Qr.stop().catch(() => { })
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleRetry = async () => {
        processingRef.current = false
        setStatus('idle')
        setMessage('')
        setLastNis('')

        // Restart by reloading the scanner
        if (scannerRef.current) {
            try { await scannerRef.current.stop() } catch { }
        }

        const { Html5Qrcode } = await import('html5-qrcode')
        const html5Qr = new Html5Qrcode('qr-reader')
        scannerRef.current = html5Qr

        try {
            await html5Qr.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 280, height: 280 } },
                async (decodedText: string) => {
                    if (processingRef.current) return
                    processingRef.current = true
                    setStatus('processing')
                    setLastNis(decodedText.trim())
                    setMessage(`Memproses NIS: ${decodedText.trim()}...`)

                    try { await html5Qr.stop() } catch { }

                    try {
                        const result = await scanQrMut.mutateAsync({
                            nis: decodedText.trim(),
                            section: 'AKADEMIK',
                        })
                        setStatus('success')
                        setMessage(
                            result.wasAdded
                                ? `✅ "${result.santriName}" berhasil ditambahkan ke Madrasah. Membuka detail...`
                                : `✅ Data ditemukan: "${result.santriName}". Membuka detail...`
                        )
                        setTimeout(() => {
                            router.push(`/akademik/santri/${result.santriId}`)
                        }, 1200)
                    } catch (err: any) {
                        setStatus('error')
                        setMessage(err?.message ?? 'Terjadi kesalahan saat memproses QR code.')
                    }
                },
                () => { }
            )
            setStatus('scanning')
        } catch {
            setStatus('error')
            setMessage('Tidak dapat mengakses kamera.')
        }
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="w-8 h-8 rounded border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500 transition"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-sm font-bold text-gray-900">Scan QR Code Santri</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Arahkan kamera ke QR code pada kartu santri</p>
                </div>
            </div>

            {/* Scanner area */}
            <div className="p-6 flex flex-col items-center gap-5">
                {/* Camera view */}
                <div className="relative w-full max-w-sm">
                    <div
                        id="qr-reader"
                        ref={containerRef}
                        className="w-full rounded-xl overflow-hidden border-2 border-gray-200"
                        style={{ minHeight: 300 }}
                    />
                    {/* Scanning overlay */}
                    {status === 'scanning' && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-64 border-2 border-blue-500 rounded-xl relative">
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                                {/* Scanning line */}
                                <div className="absolute inset-x-2 h-0.5 bg-blue-400 opacity-80 animate-bounce" style={{ top: '50%' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Status messages */}
                {status === 'idle' && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Memulai kamera...
                    </div>
                )}

                {status === 'scanning' && (
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-sm font-medium text-blue-700">Mendeteksi QR code...</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Arahkan kamera ke QR code pada kartu santri</p>
                    </div>
                )}

                {status === 'processing' && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200">
                        <svg className="w-4 h-4 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm font-medium text-amber-700">{message}</span>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium text-emerald-700">{message}</span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="w-full max-w-sm space-y-3">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-sm font-semibold text-red-800">Gagal memproses QR</p>
                                <p className="text-xs text-red-600 mt-0.5">{message}</p>
                                {lastNis && <p className="text-xs text-red-400 mt-1 font-mono">NIS: {lastNis}</p>}
                            </div>
                        </div>
                        <button
                            onClick={handleRetry}
                            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Scan Ulang
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
