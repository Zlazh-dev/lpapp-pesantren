'use client'
import dynamic from 'next/dynamic'
const NewSantriPage = dynamic(() => import('@/app/(desktop)/master-data/santri/manage/new/page'), { ssr: false })
export default function MobileNewSantriPage() { return <NewSantriPage /> }
