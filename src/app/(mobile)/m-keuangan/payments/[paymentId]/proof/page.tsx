'use client'
import dynamic from 'next/dynamic'
const PaymentProofPage = dynamic(() => import('@/app/(desktop)/keuangan/payments/[paymentId]/proof/page'), { ssr: false })
export default function MobilePaymentProofPage({ params }: { params: Promise<{ paymentId: string }> }) { return <PaymentProofPage params={params} /> }
