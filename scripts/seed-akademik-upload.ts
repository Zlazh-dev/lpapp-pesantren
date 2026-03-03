import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
    // Register akademik upload page
    const akademikGroup = await p.pageGroup.findUnique({ where: { code: 'AKADEMIK' } })
    if (!akademikGroup) { console.log('AKADEMIK group not found'); return }

    const pg = await p.page.upsert({
        where: { code: 'AKADEMIK_SANTRI_UPLOAD' },
        create: { groupId: akademikGroup.id, code: 'AKADEMIK_SANTRI_UPLOAD', name: 'Upload Santri Madrasah', path: '/akademik/santri/upload', sortOrder: 4, isActive: true },
        update: { name: 'Upload Santri Madrasah', path: '/akademik/santri/upload', sortOrder: 4 },
    })
    console.log('Page created/updated:', pg.id)

    // Give access to ADMIN and STAF_MADRASAH
    const roles = await p.roleEntry.findMany({ where: { code: { in: ['ADMIN', 'STAF_MADRASAH'] } } })
    for (const r of roles) {
        try {
            await p.rolePage.create({ data: { roleId: r.id, pageId: pg.id } })
            console.log('Access added for', r.code)
        } catch {
            console.log('Already exists for', r.code)
        }
    }

    await p.$disconnect()
}

main().catch(console.error)
