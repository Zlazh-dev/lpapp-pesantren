import { router, protectedProcedure } from '../trpc'

// Legacy kamarRouter — only retains DormRoom listing for backward compat.
// Old Kamar/Kelas CRUD has been removed. Use dormRouter for room management.
export const kamarRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        // Redirect old kamar.list to dormRoom list for backward compat
        return ctx.prisma.dormRoom.findMany({
            where: { isActive: true },
            include: {
                floor: { include: { building: { select: { name: true } } } },
                _count: { select: { santri: true } },
            },
            orderBy: [
                { floor: { building: { name: 'asc' } } },
                { floor: { number: 'asc' } },
                { name: 'asc' },
            ],
        })
    }),

    listDormRooms: protectedProcedure.query(async ({ ctx }) => {
        return ctx.prisma.dormRoom.findMany({
            where: { isActive: true },
            include: {
                floor: {
                    include: {
                        building: { select: { name: true } },
                    },
                },
                _count: { select: { santri: true } },
            },
            orderBy: [
                { floor: { building: { name: 'asc' } } },
                { floor: { number: 'asc' } },
                { name: 'asc' },
            ],
        })
    }),
})

// Legacy kelasRouter — maps old kelas.list to ClassGroup list.
export const kelasRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        return ctx.prisma.classGroup.findMany({
            where: { isActive: true },
            include: {
                grade: { include: { level: true } },
                _count: { select: { santri: true } },
            },
            orderBy: { name: 'asc' },
        })
    }),
})
