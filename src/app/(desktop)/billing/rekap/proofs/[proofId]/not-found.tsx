import Link from 'next/link'

export default function PaymentProofNotFound() {
    return (
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
            <h1 className="text-lg font-semibold text-slate-900">Bukti Tidak Ditemukan</h1>
            <p className="mt-2 text-sm text-slate-600">
                Data bukti pembayaran tidak ditemukan atau sudah tidak tersedia.
            </p>
            <div className="mt-4">
                <Link
                    href="/billing/rekap"
                    className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    Kembali ke Rekap Pembayaran
                </Link>
            </div>
        </div>
    )
}
