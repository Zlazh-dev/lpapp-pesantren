'use client'
import dynamic from 'next/dynamic'
const UploadPage = dynamic(() => import('@/app/(desktop)/akademik/santri/upload/page'), { ssr: false })
export default function MobileAkademikSantriUploadPage() { return <UploadPage /> }
