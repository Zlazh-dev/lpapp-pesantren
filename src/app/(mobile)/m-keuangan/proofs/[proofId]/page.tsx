'use client'
import dynamic from 'next/dynamic'
const ProofDetailPage = dynamic(() => import('@/app/(desktop)/keuangan/proofs/[proofId]/page'), { ssr: false })
export default function MobileProofDetailPage({ params }: { params: Promise<{ proofId: string }> }) { return <ProofDetailPage params={params} /> }
