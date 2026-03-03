import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    const roles = await prisma.roleEntry.findMany({ select: { code: true, name: true }, orderBy: { code: 'asc' } })
    console.log('Roles di database:')
    console.table(roles)
    await prisma.$disconnect()
}
main().catch(async e => { console.error(e.message); await prisma.$disconnect() })
