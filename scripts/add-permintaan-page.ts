/**
 * Script: add-permintaan-page.ts
 * Adds /dashboard/santri-saya/permintaan page entry to Dashboard page group
 * and grants access to PEMBIMBING_KAMAR and WALI_KELAS roles.
 *
 * Run: npx ts-node --project tsconfig.json scripts/add-permintaan-page.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 1. Find the Dashboard page group
    const dashboardGroup = await prisma.pageGroup.findFirst({
        where: { code: 'DASHBOARD' },
    })
    if (!dashboardGroup) {
        console.error('❌ Page group DASHBOARD tidak ditemukan!')
        process.exit(1)
    }
    console.log(`✅ Page group found: ${dashboardGroup.name} (${dashboardGroup.id})`)

    // 2. Upsert the page entry
    const page = await prisma.page.upsert({
        where: { code: 'DASHBOARD_SANTRI_SAYA_PERMINTAAN' },
        update: { isActive: true },
        create: {
            code: 'DASHBOARD_SANTRI_SAYA_PERMINTAAN',
            name: 'Permintaan Saya',
            path: '/dashboard/santri-saya/permintaan',
            groupId: dashboardGroup.id,
            isActive: true,
            sortOrder: 10,
        },
    })
    console.log(`✅ Page upserted: ${page.path} (${page.id})`)

    // 3. Find the roles PEMBIMBING_KAMAR and WALI_KELAS
    const roles = await prisma.roleEntry.findMany({
        where: { code: { in: ['PEMBIMBING_KAMAR', 'WALI_KELAS'] } },
    })
    console.log(`✅ Found ${roles.length} roles: ${roles.map(r => r.code).join(', ')}`)

    // 4. Grant access: upsert into role_pages for each role
    for (const role of roles) {
        const existing = await prisma.rolePage.findFirst({
            where: { roleId: role.id, pageId: page.id },
        })
        if (existing) {
            console.log(`  ℹ️  ${role.code}: akses sudah ada, skip`)
            continue
        }
        await prisma.rolePage.create({
            data: { roleId: role.id, pageId: page.id },
        })
        console.log(`  ✅ ${role.code}: akses diberikan`)
    }

    console.log('\n✅ Selesai! Halaman /dashboard/santri-saya/permintaan sudah bisa diakses oleh PEMBIMBING_KAMAR dan WALI_KELAS.')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
