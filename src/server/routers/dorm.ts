import { z } from 'zod'
import { router, protectedProcedure, pageProtectedProcedure, hasRole, hasAnyPageAccess } from '../trpc'
import { TRPCError } from '@trpc/server'

const dormProcedure = pageProtectedProcedure('/master-data/kamar/manage')
const staffProcedure = dormProcedure.use(({ ctx, next }) => {
    const hasAccess = ['ADMIN', 'STAF_PENDATAAN'].some(role => hasRole(ctx, role))
    if (!hasAccess) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Akses ditolak. Role yang diperlukan: ADMIN, STAF_PENDATAAN',
        })
    }
    return next({ ctx })
})

export const dormRouter = router({
    getSantriCurrentRoom: protectedProcedure
        .input(z.object({ santriId: z.string() }))
        .query(async ({ ctx, input }) => {
            const allowed = hasRole(ctx, 'ADMIN') || hasAnyPageAccess(ctx, ['/master-data/santri', '/master-data/kamar/manage'])
            if (!allowed) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Akses ditolak. Anda tidak memiliki akses ke data kamar santri',
                })
            }

            const activeAssignment = await ctx.prisma.dormAssignment.findFirst({
                where: {
                    santriId: input.santriId,
                    isActive: true,
                    endAt: null,
                },
                orderBy: { startAt: 'desc' },
                include: {
                    room: {
                        include: {
                            floor: {
                                include: {
                                    building: {
                                        include: {
                                            complex: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            })

            const mapRoom = (room: any) => ({
                id: String(room.id),
                name: room.name,
                capacity: room.capacity,
                floorNumber: room.floor.number,
                buildingName: room.floor.building.name,
                complexName: room.floor.building.complex.name,
            })

            if (activeAssignment?.room) {
                return { room: mapRoom(activeAssignment.room) }
            }

            const santri = await ctx.prisma.santri.findUnique({
                where: { id: input.santriId },
                include: {
                    dormRoom: {
                        include: {
                            floor: {
                                include: {
                                    building: {
                                        include: {
                                            complex: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            })

            if (!santri?.dormRoom) {
                return { room: null }
            }

            return { room: mapRoom(santri.dormRoom) }
        }),

    // ==================== COMPLEX ====================
    complex: router({
        list: dormProcedure.query(async ({ ctx }) => {
            return ctx.prisma.dormComplex.findMany({
                where: { isActive: true },
                include: { _count: { select: { buildings: true } } },
                orderBy: { name: 'asc' },
            })
        }),

        create: staffProcedure
            .input(z.object({ name: z.string().min(1), code: z.string().optional() }))
            .mutation(async ({ ctx, input }) => {
                try {
                    return await ctx.prisma.dormComplex.create({ data: input })
                } catch (e: any) {
                    if (e.code === 'P2002') throw new TRPCError({ code: 'CONFLICT', message: `Komplek "${input.name}" sudah ada` })
                    throw e
                }
            }),

        update: staffProcedure
            .input(z.object({ id: z.number(), name: z.string().min(1).optional(), code: z.string().optional(), isActive: z.boolean().optional() }))
            .mutation(async ({ ctx, input }) => {
                const { id, ...data } = input
                return ctx.prisma.dormComplex.update({ where: { id }, data })
            }),

        delete: staffProcedure
            .input(z.number())
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.$transaction(async (tx) => {
                    // Get all rooms under this complex
                    const rooms = await tx.dormRoom.findMany({
                        where: { floor: { building: { complexId: input } } },
                        select: { id: true },
                    })
                    const roomIds = rooms.map(r => r.id)
                    // Deactivate all assignments + clear santri dormRoomId
                    if (roomIds.length) {
                        await tx.dormAssignment.updateMany({ where: { roomId: { in: roomIds }, isActive: true }, data: { isActive: false, endAt: new Date() } })
                        await tx.santri.updateMany({ where: { dormRoomId: { in: roomIds } }, data: { dormRoomId: null } })
                        await tx.dormRoom.deleteMany({ where: { id: { in: roomIds } } })
                    }
                    await tx.dormFloor.deleteMany({ where: { building: { complexId: input } } })
                    await tx.dormBuilding.deleteMany({ where: { complexId: input } })
                    return tx.dormComplex.delete({ where: { id: input } })
                })
            }),
    }),

    // ==================== BUILDING ====================
    building: router({
        listByComplex: dormProcedure
            .input(z.number())
            .query(async ({ ctx, input }) => {
                return ctx.prisma.dormBuilding.findMany({
                    where: { complexId: input, isActive: true },
                    include: { _count: { select: { floors: true } } },
                    orderBy: { name: 'asc' },
                })
            }),

        create: staffProcedure
            .input(z.object({ complexId: z.number(), name: z.string().min(1), code: z.string().optional() }))
            .mutation(async ({ ctx, input }) => {
                try {
                    return await ctx.prisma.dormBuilding.create({ data: input })
                } catch (e: any) {
                    if (e.code === 'P2002') throw new TRPCError({ code: 'CONFLICT', message: `Gedung "${input.name}" sudah ada di komplek ini` })
                    throw e
                }
            }),

        update: staffProcedure
            .input(z.object({ id: z.number(), name: z.string().min(1).optional(), code: z.string().optional(), isActive: z.boolean().optional() }))
            .mutation(async ({ ctx, input }) => {
                const { id, ...data } = input
                return ctx.prisma.dormBuilding.update({ where: { id }, data })
            }),

        delete: staffProcedure
            .input(z.number())
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.$transaction(async (tx) => {
                    const rooms = await tx.dormRoom.findMany({
                        where: { floor: { buildingId: input } },
                        select: { id: true },
                    })
                    const roomIds = rooms.map(r => r.id)
                    if (roomIds.length) {
                        await tx.dormAssignment.updateMany({ where: { roomId: { in: roomIds }, isActive: true }, data: { isActive: false, endAt: new Date() } })
                        await tx.santri.updateMany({ where: { dormRoomId: { in: roomIds } }, data: { dormRoomId: null } })
                        await tx.dormRoom.deleteMany({ where: { id: { in: roomIds } } })
                    }
                    await tx.dormFloor.deleteMany({ where: { buildingId: input } })
                    return tx.dormBuilding.delete({ where: { id: input } })
                })
            }),
    }),

    // ==================== FLOOR ====================
    floor: router({
        listByBuilding: dormProcedure
            .input(z.number())
            .query(async ({ ctx, input }) => {
                return ctx.prisma.dormFloor.findMany({
                    where: { buildingId: input, isActive: true },
                    include: { _count: { select: { rooms: true } } },
                    orderBy: { number: 'asc' },
                })
            }),

        create: staffProcedure
            .input(z.object({ buildingId: z.number(), number: z.number().int().min(1) }))
            .mutation(async ({ ctx, input }) => {
                try {
                    return await ctx.prisma.dormFloor.create({ data: input })
                } catch (e: any) {
                    if (e.code === 'P2002') throw new TRPCError({ code: 'CONFLICT', message: `Lantai ${input.number} sudah ada di gedung ini` })
                    throw e
                }
            }),

        delete: staffProcedure
            .input(z.number())
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.$transaction(async (tx) => {
                    const rooms = await tx.dormRoom.findMany({
                        where: { floorId: input },
                        select: { id: true },
                    })
                    const roomIds = rooms.map(r => r.id)
                    if (roomIds.length) {
                        await tx.dormAssignment.updateMany({ where: { roomId: { in: roomIds }, isActive: true }, data: { isActive: false, endAt: new Date() } })
                        await tx.santri.updateMany({ where: { dormRoomId: { in: roomIds } }, data: { dormRoomId: null } })
                        await tx.dormRoom.deleteMany({ where: { id: { in: roomIds } } })
                    }
                    return tx.dormFloor.delete({ where: { id: input } })
                })
            }),
    }),

    // ==================== ROOM ====================
    room: router({
        list: dormProcedure.query(async ({ ctx }) => {
            return ctx.prisma.dormRoom.findMany({
                where: { isActive: true },
                include: {
                    floor: {
                        include: {
                            building: {
                                include: { complex: { select: { id: true, name: true } } },
                            },
                        },
                    },
                    supervisor: { select: { id: true, fullName: true } },
                    _count: {
                        select: { assignments: { where: { isActive: true } } },
                    },
                },
                orderBy: { name: 'asc' },
            })
        }),

        getDetail: dormProcedure
            .input(z.number())
            .query(async ({ ctx, input }) => {
                const room = await ctx.prisma.dormRoom.findUnique({
                    where: { id: input },
                    include: {
                        floor: {
                            include: {
                                building: {
                                    include: { complex: { select: { name: true } } },
                                },
                            },
                        },
                        assignments: {
                            where: { isActive: true },
                            include: {
                                santri: {
                                    select: { id: true, fullName: true, nis: true, gender: true, photoUrl: true },
                                },
                            },
                            orderBy: { startAt: 'desc' },
                        },
                    },
                })
                if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Kamar tidak ditemukan' })
                return room
            }),

        create: staffProcedure
            .input(z.object({
                floorId: z.number(),
                name: z.string().min(1),
                code: z.string().optional(),
                capacity: z.number().int().positive().default(20),
            }))
            .mutation(async ({ ctx, input }) => {
                try {
                    return await ctx.prisma.dormRoom.create({ data: input })
                } catch (e: any) {
                    if (e.code === 'P2002') throw new TRPCError({ code: 'CONFLICT', message: `Kamar "${input.name}" sudah ada di lantai ini` })
                    throw e
                }
            }),

        update: staffProcedure
            .input(z.object({
                id: z.number(),
                name: z.string().min(1).optional(),
                code: z.string().optional(),
                capacity: z.number().int().positive().optional(),
                isActive: z.boolean().optional(),
            }))
            .mutation(async ({ ctx, input }) => {
                const { id, ...data } = input
                return ctx.prisma.dormRoom.update({ where: { id }, data })
            }),

        delete: staffProcedure
            .input(z.number())
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.dormRoom.delete({ where: { id: input } })
            }),

        assignSupervisor: staffProcedure
            .input(z.object({ roomId: z.number(), userId: z.string() }))
            .mutation(async ({ ctx, input }) => {
                // Check if this user is already supervising another room
                const existing = await ctx.prisma.dormRoom.findFirst({
                    where: { supervisorId: input.userId, isActive: true },
                })
                if (existing) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `User ini sudah menjadi pembimbing kamar "${existing.name}". Hapus dulu dari kamar tersebut.`,
                    })
                }
                return ctx.prisma.dormRoom.update({
                    where: { id: input.roomId },
                    data: { supervisorId: input.userId },
                })
            }),

        removeSupervisor: staffProcedure
            .input(z.object({ roomId: z.number() }))
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.dormRoom.update({
                    where: { id: input.roomId },
                    data: { supervisorId: null },
                })
            }),

        availableSupervisors: dormProcedure.query(async ({ ctx }) => {
            // Get all users with PEMBIMBING_KAMAR role
            const pembimbingRole = await ctx.prisma.roleEntry.findUnique({
                where: { code: 'PEMBIMBING_KAMAR' },
            })
            if (!pembimbingRole) return []

            const userRoles = await ctx.prisma.userRole.findMany({
                where: { roleId: pembimbingRole.id },
                select: { userId: true },
            })
            const userIds = userRoles.map(ur => ur.userId)
            if (!userIds.length) return []

            // Get users NOT assigned to any active room
            const assignedRooms = await ctx.prisma.dormRoom.findMany({
                where: { supervisorId: { not: null }, isActive: true },
                select: { supervisorId: true },
            })
            const assignedIds = new Set(assignedRooms.map(r => r.supervisorId!))

            const users = await ctx.prisma.user.findMany({
                where: { id: { in: userIds }, isEnabled: true },
                select: { id: true, fullName: true },
                orderBy: { fullName: 'asc' },
            })

            return users.map(u => ({ ...u, isAssigned: assignedIds.has(u.id) }))
        }),
    }),

    // ==================== ASSIGNMENT ====================
    assignment: router({
        assign: staffProcedure
            .input(z.object({
                santriId: z.string(),
                roomId: z.number(),
            }))
            .mutation(async ({ ctx, input }) => {
                // Check capacity before assigning
                const room = await ctx.prisma.dormRoom.findUnique({
                    where: { id: input.roomId },
                    select: {
                        capacity: true,
                        _count: { select: { assignments: { where: { isActive: true } } } },
                    },
                })
                if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Kamar tidak ditemukan' })

                // Check if santri is already in this room
                const existingInTarget = await ctx.prisma.dormAssignment.findFirst({
                    where: { santriId: input.santriId, roomId: input.roomId, isActive: true },
                })
                if (existingInTarget) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Santri sudah berada di kamar ini' })
                }

                // Check if santri is moving from another room (net-zero change) or is new
                const currentAssignment = await ctx.prisma.dormAssignment.findFirst({
                    where: { santriId: input.santriId, isActive: true },
                })
                const isMoving = !!currentAssignment
                const currentOccupancy = room._count.assignments
                // If moving, occupancy in target doesn't increase (they leave old room)
                // If new (no current room), occupancy increases by 1
                if (!isMoving && currentOccupancy >= room.capacity) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: `Kamar sudah penuh (${currentOccupancy}/${room.capacity}). Tidak bisa menambah santri baru.` })
                }

                return ctx.prisma.$transaction(async (tx) => {
                    // Delete old inactive assignments to avoid unique constraint on (santri_id, is_active)
                    await tx.dormAssignment.deleteMany({
                        where: { santriId: input.santriId, isActive: false },
                    })
                    // Deactivate old assignment
                    await tx.dormAssignment.updateMany({
                        where: { santriId: input.santriId, isActive: true },
                        data: { isActive: false, endAt: new Date() },
                    })

                    // Create new assignment
                    const assignment = await tx.dormAssignment.create({
                        data: {
                            santriId: input.santriId,
                            roomId: input.roomId,
                            isActive: true,
                        },
                    })

                    // Update santri helper field
                    await tx.santri.update({
                        where: { id: input.santriId },
                        data: { dormRoomId: input.roomId },
                    })

                    return assignment
                })
            }),

        remove: staffProcedure
            .input(z.object({
                santriId: z.string(),
            }))
            .mutation(async ({ ctx, input }) => {
                return ctx.prisma.$transaction(async (tx) => {
                    // Delete old inactive assignments to avoid unique constraint on (santri_id, is_active)
                    await tx.dormAssignment.deleteMany({
                        where: { santriId: input.santriId, isActive: false },
                    })
                    // End active assignment
                    await tx.dormAssignment.updateMany({
                        where: { santriId: input.santriId, isActive: true },
                        data: { isActive: false, endAt: new Date() },
                    })

                    // Clear santri helper field
                    await tx.santri.update({
                        where: { id: input.santriId },
                        data: { dormRoomId: null },
                    })
                })
            }),
    }),
})
