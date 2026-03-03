import Link from 'next/link'
import { getPaymentProofViewerHref } from '@/lib/payment-proof'

type PaymentProofButtonProps = {
    source: 'paymentProof' | 'payment'
    id: string | null | undefined
    hasProof?: boolean
    label?: string
    className?: string
    disabledClassName?: string
    hideWhenUnavailable?: boolean
    unavailableTitle?: string
}

export default function PaymentProofButton({
    source,
    id,
    hasProof = true,
    label = 'Bukti',
    className,
    disabledClassName,
    hideWhenUnavailable = true,
    unavailableTitle = 'Bukti pembayaran tidak tersedia',
}: PaymentProofButtonProps) {
    const normalizedId = id?.trim()
    const isAvailable = Boolean(normalizedId) && hasProof

    if (!isAvailable) {
        if (hideWhenUnavailable) return null
        return (
            <span
                aria-disabled="true"
                title={unavailableTitle}
                className={disabledClassName ?? 'rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-400'}
            >
                {label}
            </span>
        )
    }

    const viewerHref = getPaymentProofViewerHref({ source, id: normalizedId as string })

    return (
        <Link
            href={viewerHref}
            className={className ?? 'rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100'}
        >
            {label}
        </Link>
    )
}
