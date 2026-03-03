/**
 * Migrate existing user roles to the new simplified role structure.
 *
 * Strategy: Convert User.role column to TEXT, migrate data, recreate enum.
 * This avoids the PostgreSQL limitation where ALTER TYPE ADD VALUE
 * cannot run inside a transaction.
 *
 * Mapping:
 *   BENDAHARA   → ADMIN
 *   SEKRETARIS  → STAF_PENDATAAN
 *   GURU_MAPEL  → STAF_MADRASAH
 *   PEMBIMBING  → PEMBIMBING_KAMAR
 *
 * Usage: npx tsx scripts/migrate-roles.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('=== Role Migration Script ===\n')

    // Step 1: Convert column to TEXT to break enum dependency
    console.log('Step 1: Converting User.role column to TEXT...')
    await prisma.$executeRawUnsafe(`ALTER TABLE users ALTER COLUMN role TYPE TEXT`)
    console.log('  Done')

    // Step 2: Update old role values to new ones
    console.log('\nStep 2: Migrating User.role values...')
    const migrations = [
        ['BENDAHARA', 'ADMIN'],
        ['SEKRETARIS', 'STAF_PENDATAAN'],
        ['GURU_MAPEL', 'STAF_MADRASAH'],
        ['PEMBIMBING', 'PEMBIMBING_KAMAR'],
    ]
    for (const [oldRole, newRole] of migrations) {
        const result = await prisma.$executeRawUnsafe(
            `UPDATE users SET role = '${newRole}' WHERE role = '${oldRole}'`
        )
        console.log(`  ${oldRole} → ${newRole}: ${result} users updated`)
    }

    // Step 3: Drop old enum and create new one
    console.log('\nStep 3: Recreating Role enum...')
    await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "Role"`)
    await prisma.$executeRawUnsafe(
        `CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'WALI_KELAS', 'PEMBIMBING_KAMAR')`
    )
    console.log('  New enum created')

    // Step 4: Convert column back to Role enum
    console.log('\nStep 4: Converting column back to Role enum...')
    await prisma.$executeRawUnsafe(
        `ALTER TABLE users ALTER COLUMN role TYPE "Role" USING role::"Role"`
    )
    console.log('  Done')

    // Step 5: Update role_scopes.role_code (plain text, no enum constraint)
    console.log('\nStep 5: Migrating role_scopes.role_code...')
    for (const [oldRole, newRole] of migrations) {
        const result = await prisma.$executeRawUnsafe(
            `UPDATE role_scopes SET role_code = '${newRole}' WHERE role_code = '${oldRole}'`
        )
        console.log(`  ${oldRole} → ${newRole}: ${result} scopes updated`)
    }

    // Step 6: Update role_entries and user_roles
    console.log('\nStep 6: Migrating role_entries...')

    // Rename PEMBIMBING → PEMBIMBING_KAMAR if exists
    await prisma.$executeRawUnsafe(
        `UPDATE role_entries SET code = 'PEMBIMBING_KAMAR', name = 'Pembimbing Kamar' WHERE code = 'PEMBIMBING'`
    )

    // Ensure STAF_MADRASAH role entry exists
    await prisma.roleEntry.upsert({
        where: { code: 'STAF_MADRASAH' },
        create: { code: 'STAF_MADRASAH', name: 'Staf Madrasah' },
        update: { name: 'Staf Madrasah' },
    })
    console.log('  Ensured STAF_MADRASAH role entry exists')

    // Migrate user_roles from deleted roles to their replacements
    for (const oldCode of ['BENDAHARA', 'SEKRETARIS', 'GURU_MAPEL']) {
        const oldEntry = await prisma.roleEntry.findUnique({ where: { code: oldCode } })
        if (!oldEntry) {
            console.log(`  ${oldCode}: not found in role_entries, skipping`)
            continue
        }

        const newCode = { BENDAHARA: 'ADMIN', SEKRETARIS: 'STAF_PENDATAAN', GURU_MAPEL: 'STAF_MADRASAH' }[oldCode]!

        // Ensure new role entry exists
        const nameMap: Record<string, string> = { ADMIN: 'Administrator', STAF_PENDATAAN: 'Staf Pendataan', STAF_MADRASAH: 'Staf Madrasah' }
        let newEntry = await prisma.roleEntry.findUnique({ where: { code: newCode } })
        if (!newEntry) {
            newEntry = await prisma.roleEntry.create({ data: { code: newCode, name: nameMap[newCode] ?? newCode } })
            console.log(`  Created role_entry: ${newCode}`)
        }

        // Move user_roles from old to new
        const userRolesWithOld = await prisma.userRole.findMany({ where: { roleId: oldEntry.id } })
        for (const ur of userRolesWithOld) {
            const existing = await prisma.userRole.findUnique({
                where: { userId_roleId: { userId: ur.userId, roleId: newEntry.id } },
            })
            if (!existing) {
                await prisma.userRole.create({ data: { userId: ur.userId, roleId: newEntry.id } })
            }
        }

        // Cleanup old role data
        await prisma.userRole.deleteMany({ where: { roleId: oldEntry.id } })
        await prisma.rolePageGroupAccess.deleteMany({ where: { roleId: oldEntry.id } })
        await prisma.rolePage.deleteMany({ where: { roleId: oldEntry.id } })
        await prisma.roleEntry.delete({ where: { id: oldEntry.id } })
        console.log(`  Deleted role_entry: ${oldCode} (${userRolesWithOld.length} users → ${newCode})`)
    }

    // Summary
    console.log('\n=== Migration Complete ===')
    const roleCounts = await prisma.$queryRawUnsafe(
        `SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role`
    )
    console.log('Role distribution:', roleCounts)

    const roleEntries = await prisma.roleEntry.findMany({
        select: { code: true, name: true },
        orderBy: { code: 'asc' },
    })
    console.log('Role entries:', roleEntries.map(r => `${r.code} (${r.name})`).join(', '))
}

main()
    .catch((error) => {
        console.error('Migration failed:', error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
