'use client'

import { useEffect, useRef, useState } from 'react'
import { trpc } from '@/utils/trpc'
import { useRouter } from 'next/navigation'

export default function MobileScanPage() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [scanning, setScanning] = useState(false)
    const [result, setResult] = useState<string | null>(null)
    const [parsedData, setParsedData] = useState<{ id: string, nis: string, name: string } | null>(null)

    const [selectedDormRoom, setSelectedDormRoom] = useState('')
    const [selectedClassGroup, setSelectedClassGroup] = useState('')

    const router = useRouter()
    const { data: dormRooms } = trpc.kamar.listDormRooms.useQuery(undefined, { enabled: !!parsedData })
    const { data: classGroups } = trpc.kelas.list.useQuery(undefined, { enabled: !!parsedData })

    // Fetch current santri details to pre-fill
    const { data: santriDetails } = trpc.santri.getById.useQuery(parsedData?.id ?? '', {
        enabled: !!parsedData?.id
    })

    const updateMut = trpc.santri.update.useMutation({
        onSuccess: () => {
            alert('Berhasil menyimpan penempatan!')
            handleReset()
            router.push('/m-santri')
        }
    })

    useEffect(() => {
        if (santriDetails) {
            setSelectedDormRoom(santriDetails.dormRoomId?.toString() || '')
            setSelectedClassGroup(santriDetails.classGroupId?.toString() || '')
        }
    }, [santriDetails])

    const handleReset = () => {
        setResult(null)
        setParsedData(null)
        setSelectedDormRoom('')
        setSelectedClassGroup('')
        window.location.reload()
    }

    const handleAssign = () => {
        if (!parsedData?.id) return
        updateMut.mutate({
            id: parsedData.id,
            dormRoomId: selectedDormRoom ? parseInt(selectedDormRoom) : null,
            classGroupId: selectedClassGroup || null,
        })
    }

    useEffect(() => {
        let animFrame: number
        let stream: MediaStream | null = null

        const startScan = async () => {
            try {
                if (result) return

                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.play()
                    setScanning(true)
                    tick()
                }
            } catch {
                setResult('Tidak dapat mengakses kamera')
            }
        }

        const tick = async () => {
            if (!videoRef.current || !canvasRef.current || result) return
            const video = videoRef.current
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
                animFrame = requestAnimationFrame(tick)
                return
            }
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

            try {
                const jsQR = (await import('jsqr')).default
                const code = jsQR(imageData.data, imageData.width, imageData.height)
                if (code) {
                    setResult(code.data)
                    setScanning(false)
                    stream?.getTracks().forEach(t => t.stop())

                    try {
                        const parsed = JSON.parse(code.data)
                        if (parsed.id) {
                            setParsedData(parsed)
                        }
                    } catch (e) {
                        // Not a valid JSON payload
                    }
                    return
                }
            } catch (e) {
                console.error("jsQR error", e)
            }

            animFrame = requestAnimationFrame(tick)
        }

        startScan()
        return () => {
            if (animFrame) cancelAnimationFrame(animFrame)
            if (stream) stream.getTracks().forEach(t => t.stop())
        }
    }, [result])

    return (
        <div className="space-y-4 animate-fade-in pb-20">
            <h1 className="text-xl font-bold text-slate-800">Assign Kamar/Kelas (Scanner)</h1>

            {!result ? (
                <div className="relative bg-black rounded-2xl overflow-hidden aspect-square">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                    {scanning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-48 h-48 border-2 border-teal-400 rounded-2xl animate-pulse-soft relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-teal-400 animate-[scan_2s_ease-in-out_infinite]" />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-slate-100 rounded-2xl aspect-square flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">QR CODE BERHASIL DISCAN</h2>
                    <p className="text-slate-500 text-sm mt-1">Lanjutkan ke penempatan di bawah</p>
                </div>
            )}

            {result && !parsedData ? (
                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
                    <p className="text-sm font-semibold text-red-600 mb-2">Error: Format QR Tidak Valid.</p>
                    <pre className="text-xs text-red-500 break-all">{result}</pre>
                    <button onClick={handleReset} className="mt-3 w-full py-2 rounded-xl font-medium bg-white text-red-600 border border-red-200">Scan Ulang</button>
                </div>
            ) : null}

            {parsedData && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                    <div className="pb-4 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Data Santri</p>
                        <h3 className="text-lg font-bold text-slate-800">{parsedData.name}</h3>
                        <p className="text-sm text-teal-600 font-mono">{parsedData.nis}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kamar Asrama</label>
                            <select
                                value={selectedDormRoom}
                                onChange={(e) => setSelectedDormRoom(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 outline-none"
                            >
                                <option value="">Belum / Tidak ada</option>
                                {dormRooms?.map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.floor?.building?.name} — {r.name} ({r._count.santri}/{r.capacity})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kelas Akademik</label>
                            <select
                                value={selectedClassGroup}
                                onChange={(e) => setSelectedClassGroup(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/30 outline-none"
                            >
                                <option value="">Belum / Tidak ada</option>
                                {classGroups?.map((cg: any) => (
                                    <option key={cg.id} value={cg.id}>{cg.grade?.level?.code} {cg.name} ({cg._count.santri} santri)</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-2 grid grid-cols-2 gap-3">
                        <button
                            onClick={handleReset}
                            className="w-full py-3 rounded-xl font-medium border border-slate-200 text-slate-600"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={updateMut.isPending}
                            className="w-full py-3 rounded-xl font-semibold text-white gradient-primary disabled:opacity-50"
                        >
                            {updateMut.isPending ? 'Loading...' : 'Simpan'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
