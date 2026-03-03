import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function parseGregorianPeriodKey(periodKey: string | null | undefined): { year: number | null; month: number | null } {
    if (!periodKey) return { year: null, month: null }

    const monthly = periodKey.match(/^(\d{4})-(\d{2})$/)
    if (monthly) {
        const year = Number(monthly[1])
        const month = Number(monthly[2])
        if (month >= 1 && month <= 12) return { year, month }
    }

    const yearly = periodKey.match(/^(\d{4})$/)
    if (yearly) {
        return { year: Number(yearly[1]), month: null }
    }

    return { year: null, month: null }
}

async function main() {
    const batchSize = 200
    let cursorId: string | undefined
    let totalUpdated = 0

    while (true) {
        const rows = await prisma.invoice.findMany({
            ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
            orderBy: { id: 'asc' },
            take: batchSize,
            select: {
                id: true,
                periodKey: true,
                issuedAt: true,
                periodYear: true,
                periodMonth: true,
                periodDisplayMode: true,
            },
        })

        if (rows.length === 0) break

        for (const row of rows) {
            const parsed = parseGregorianPeriodKey(row.periodKey)
            const fallbackYear = row.issuedAt.getUTCFullYear()
            const fallbackMonth = row.issuedAt.getUTCMonth() + 1

            const nextPeriodYear = row.periodYear ?? parsed.year ?? fallbackYear
            const nextPeriodMonth = row.periodMonth ?? parsed.month ?? fallbackMonth
            const nextDisplayMode = row.periodDisplayMode ?? 'GREGORIAN'

            await prisma.invoice.update({
                where: { id: row.id },
                data: {
                    periodYear: nextPeriodYear,
                    periodMonth: nextPeriodMonth,
                    periodDisplayMode: nextDisplayMode,
                },
            })
            totalUpdated += 1
        }

        cursorId = rows[rows.length - 1]?.id
    }

    console.log(`Backfill selesai. Invoice diupdate: ${totalUpdated}`)
}

main()
    .catch((error) => {
        console.error('Backfill gagal', error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
