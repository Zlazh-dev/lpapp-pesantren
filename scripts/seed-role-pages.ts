import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const STAF_MADRASAH = 'cmm6yegll00004kwcobkgwyxu'
    const STAF_PENDATAAN = 'cmm6ytnaz00014k24bs3ub7nf'

    const pages = await prisma.page.findMany({ where: { isActive: true }, select: { id: true, path: true } })
    const pageByPath: Record<string, string> = {}
    for (const p of pages) pageByPath[p.path] = p.id

    // STAF_MADRASAH: Dashboard + all AKADEMIK pages
    const madrasahPaths = [
        '/dashboard',
        '/akademik/santri',
        '/akademik/kelas/manage',
        '/akademik/kelas',
        '/akademik/kelas/[classGroupId]',
        '/akademik',
    ]

    // STAF_PENDATAAN: Dashboard + all MASTER_DATA pages
    const pendataanPaths = [
        '/dashboard',
        '/master-data/santri/manage',
        '/master-data/santri/arsip',
        '/master-data/kamar/manage',
        '/master-data/kamar/[roomId]',
        '/master-data/santri/permintaan',
        '/master-data/santri',
        '/master-data/santri/[id]',
    ]

    let created = 0

    for (const path of madrasahPaths) {
        const pageId = pageByPath[path]
        if (!pageId) { console.log('SKIP (no page):', path); continue }
        try {
            await prisma.rolePage.create({ data: { roleId: STAF_MADRASAH, pageId } })
            created++
            console.log('Created STAF_MADRASAH ->', path)
        } catch {
            console.log('EXISTS STAF_MADRASAH:', path)
        }
    }

    for (const path of pendataanPaths) {
        const pageId = pageByPath[path]
        if (!pageId) { console.log('SKIP (no page):', path); continue }
        try {
            await prisma.rolePage.create({ data: { roleId: STAF_PENDATAAN, pageId } })
            created++
            console.log('Created STAF_PENDATAAN ->', path)
        } catch {
            console.log('EXISTS STAF_PENDATAAN:', path)
        }
    }

    console.log('Total created:', created)
    await prisma.$disconnect()
}

main().catch(console.error)
