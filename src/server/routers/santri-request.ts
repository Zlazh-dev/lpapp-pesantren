import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { notifyChatClients, notifyGlobalClients, notifyReadReceipt } from '@/lib/sse-clients'

export const santriRequestRouter = router({
    create: protectedProcedure
        .input(z.object({
            santriId: z.string(),
            type: z.enum(['EDIT', 'DELETE', 'OTHER']),
            description: z.string().min(10, 'Deskripsi minimal 10 karakter').max(2000),
            changeField: z.string().optional(),
            currentValue: z.string().optional(),
            requestedValue: z.string().optional(),
            department: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { santriId, type, description, changeField, currentValue, requestedValue, department } = input
            const req = await ctx.prisma.santriChangeRequest.create({
                data: {
                    santriId,
                    type,
                    description,
                    changeField,
                    currentValue,
                    requestedValue,
                    department,
                    requestedBy: ctx.session.user.id,
                },
            })
            // First message = description
            await ctx.prisma.changeRequestMessage.create({
                data: {
                    requestId: req.id,
                    senderId: ctx.session.user.id,
                    message: description,
                },
            })
            // Notify admin list in real-time
            notifyGlobalClients({ type: 'new_request', requestId: req.id })
            return req
        }),

    listBySantri: protectedProcedure
        .input(z.object({ santriId: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.santriChangeRequest.findMany({
                where: { santriId: input.santriId },
                include: { _count: { select: { messages: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20,
            })
        }),

    myRequests: protectedProcedure
        .input(z.object({
            status: z.enum(['PENDING', 'IN_DISCUSSION', 'APPROVED', 'REJECTED']).optional(),
        }).optional())
        .query(async ({ ctx, input }) => {
            const where = {
                requestedBy: ctx.session.user.id,
                ...(input?.status ? { status: input.status } : {}),
            }
            return ctx.prisma.santriChangeRequest.findMany({
                where,
                include: {
                    santri: { select: { id: true, fullName: true, nis: true } },
                    _count: { select: { messages: true } },
                },
                orderBy: { updatedAt: 'desc' },
                take: 50,
            })
        }),

    getSantriDetail: protectedProcedure
        .input(z.string())
        .query(async ({ ctx, input: santriId }) => {
            const userId = ctx.session.user.id
            const user = await ctx.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    waliKelasOf: { select: { id: true } },
                    supervisedRooms: { select: { id: true } },
                },
            })
            if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User tidak ditemukan' })

            const classGroupIds = user.waliKelasOf?.map((cg: any) => cg.id) ?? []
            const dormRoomIds = user.supervisedRooms?.map((r: any) => r.id) ?? []

            const scopeConditions: any[] = []
            if (classGroupIds.length > 0) scopeConditions.push({ classGroupId: { in: classGroupIds } })
            if (dormRoomIds.length > 0) scopeConditions.push({ dormRoomId: { in: dormRoomIds } })

            if (scopeConditions.length === 0) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke data santri ini' })
            }

            const santri = await ctx.prisma.santri.findFirst({
                where: { id: santriId, isActive: true, OR: scopeConditions },
                include: {
                    classGroup: { include: { grade: { include: { level: true } }, schoolYear: { select: { id: true, name: true } } } },
                    dormRoom: { include: { floor: { include: { building: { include: { complex: { select: { id: true, name: true } } } } } } } },
                },
            })

            if (!santri) throw new TRPCError({ code: 'NOT_FOUND', message: 'Santri tidak ditemukan atau di luar jangkauan Anda' })
            return santri
        }),

    listMyScope: protectedProcedure
        .input(z.object({ search: z.string().optional() }).optional())
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id
            const user = await ctx.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    waliKelasOf: { select: { id: true, name: true, grade: { select: { number: true, level: { select: { code: true, name: true } } } } } },
                    supervisedRooms: { select: { id: true, name: true, floor: { include: { building: { select: { name: true } } } } } },
                },
            })
            if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User tidak ditemukan' })

            const classGroupIds = user.waliKelasOf?.map((cg: any) => cg.id) ?? []
            const dormRoomIds = user.supervisedRooms?.map((r: any) => r.id) ?? []

            if (classGroupIds.length === 0 && dormRoomIds.length === 0) {
                return { santri: [], scope: null as any, scopeType: 'NONE' as const }
            }

            const searchFilter = input?.search ? {
                OR: [
                    { fullName: { contains: input.search, mode: 'insensitive' as const } },
                    { nis: { contains: input.search, mode: 'insensitive' as const } },
                ],
            } : {}

            if (classGroupIds.length > 0) {
                const santri = await ctx.prisma.santri.findMany({
                    where: { classGroupId: { in: classGroupIds }, isActive: true, ...searchFilter },
                    select: { id: true, fullName: true, nis: true, gender: true, phone: true, photoUrl: true, classGroup: { select: { id: true, name: true } }, dormRoom: { select: { name: true } } },
                    orderBy: { fullName: 'asc' },
                })
                return { santri, scope: user.waliKelasOf, scopeType: 'WALI_KELAS' as const }
            }

            if (dormRoomIds.length > 0) {
                const santri = await ctx.prisma.santri.findMany({
                    where: { dormRoomId: { in: dormRoomIds }, isActive: true, ...searchFilter },
                    select: { id: true, fullName: true, nis: true, gender: true, phone: true, photoUrl: true, classGroup: { select: { id: true, name: true } }, dormRoom: { select: { name: true } } },
                    orderBy: { fullName: 'asc' },
                })
                return { santri, scope: user.supervisedRooms, scopeType: 'PEMBIMBING_KAMAR' as const }
            }

            return { santri: [], scope: null as any, scopeType: 'NONE' as const }
        }),

    listAll: protectedProcedure
        .input(z.object({
            status: z.enum(['PENDING', 'IN_DISCUSSION', 'APPROVED', 'REJECTED']).optional(),
            department: z.string().optional(),
            search: z.string().optional(),
            page: z.number().min(1).default(1),
            limit: z.number().min(1).max(50).default(20),
        }).optional())
        .query(async ({ ctx, input }) => {
            const { status, department, search, page = 1, limit = 20 } = input ?? {}
            const where: any = {
                ...(status ? { status } : {}),
                ...(department ? { department } : {}),
                ...(search ? {
                    OR: [
                        { santri: { fullName: { contains: search, mode: 'insensitive' as const } } },
                        { santri: { nis: { contains: search, mode: 'insensitive' as const } } },
                    ]
                } : {}),
            }

            const [data, total] = await Promise.all([
                ctx.prisma.santriChangeRequest.findMany({
                    where,
                    include: {
                        santri: { select: { id: true, fullName: true, nis: true } },
                        _count: { select: { messages: true } },
                    },
                    orderBy: { updatedAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                ctx.prisma.santriChangeRequest.count({ where }),
            ])

            const userIds = [...new Set(data.map(r => r.requestedBy))]
            const users = userIds.length > 0
                ? await ctx.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } })
                : []
            const userMap = Object.fromEntries(users.map(u => [u.id, u.fullName]))

            return {
                data: data.map(r => ({ ...r, requesterName: userMap[r.requestedBy] ?? '-' })),
                total, page, totalPages: Math.ceil(total / limit),
            }
        }),

    getDetail: protectedProcedure
        .input(z.string())
        .query(async ({ ctx, input: id }) => {
            const req = await ctx.prisma.santriChangeRequest.findUnique({
                where: { id },
                include: {
                    santri: { select: { id: true, fullName: true, nis: true } },
                    messages: {
                        include: { sender: { select: { id: true, fullName: true, role: true } } },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            })
            if (!req) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request tidak ditemukan' })
            return req
        }),

    addMessage: protectedProcedure
        .input(z.object({
            requestId: z.string(),
            message: z.string().min(1).max(3000),
        }))
        .mutation(async ({ ctx, input }) => {
            const req = await ctx.prisma.santriChangeRequest.findUnique({ where: { id: input.requestId } })
            if (!req) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request tidak ditemukan' })
            if (req.status === 'APPROVED' || req.status === 'REJECTED') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Request sudah selesai, tidak bisa dibalas' })
            }

            const [msg] = await ctx.prisma.$transaction([
                ctx.prisma.changeRequestMessage.create({
                    data: { requestId: input.requestId, senderId: ctx.session.user.id, message: input.message },
                    include: { sender: { select: { id: true, fullName: true, role: true } } },
                }),
                ctx.prisma.santriChangeRequest.update({
                    where: { id: input.requestId },
                    data: { status: 'IN_DISCUSSION', updatedAt: new Date() },
                }),
            ])

            // Push real-time to connected SSE clients
            notifyChatClients(input.requestId, msg)
            // Also notify global list watchers
            notifyGlobalClients({ type: 'request_updated', requestId: input.requestId })

            return msg
        }),

    review: protectedProcedure
        .input(z.object({
            id: z.string(),
            action: z.enum(['APPROVE', 'REJECT']),
            reviewNote: z.string().max(500).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const request = await ctx.prisma.santriChangeRequest.findUnique({ where: { id: input.id } })
            if (!request) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request tidak ditemukan' })
            if (request.status === 'APPROVED' || request.status === 'REJECTED') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Request sudah diproses' })
            }

            const newStatus = input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
            const autoMsgText = input.action === 'APPROVE'
                ? `✅ Permintaan ini telah **disetujui**.${input.reviewNote ? `\n\nCatatan: ${input.reviewNote}` : ''}`
                : `❌ Permintaan ini telah **ditolak**.${input.reviewNote ? `\n\nAlasan: ${input.reviewNote}` : ''}`

            const [, autoMsg] = await ctx.prisma.$transaction([
                ctx.prisma.santriChangeRequest.update({
                    where: { id: input.id },
                    data: { status: newStatus, reviewedBy: ctx.session.user.id, reviewNote: input.reviewNote },
                }),
                ctx.prisma.changeRequestMessage.create({
                    data: { requestId: input.id, senderId: ctx.session.user.id, message: autoMsgText },
                    include: { sender: { select: { id: true, fullName: true, role: true } } },
                }),
            ])

            // Push real-time to connected SSE clients
            notifyChatClients(input.id, autoMsg)
            // Also notify global list watchers
            notifyGlobalClients({ type: 'request_updated', requestId: input.id })

            return { success: true, status: newStatus }
        }),

    // Mark messages in a request as read (called when user opens the chat)
    markRead: protectedProcedure
        .input(z.object({ requestId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Mark all messages NOT sent by the current user as read
            await ctx.prisma.changeRequestMessage.updateMany({
                where: {
                    requestId: input.requestId,
                    senderId: { not: ctx.session.user.id },
                    readAt: null,
                },
                data: { readAt: new Date() },
            })
            // Broadcast read status to the SSE channel so sender sees blue ticks
            notifyReadReceipt(input.requestId)
            return { success: true }
        }),
})
