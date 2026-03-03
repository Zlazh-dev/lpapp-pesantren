/**
 * Seed default roles, page groups, pages, and access matrix.
 * Also migrates legacy User.role enum values to UserRole entries.
 *
 * Usage: npx tsx scripts/seed-roles.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_ROLES = [
    { code: 'ADMIN', name: 'Administrator' },
    { code: 'STAF_PENDATAAN', name: 'Staf Pendataan' },
    { code: 'STAF_MADRASAH', name: 'Staf Madrasah' },
    { code: 'WALI_KELAS', name: 'Wali Kelas' },
    { code: 'PEMBIMBING_KAMAR', name: 'Pembimbing Kamar' },
]

const PAGE_GROUPS = [
    { code: 'DASHBOARD', name: 'Dashboard', sortOrder: 0 },
    { code: 'MASTER_DATA', name: 'Master Data', sortOrder: 1 },
    { code: 'KEUANGAN', name: 'Keuangan', sortOrder: 2 },
    { code: 'AKADEMIK', name: 'Akademik', sortOrder: 3 },
    { code: 'USER_MANAGEMENT', name: 'User Management', sortOrder: 4 },
    { code: 'SETTINGS', name: 'Settings', sortOrder: 5 },
]

const PAGES: { groupCode: string; code: string; name: string; path: string; sortOrder: number }[] = [
    { groupCode: 'DASHBOARD', code: 'DASHBOARD', name: 'Beranda', path: '/dashboard', sortOrder: 0 },

    { groupCode: 'MASTER_DATA', code: 'MASTER_SANTRI_MANAGE', name: 'Manajemen Data Santri', path: '/master-data/santri/manage', sortOrder: 0 },
    { groupCode: 'MASTER_DATA', code: 'MASTER_KAMAR_MANAGE', name: 'Manajemen Kamar', path: '/master-data/kamar/manage', sortOrder: 1 },
    { groupCode: 'MASTER_DATA', code: 'MASTER_SANTRI_LIST', name: 'Data Santri', path: '/master-data/santri', sortOrder: 2 },
    { groupCode: 'MASTER_DATA', code: 'MASTER_SANTRI_DETAIL', name: 'Detail Santri', path: '/master-data/santri/[id]', sortOrder: 3 },
    { groupCode: 'MASTER_DATA', code: 'MASTER_KAMAR_DETAIL', name: 'Detail Kamar', path: '/master-data/kamar/[roomId]', sortOrder: 4 },

    { groupCode: 'KEUANGAN', code: 'KEUANGAN_MANAGEMENT', name: 'Manajemen Keuangan', path: '/keuangan', sortOrder: 0 },
    { groupCode: 'KEUANGAN', code: 'KEUANGAN_PROOF_DETAIL', name: 'Detail Bukti Pembayaran', path: '/keuangan/proofs/[proofId]', sortOrder: 1 },
    { groupCode: 'KEUANGAN', code: 'KEUANGAN_PAYMENT_PROOF_DETAIL', name: 'Detail Bukti Pembayaran Transfer', path: '/keuangan/payments/[paymentId]/proof', sortOrder: 2 },

    { groupCode: 'AKADEMIK', code: 'AKADEMIK_KELAS_MANAGE', name: 'Manajemen Kelas', path: '/akademik/kelas/manage', sortOrder: 0 },
    { groupCode: 'AKADEMIK', code: 'AKADEMIK_KELAS_LIST', name: 'Kelas', path: '/akademik/kelas', sortOrder: 1 },
    { groupCode: 'AKADEMIK', code: 'AKADEMIK_KELAS_DETAIL', name: 'Detail Kelas', path: '/akademik/kelas/[classGroupId]', sortOrder: 2 },

    { groupCode: 'USER_MANAGEMENT', code: 'USER_MANAGEMENT_USERS', name: 'Manajemen User', path: '/user-management/users', sortOrder: 0 },
    { groupCode: 'USER_MANAGEMENT', code: 'USER_MANAGEMENT_USER_DETAIL', name: 'Detail User', path: '/user-management/users/[userId]', sortOrder: 1 },

    { groupCode: 'SETTINGS', code: 'PENGATURAN_GLOBAL', name: 'Pengaturan', path: '/settings', sortOrder: 0 },
]

const DEFAULT_ACCESS: Record<string, string[]> = {
    ADMIN: ['DASHBOARD', 'MASTER_DATA', 'KEUANGAN', 'AKADEMIK', 'USER_MANAGEMENT', 'SETTINGS'],
    STAF_PENDATAAN: ['DASHBOARD', 'MASTER_DATA'],
    STAF_MADRASAH: ['DASHBOARD', 'MASTER_DATA', 'AKADEMIK'],
    WALI_KELAS: ['DASHBOARD', 'MASTER_DATA', 'AKADEMIK'],
    PEMBIMBING_KAMAR: ['DASHBOARD', 'MASTER_DATA'],
}

async function main() {
    console.log('Seeding default roles...')
    for (const role of DEFAULT_ROLES) {
        await prisma.roleEntry.upsert({
            where: { code: role.code },
            create: role,
            update: { name: role.name },
        })
    }

    const allRoles = await prisma.roleEntry.findMany({ select: { id: true, code: true } })
    const roleCodeToId: Record<string, string> = {}
    for (const role of allRoles) roleCodeToId[role.code] = role.id

    console.log('Migrating legacy users...')
    const users = await prisma.user.findMany({ include: { userRoles: true } })
    for (const user of users) {
        if (user.userRoles.length > 0) continue
        const legacyRoleMap: Record<string, string> = {
            PEMBIMBING: 'PEMBIMBING_KAMAR',
            BENDAHARA: 'ADMIN',
            SEKRETARIS: 'STAF_PENDATAAN',
            GURU_MAPEL: 'STAF_MADRASAH',
        }
        const normalizedRoleCode = legacyRoleMap[user.role] ?? user.role
        const roleId = roleCodeToId[normalizedRoleCode]
        if (!roleId) continue

        await prisma.userRole.create({
            data: {
                userId: user.id,
                roleId,
            },
        })
    }

    const groupCodeToId: Record<string, string> = {}

    console.log('Seeding page groups...')
    for (const group of PAGE_GROUPS) {
        const pageGroup = await prisma.pageGroup.upsert({
            where: { code: group.code },
            create: group,
            update: { name: group.name, sortOrder: group.sortOrder, isActive: true },
        })
        groupCodeToId[group.code] = pageGroup.id
    }

    console.log('Seeding pages...')
    for (const page of PAGES) {
        const groupId = groupCodeToId[page.groupCode]
        if (!groupId) continue

        await prisma.page.upsert({
            where: { code: page.code },
            create: {
                groupId,
                code: page.code,
                name: page.name,
                path: page.path,
                sortOrder: page.sortOrder,
                isActive: true,
            },
            update: {
                groupId,
                name: page.name,
                path: page.path,
                sortOrder: page.sortOrder,
                isActive: true,
            },
        })
    }

    console.log('Seeding default access matrix...')
    for (const [roleCode, groupCodes] of Object.entries(DEFAULT_ACCESS)) {
        const roleId = roleCodeToId[roleCode]
        if (!roleId) continue

        for (const groupCode of groupCodes) {
            const pageGroupId = groupCodeToId[groupCode]
            if (!pageGroupId) continue

            await prisma.rolePageGroupAccess.upsert({
                where: {
                    roleId_pageGroupId: { roleId, pageGroupId },
                },
                create: { roleId, pageGroupId },
                update: {},
            })
        }
    }

    // Deactivate legacy routes no longer used in ZlazhUp Beta navigation.
    await prisma.page.updateMany({
        where: {
            path: {
                in: [
                    '/scan',
                    '/santri',
                    '/santri/[id]',
                    '/kamar',
                    '/kamar/[roomId]',
                    '/kelas',
                    '/kelas/[classGroupId]',
                    '/billing',
                    '/billing/models',
                    '/billing/rekap',
                    '/admin/users',
                    '/admin/permissions',
                ],
            },
        },
        data: { isActive: false },
    })

    console.log('Seed complete.')
}

main()
    .catch((error) => {
        console.error('Seed failed:', error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
