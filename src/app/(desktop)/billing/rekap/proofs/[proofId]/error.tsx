'use client'

export default function PaymentProofError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    if (process.env.NODE_ENV !== 'production') {
        console.error('[payment-proof-viewer]', error)
    }

    return (
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6">
            <h1 className="text-lg font-semibold text-slate-900">Gagal memuat bukti</h1>
            <p className="mt-2 text-sm text-slate-600">
                Terjadi kesalahan saat memuat halaman bukti pembayaran.
            </p>
            <button
                type="button"
                onClick={reset}
                className="mt-4 inline-flex rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
                Muat ulang
            </button>
        </div>
    )
}
