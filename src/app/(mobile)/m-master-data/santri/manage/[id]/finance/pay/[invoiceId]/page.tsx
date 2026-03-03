'use client'
import dynamic from 'next/dynamic'
const ManageFinancePayPage = dynamic(() => import('@/app/(desktop)/master-data/santri/manage/[id]/finance/pay/[invoiceId]/page'), { ssr: false })
export default function MobileManageFinancePayPage({ params }: { params: Promise<{ id: string; invoiceId: string }> }) { return <ManageFinancePayPage params={params} /> }
