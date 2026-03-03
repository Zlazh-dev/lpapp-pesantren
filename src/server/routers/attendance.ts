import { z } from 'zod'
import { router, protectedProcedure, roleProtectedProcedure } from '../trpc'
import { AttendanceStatus } from '@prisma/client'

export const attendanceRouter = router({
    listBySantri: protectedProcedure
        .input(z.object({
            santriId: z.string(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.attendance.findMany({
                where: {
                    santriId: input.santriId,
                    ...(input.startDate && input.endDate && {
                        date: {
                            gte: new Date(input.startDate),
                            lte: new Date(input.endDate),
                        },
                    }),
                },
                orderBy: { date: 'desc' },
            })
        }),

    listByDate: protectedProcedure
        .input(z.object({
            date: z.string(),
            classGroupId: z.string().optional(),
            dormRoomId: z.number().optional(),
        }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.attendance.findMany({
                where: {
                    date: new Date(input.date),
                    santri: {
                        ...(input.classGroupId && { classGroupId: input.classGroupId }),
                        ...(input.dormRoomId && { dormRoomId: input.dormRoomId }),
                        isActive: true,
                    },
                },
                include: { santri: { select: { fullName: true, nis: true } } },
                orderBy: { santri: { fullName: 'asc' } },
            })
        }),

    upsert: roleProtectedProcedure('STAF_MADRASAH', 'WALI_KELAS', 'PEMBIMBING_KAMAR')
        .input(z.object({
            santriId: z.string(),
            date: z.string(),
            status: z.nativeEnum(AttendanceStatus),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const date = new Date(input.date)
            return ctx.prisma.attendance.upsert({
                where: { santriId_date: { santriId: input.santriId, date } },
                update: { status: input.status, notes: input.notes },
                create: {
                    santriId: input.santriId,
                    date,
                    status: input.status,
                    notes: input.notes,
                },
            })
        }),

    bulkUpsert: roleProtectedProcedure('STAF_MADRASAH', 'WALI_KELAS', 'PEMBIMBING_KAMAR')
        .input(z.object({
            date: z.string(),
            entries: z.array(z.object({
                santriId: z.string(),
                status: z.nativeEnum(AttendanceStatus),
                notes: z.string().optional(),
            })),
        }))
        .mutation(async ({ ctx, input }) => {
            const date = new Date(input.date)
            const results = await Promise.all(
                input.entries.map((entry) =>
                    ctx.prisma.attendance.upsert({
                        where: { santriId_date: { santriId: entry.santriId, date } },
                        update: { status: entry.status, notes: entry.notes },
                        create: {
                            santriId: entry.santriId,
                            date,
                            status: entry.status,
                            notes: entry.notes,
                        },
                    })
                )
            )
            return { count: results.length }
        }),
})
