'use client'
import dynamic from 'next/dynamic'
const SettingsPage = dynamic(() => import('@/app/(desktop)/settings/page'), { ssr: false })
export default function MobileSettingsPage() { return <SettingsPage /> }
