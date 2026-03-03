import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appRouter } from '../../src/server/routers/_app'
import { prisma } from '../../src/lib/prisma'
import { BillStatus } from '@prisma/client'

// Mock prisma
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        bill: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            aggregate: vi.fn(),
            groupBy: vi.fn(),
        },
        santri: {
            findUnique: vi.fn(),
        }
    },
}))

describe('Billing Router', () => {
    const adminCtx = {
        prisma,
        session: { user: { id: 'admin1', username: 'admin', role: 'ADMIN' as const, fullName: 'Admin' } },
        headers: {} as any
    }

    const caller = appRouter.createCaller(adminCtx)

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('creates a single bill successfully', async () => {
        const input = {
            santriId: 'santri-1',
            period: 'Juli 2024',
            type: 'SPP',
            amount: 500000,
            dueDate: new Date().toISOString(),
        }

        // @ts-ignore
        prisma.santri.findUnique.mockResolvedValue({ id: 'santri-1', fullName: 'Ahmad' })
        // @ts-ignore
        prisma.bill.create.mockResolvedValue({ id: 'bill-1', ...input, status: BillStatus.PENDING, paidAmount: 0 })

        const result = await caller.billing.create(input)
        expect(result.amount).toBe(500000)
        expect(result.status).toBe(BillStatus.PENDING)
        expect(prisma.bill.create).toHaveBeenCalled()
    })

    it('updates payment accurately', async () => {
        const input = {
            id: 'bill-1',
            paidAmount: 200000,
        }

        // @ts-ignore
        prisma.bill.findUnique.mockResolvedValue({
            id: 'bill-1',
            amount: 500000,
            paidAmount: 100000, // already paid 100k
        })

        // @ts-ignore
        prisma.bill.update.mockImplementation(({ data }: any) => Promise.resolve({
            id: 'bill-1',
            ...data
        }))

        const result = await caller.billing.updatePayment(input)

        // total paid should be precisely what is passed
        expect(result.paidAmount).toBe(200000)
        expect(result.status).toBe(BillStatus.PARTIAL)
        expect(prisma.bill.update).toHaveBeenCalled()
    })

    it('marks as paid when payment equals remaining amount', async () => {
        const input = {
            id: 'bill-2',
            paidAmount: 400000,
        }

        // @ts-ignore
        prisma.bill.findUnique.mockResolvedValue({
            id: 'bill-2',
            amount: 400000,
            paidAmount: 0,
        })

        // @ts-ignore
        prisma.bill.update.mockImplementation(({ data }: any) => Promise.resolve({
            id: 'bill-2',
            ...data
        }))

        const result = await caller.billing.updatePayment(input)

        expect(result.paidAmount).toBe(400000)
        expect(result.status).toBe(BillStatus.PAID)
        expect(result.paidDate).toBeDefined()
    })
})