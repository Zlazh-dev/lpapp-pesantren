'use client'
import dynamic from 'next/dynamic'
const InviteLinksPage = dynamic(() => import('@/app/(desktop)/user-management/invite-links/page'), { ssr: false })
export default function MobileInviteLinksPage() { return <InviteLinksPage /> }
