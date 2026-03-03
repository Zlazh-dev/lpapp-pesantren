import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { LOCKED_PAGE_DEFAULTS, LOCKED_PAGE_GROUP_DEFAULTS } from '../src/lib/page-groups'

const prisma = new PrismaClient()

// -------------------------------------------------------
// Role definitions
// -------------------------------------------------------
const ROLES = [
    { code: 'ADMIN', name: 'Administrator' },
    { code: 'STAF_MADRASAH', name: 'Staf Madrasah' },
    { code: 'STAF_PENDATAAN', name: 'Staf Pendataan' },
    { code: 'WALI_KELAS', name: 'Wali Kelas' },
    { code: 'PEMBIMBING_KAMAR', name: 'Pembimbing Kamar' },
]

// Page codes each role can access (based on actual DB state)
const ROLE_PAGE_ACCESS: Record<string, string[]> = {
    ADMIN: [
        'DASHBOARD',
        'DASHBOARD_SANTRI_SAYA',
        'DASHBOARD_SANTRI_SAYA_DETAIL',
        'MASTER_SANTRI_MANAGE',
        'MASTER_SANTRI_ARSIP',
        'MASTER_SANTRI_UPLOAD',
        'MASTER_SANTRI_LIST',
        'MASTER_SANTRI_DETAIL',
        'MASTER_SANTRI_PERMINTAAN',
        'MASTER_KAMAR_MANAGE',
        'MASTER_KAMAR_DETAIL',
        'KEUANGAN_MANAGEMENT',
        'KEUANGAN_SANTRI',
        'KEUANGAN_PROOF_DETAIL',
        'KEUANGAN_PAYMENT_PROOF_DETAIL',
        'AKADEMIK_SANTRI',
        'AKADEMIK_SANTRI_UPLOAD',
        'AKADEMIK_KELAS_MANAGE',
        'AKADEMIK_KELAS_LIST',
        'AKADEMIK_KELAS_DETAIL',
        'AKADEMIK',
        'USER_MANAGEMENT_USERS',
        'USER_MANAGEMENT_USER_DETAIL',
        'USER_MANAGEMENT_ROLES',
        'USER_MANAGEMENT_INVITE_LINKS',
        'USER_MANAGEMENT_PAGE_ACCESS',
        'USER_MANAGEMENT_RESET_PASSWORD',
        'PENGATURAN_GLOBAL',
    ],
    STAF_MADRASAH: [
        'DASHBOARD',
        'AKADEMIK',
        'AKADEMIK_SANTRI',
        'AKADEMIK_SANTRI_UPLOAD',
        'AKADEMIK_KELAS_MANAGE',
        'AKADEMIK_KELAS_LIST',
        'AKADEMIK_KELAS_DETAIL',
    ],
    STAF_PENDATAAN: [
        'DASHBOARD',
        'MASTER_SANTRI_MANAGE',
        'MASTER_SANTRI_ARSIP',
        'MASTER_SANTRI_UPLOAD',
        'MASTER_SANTRI_LIST',
        'MASTER_SANTRI_DETAIL',
        'MASTER_SANTRI_PERMINTAAN',
        'MASTER_KAMAR_MANAGE',
        'MASTER_KAMAR_DETAIL',
    ],
    WALI_KELAS: [
        'DASHBOARD',
        'DASHBOARD_SANTRI_SAYA',
        'DASHBOARD_SANTRI_SAYA_DETAIL',
    ],
    PEMBIMBING_KAMAR: [
        'DASHBOARD',
        'DASHBOARD_SANTRI_SAYA',
        'DASHBOARD_SANTRI_SAYA_DETAIL',
    ],
}

async function main() {
    console.log('Running seed: all roles + admin user + page catalog')

    // -------------------------------------------------------
    // 1. Upsert all roles
    // -------------------------------------------------------
    const roleIdByCode: Record<string, string> = {}
    for (const role of ROLES) {
        const entry = await prisma.roleEntry.upsert({
            where: { code: role.code },
            create: { code: role.code, name: role.name },
            update: { name: role.name },
        })
        roleIdByCode[entry.code] = entry.id
        console.log(`  Role: ${role.code}`)
    }

    // -------------------------------------------------------
    // 2. Upsert admin user
    // -------------------------------------------------------
    const passwordHash = await bcrypt.hash('14390626', 12)
    const adminUser = await prisma.user.upsert({
        where: { username: 'admin' },
        create: {
            username: 'admin',
            fullName: 'Administrator',
            role: Role.ADMIN,
            password: passwordHash,
            isActive: true,
            isEnabled: true,
            enabledAt: new Date(),
            disabledReason: null,
        },
        update: {
            fullName: 'Administrator',
            role: Role.ADMIN,
            password: passwordHash,
            isActive: true,
            isEnabled: true,
            enabledAt: new Date(),
            disabledReason: null,
        },
    })

    await prisma.userRole.deleteMany({ where: { userId: adminUser.id } })
    await prisma.userRole.create({
        data: { userId: adminUser.id, roleId: roleIdByCode['ADMIN'] },
    })
    console.log('  Admin user ready')

    // -------------------------------------------------------
    // 3. Upsert page groups
    // -------------------------------------------------------
    const pageGroupIdByCode: Record<string, string> = {}
    for (const group of LOCKED_PAGE_GROUP_DEFAULTS) {
        const row = await prisma.pageGroup.upsert({
            where: { code: group.code },
            create: { code: group.code, name: group.name, sortOrder: group.sortOrder, isActive: true },
            update: { name: group.name, sortOrder: group.sortOrder, isActive: true },
        })
        pageGroupIdByCode[group.code] = row.id
    }
    console.log('  Page groups ready')

    // -------------------------------------------------------
    // 4. Upsert pages
    // -------------------------------------------------------
    for (const page of LOCKED_PAGE_DEFAULTS) {
        const groupId = pageGroupIdByCode[page.groupCode]
        if (!groupId) continue
        await prisma.page.upsert({
            where: { code: page.code },
            create: { groupId, code: page.code, name: page.name, path: page.path, sortOrder: page.sortOrder, isActive: true },
            update: { groupId, name: page.name, path: page.path, sortOrder: page.sortOrder, isActive: true },
        })
    }
    console.log('  Pages ready')

    // -------------------------------------------------------
    // 5. Assign role-page access
    // -------------------------------------------------------
    for (const [roleCode, pageCodes] of Object.entries(ROLE_PAGE_ACCESS)) {
        const roleId = roleIdByCode[roleCode]
        if (!roleId) continue

        await prisma.rolePage.deleteMany({ where: { roleId } })

        const pages = await prisma.page.findMany({
            where: { code: { in: pageCodes }, isActive: true },
            select: { id: true, code: true },
        })

        if (pages.length > 0) {
            await prisma.rolePage.createMany({
                data: pages.map((p) => ({ roleId, pageId: p.id })),
            })
        }

        console.log(`  ${roleCode}: ${pages.length} pages assigned`)
    }

    console.log('\nSeed complete')
    console.log('Username: admin')
    console.log('Password: 14390626')
}

main()
    .catch((error) => {
        console.error('Seed failed:', error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
