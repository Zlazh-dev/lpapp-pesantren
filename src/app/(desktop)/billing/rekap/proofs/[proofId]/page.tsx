import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PaymentProofViewer from '@/components/payments/PaymentProofViewer'
import { detectPaymentProofKind } from '@/lib/payment-proof'
import { hasBillingProofViewerAccess } from '@/server/billing-proof-auth'
import { formatBillingPeriod } from '@/lib/billing/period'

type PageParams = {
    proofId: string
}

export default async function PaymentProofPage({
    params,
}: {
    params: Promise<PageParams>
}) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        redirect('/login')
    }

    if (!hasBillingProofViewerAccess(session)) {
        return (
            <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6">
                <h1 className="text-lg font-semibold text-slate-900">Akses Ditolak</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Anda tidak memiliki izin untuk melihat bukti pembayaran.
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

    const { proofId } = await params
    const normalizedId = proofId?.trim()
    if (!normalizedId) {
        return (
            <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6">
                <h1 className="text-lg font-semibold text-slate-900">ID Bukti Tidak Valid</h1>
                <p className="mt-2 text-sm text-slate-600">
                    ID bukti pembayaran tidak ditemukan pada URL.
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

    const proof = await prisma.paymentProof.findUnique({
        where: { id: normalizedId },
        select: {
            id: true,
            imageUrl: true,
            amount: true,
            status: true,
            createdAt: true,
            note: true,
            invoice: {
                select: {
                    id: true,
                    periodKey: true,
                    periodDisplayMode: true,
                    periodYear: true,
                    periodMonth: true,
                    hijriYear: true,
                    hijriMonth: true,
                    hijriVariant: true,
                    billingModel: { select: { name: true } },
                    santri: { select: { fullName: true, nis: true } },
                },
            },
        },
    })

    if (!proof) {
        notFound()
    }

    const proofKind = detectPaymentProofKind(proof.imageUrl)

    return (
        <div className="mx-auto w-full max-w-5xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Detail Bukti Pembayaran</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Preview bukti pembayaran dengan fallback loading dan error.
                    </p>
                </div>
                <Link
                    href="/billing/rekap"
                    className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    Kembali ke Rekap Pembayaran
                </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <dl className="grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-3">
                    <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Santri</dt>
                        <dd className="mt-1 font-medium text-slate-800">
                            {proof.invoice?.santri?.fullName ?? '-'}
                            {proof.invoice?.santri?.nis ? (
                                <span className="ml-1 font-mono text-xs text-slate-500">({proof.invoice.santri.nis})</span>
                            ) : null}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Invoice</dt>
                        <dd className="mt-1 font-medium text-slate-800">
                            {proof.invoice?.billingModel?.name ?? '-'}
                            {proof.invoice ? (
                                <span className="ml-1 text-slate-500">({formatBillingPeriod(proof.invoice)})</span>
                            ) : null}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt>
                        <dd className="mt-1 font-medium text-slate-800">{proof.status}</dd>
                    </div>
                </dl>
            </div>

            <PaymentProofViewer
                resourceId={proof.id}
                proofKind={proofKind}
                fileUrl={`/api/billing/payment-proofs/${proof.id}/file`}
            />
        </div>
    )
}
