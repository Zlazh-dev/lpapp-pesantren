import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
    const g = await p.pageGroup.findUnique({ where: { code: 'MASTER_DATA' } })
    if (!g) { console.log('MASTER_DATA group not found'); return }

    const pg = await p.page.upsert({
        where: { code: 'MASTER_SANTRI_UPLOAD' },
        create: { groupId: g.id, code: 'MASTER_SANTRI_UPLOAD', name: 'Upload Data Santri', path: '/master-data/santri/upload', sortOrder: 5, isActive: true },
        update: { name: 'Upload Data Santri', path: '/master-data/santri/upload', sortOrder: 5 },
    })
    console.log('Page created/updated:', pg.id)

    const roles = await p.roleEntry.findMany({ where: { code: { in: ['ADMIN', 'STAF_PENDATAAN'] } } })
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
