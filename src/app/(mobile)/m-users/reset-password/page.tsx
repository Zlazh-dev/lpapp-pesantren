'use client'
import dynamic from 'next/dynamic'
const ResetPasswordPage = dynamic(() => import('@/app/(desktop)/user-management/reset-password/page'), { ssr: false })
export default function MobileResetPasswordPage() { return <ResetPasswordPage /> }
