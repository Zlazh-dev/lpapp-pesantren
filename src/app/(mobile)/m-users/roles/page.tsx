'use client'
import dynamic from 'next/dynamic'
const RolesPage = dynamic(() => import('@/app/(desktop)/user-management/roles/page'), { ssr: false })
export default function MobileRolesPage() { return <RolesPage /> }
