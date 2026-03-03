/**
 * Script to generate mobile mirror route files.
 * Each mobile route re-exports the desktop page component.
 * Run with: node scripts/generate-mobile-routes.mjs
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'

const MOBILE_BASE = 'src/app/(mobile)'

// Mapping: [mobileRoute, desktopImportPath]
const ROUTES = [
    // ─── Dashboard ───
    ['m-dashboard/santri-saya/page.tsx', '@/app/(desktop)/dashboard/santri-saya/page'],
    ['m-dashboard/santri-saya/[santriId]/page.tsx', '@/app/(desktop)/dashboard/santri-saya/[santriId]/page'],

    // ─── Data Pusat (master-data) ───
    ['m-master-data/santri/page.tsx', '@/app/(desktop)/master-data/santri/page'],
    ['m-master-data/santri/manage/page.tsx', '@/app/(desktop)/master-data/santri/manage/page'],
    ['m-master-data/santri/manage/new/page.tsx', '@/app/(desktop)/master-data/santri/manage/new/page'],
    ['m-master-data/santri/manage/[id]/page.tsx', '@/app/(desktop)/master-data/santri/manage/[id]/page'],
    ['m-master-data/santri/manage/[id]/edit/page.tsx', '@/app/(desktop)/master-data/santri/manage/[id]/edit/page'],
    ['m-master-data/santri/manage/[id]/finance/page.tsx', '@/app/(desktop)/master-data/santri/manage/[id]/finance/page'],
    ['m-master-data/santri/manage/[id]/finance/pay/[invoiceId]/page.tsx', '@/app/(desktop)/master-data/santri/manage/[id]/finance/pay/[invoiceId]/page'],
    ['m-master-data/santri/arsip/page.tsx', '@/app/(desktop)/master-data/santri/arsip/page'],
    ['m-master-data/santri/arsip/[id]/page.tsx', '@/app/(desktop)/master-data/santri/arsip/[id]/page'],
    ['m-master-data/santri/arsip/[id]/finance/page.tsx', '@/app/(desktop)/master-data/santri/arsip/[id]/finance/page'],
    ['m-master-data/santri/permintaan/page.tsx', '@/app/(desktop)/master-data/santri/permintaan/page'],
    ['m-master-data/santri/upload/page.tsx', '@/app/(desktop)/master-data/santri/upload/page'],
    ['m-master-data/santri/[id]/page.tsx', '@/app/(desktop)/master-data/santri/[id]/page'],
    ['m-master-data/kamar/manage/page.tsx', '@/app/(desktop)/master-data/kamar/manage/page'],
    ['m-master-data/kamar/[roomId]/page.tsx', '@/app/(desktop)/master-data/kamar/[roomId]/page'],

    // ─── Perbendaharaan (keuangan) ───
    ['m-keuangan/santri/page.tsx', '@/app/(desktop)/keuangan/santri/page'],
    ['m-keuangan/santri/[id]/page.tsx', '@/app/(desktop)/keuangan/santri/[id]/page'],
    ['m-keuangan/santri/[id]/request/page.tsx', '@/app/(desktop)/keuangan/santri/[id]/request/page'],
    ['m-keuangan/activate/[billingModelId]/page.tsx', '@/app/(desktop)/keuangan/activate/[billingModelId]/page'],
    ['m-keuangan/payments/[paymentId]/proof/page.tsx', '@/app/(desktop)/keuangan/payments/[paymentId]/proof/page'],
    ['m-keuangan/proofs/[proofId]/page.tsx', '@/app/(desktop)/keuangan/proofs/[proofId]/page'],

    // ─── Madrasah (akademik) ───
    ['m-akademik/santri/page.tsx', '@/app/(desktop)/akademik/santri/page'],
    ['m-akademik/santri/[id]/page.tsx', '@/app/(desktop)/akademik/santri/[id]/page'],
    ['m-akademik/santri/[id]/request/page.tsx', '@/app/(desktop)/akademik/santri/[id]/request/page'],
    ['m-akademik/santri/upload/page.tsx', '@/app/(desktop)/akademik/santri/upload/page'],
    ['m-akademik/kelas/page.tsx', '@/app/(desktop)/akademik/kelas/page'],
    ['m-akademik/kelas/manage/page.tsx', '@/app/(desktop)/akademik/kelas/manage/page'],
    ['m-akademik/kelas/[classGroupId]/page.tsx', '@/app/(desktop)/akademik/kelas/[classGroupId]/page'],

    // ─── Manajemen User ───
    ['m-users/users/page.tsx', '@/app/(desktop)/user-management/users/page'],
    ['m-users/roles/page.tsx', '@/app/(desktop)/user-management/roles/page'],
    ['m-users/page-access/page.tsx', '@/app/(desktop)/user-management/page-access/page'],
    ['m-users/reset-password/page.tsx', '@/app/(desktop)/user-management/reset-password/page'],
    ['m-users/invite-links/page.tsx', '@/app/(desktop)/user-management/invite-links/page'],
]

let created = 0
let skipped = 0

for (const [mobilePath, desktopImport] of ROUTES) {
    const fullPath = join(MOBILE_BASE, mobilePath)
    const dir = dirname(fullPath)

    mkdirSync(dir, { recursive: true })

    const content = `export { default } from '${desktopImport}'\n`
    writeFileSync(fullPath, content, 'utf-8')
    created++
    console.log(`✅ ${fullPath}`)
}

console.log(`\nDone! Created ${created} files, skipped ${skipped}.`)
