'use client'
import dynamic from 'next/dynamic'
const UploadPage = dynamic(() => import('@/app/(desktop)/master-data/santri/upload/page'), { ssr: false })
export default function MobileMasterDataSantriUploadPage() { return <UploadPage /> }
