import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appRouter } from '../../src/server/routers/_app'
import { prisma } from '../../src/lib/prisma'

// Mock prisma
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        kamar: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        kelas: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
    },
}))

describe('Kamar Router', () => {
    const adminCtx = {
        prisma,
        session: { user: { id: 'admin1', username: 'admin', role: 'STAF_PENDATAAN' as const, fullName: 'Admin' } },
        headers: {} as any
    }

    const caller = appRouter.createCaller(adminCtx)

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('lists all kamar correctly', async () => {
        const mockKamar = [
            { id: '1', name: 'Al-Farabi', capacity: 10, _count: { santris: 5 } },
            { id: '2', name: 'Al-Kindi', capacity: 15, _count: { santris: 15 } },
        ]

        // @ts-ignore
        prisma.kamar.findMany.mockResolvedValue(mockKamar)

        const result = await caller.kamar.list()
        expect(result).toHaveLength(2)
        expect(result[0].name).toBe('Al-Farabi')
        expect(result[0]._count.santris).toBe(5)
    })

    it('creates a new kamar', async () => {
        const newInput = { name: 'Al-Ghazali', capacity: 20 }
        const expectedPrismaData = { name: 'Al-Ghazali', capacity: 20, floor: 1 }

        // @ts-ignore
        prisma.kamar.create.mockResolvedValue({ id: '3', ...expectedPrismaData })

        const result = await caller.kamar.create(newInput)
        expect(result.name).toBe('Al-Ghazali')
        expect(prisma.kamar.create).toHaveBeenCalledWith({ data: expectedPrismaData })
    })
})

describe('Kelas Router', () => {
    const adminCtx = {
        prisma,
        session: { user: { id: 'admin1', username: 'admin', role: 'STAF_PENDATAAN' as const, fullName: 'Admin' } },
        headers: {} as any
    }

    const caller = appRouter.createCaller(adminCtx)

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('lists all kelas correctly', async () => {
        const mockKelas = [
            { id: '1', name: '10A', level: '10', _count: { santris: 20 } },
        ]

        // @ts-ignore
        prisma.kelas.findMany.mockResolvedValue(mockKelas)

        const result = await caller.kelas.list()
        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('10A')
    })

    it('creates a new kelas', async () => {
        const newInput = { name: '10B', level: '10' }
        const expectedPrismaData = { name: '10B', level: '10', academicYear: '2024/2025' }

        // @ts-ignore
        prisma.kelas.create.mockResolvedValue({ id: '2', ...expectedPrismaData })

        const result = await caller.kelas.create(newInput)
        expect(result.level).toBe('10')
        expect(prisma.kelas.create).toHaveBeenCalledWith({ data: expectedPrismaData })
    })
})
