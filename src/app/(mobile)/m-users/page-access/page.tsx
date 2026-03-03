'use client'
import dynamic from 'next/dynamic'
const PageAccessPage = dynamic(() => import('@/app/(desktop)/user-management/page-access/page'), { ssr: false })
export default function MobilePageAccessPage() { return <PageAccessPage /> }
