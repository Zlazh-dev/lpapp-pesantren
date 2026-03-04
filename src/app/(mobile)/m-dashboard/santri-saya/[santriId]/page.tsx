'use client'
import { use } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the desktop page component (client-only)
const SantriSayaDetail = dynamic(
    () => import('@/app/(desktop)/dashboard/santri-saya/[santriId]/page'),
    { ssr: false }
)

/**
 * Mobile wrapper — re-uses the desktop detail page component.
 * Unwraps params here so we pass a plain object, not a Promise.
 */
export default function MobileDashboardSantriSayaDetailPage({
    params,
}: {
    params: Promise<{ santriId: string }>
}) {
    const unwrapped = use(params)
    // Pass as a resolved Promise so the component can call use() on it
    return <SantriSayaDetail params={Promise.resolve(unwrapped)} />
}
