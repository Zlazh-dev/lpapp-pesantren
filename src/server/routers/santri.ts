import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, pageProtectedProcedure, protectedProcedure, hasRole as hasRoleCode } from '../trpc'
import type { Prisma } from '@prisma/client'
import { generateSantriTemplate, parseSantriXlsx, parseDateStrict } from '../utils/xlsx'
import { deleteLocalFile, isLocalUpload } from '@/lib/upload'
import { buildSantriScopeSummary, buildSantriScopeWhere, buildSantriScopeWhereFromSummary } from '../rbac/santriScope'

const santriViewProcedure = pageProtectedProcedure('/master-data/santri')
const santriManageProcedure = pageProtectedProcedure('/master-data/santri/manage')

const santriCentralizedProcedure = santriManageProcedure.use(({ ctx, next }) => {
    if (!hasRoleCode(ctx, 'ADMIN')) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Akses ditolak. Halaman ini hanya untuk ADMIN',
        })
    }
    return next({ ctx })
})
const santriRoleProcedure = (...roles: string[]) =>
    santriManageProcedure.use(({ ctx, next }) => {
        const hasAccess = roles.some(role => hasRoleCode(ctx, role))
        if (!hasAccess) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: `Akses ditolak. Role yang diperlukan: ${roles.join(', ')}`,
            })
        }
        return next({ ctx })
    })

const addressSchema = z.object({
    jalan: z.string().min(5, 'Nama jalan terlalu pendek').optional().or(z.literal('')),
    rt_rw: z.string().regex(/^\d{2,3}\/\d{2,3}$/, 'Format RT/RW tidak valid (contoh: 001/002)').optional().or(z.literal('')),
    kelurahan: z.string().min(3, 'Nama kelurahan/desa terlalu pendek').optional().or(z.literal('')),
    kecamatan: z.string().min(3, 'Nama kecamatan terlalu pendek').optional().or(z.literal('')),
    kota: z.string().min(3, 'Nama kota/kabupaten terlalu pendek').optional().or(z.literal('')),
    provinsi: z.string().min(3, 'Nama provinsi terlalu pendek').optional().or(z.literal('')),
    kodepos: z.string().regex(/^\d{5}$/, 'Kode pos harus 5 angka').optional().or(z.literal('')),
})

const santriListInputSchema = z.object({
    search: z.string().optional(),
    classGroupId: z.string().optional(),
    dormRoomId: z.number().optional(),
    sortKey: z.enum(['fullName', 'nis', 'createdAt']).optional(),
    sortDir: z.enum(['asc', 'desc']).optional(),
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
}).optional()

type SantriListInput = z.infer<typeof santriListInputSchema>

function buildSantriListWhere(input: SantriListInput, scopeWhere: Prisma.SantriWhereInput): Prisma.SantriWhereInput {
    const { search, classGroupId, dormRoomId } = input ?? {}

    const andFilters: Prisma.SantriWhereInput[] = [
        { isActive: true },
        scopeWhere,
    ]

    if (search) {
        andFilters.push({
            OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { nis: { contains: search, mode: 'insensitive' } },
            ],
        })
    }
    if (classGroupId) andFilters.push({ classGroupId })
    if (dormRoomId) andFilters.push({ dormRoomId })

    return { AND: andFilters }
}

async function runSantriListQuery(params: {
    ctx: { prisma: any }
    input: SantriListInput
    scopeWhere: Prisma.SantriWhereInput
}) {
    const { ctx, input, scopeWhere } = params
    const { sortKey, sortDir, page = 1, limit = 10 } = input ?? {}
    const where = buildSantriListWhere(input, scopeWhere)
    const orderBy = sortKey ? { [sortKey]: sortDir ?? 'asc' } : { fullName: 'asc' as const }

    const [santri, total] = await Promise.all([
        ctx.prisma.santri.findMany({
            where,
            include: {
                classGroup: { include: { grade: { include: { level: true } } } },
                dormRoom: { include: { floor: { include: { building: { include: { complex: true } } } } } },
                bills: { select: { status: true, amount: true, paidAmount: true } },
            },
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
        }),
        ctx.prisma.santri.count({ where }),
    ])

    const data = santri.map((s: any) => {
        const totalBills = s.bills.length
        const paidBills = s.bills.filter((b: any) => b.status === 'PAID').length
        const billingSummary = totalBills === 0
            ? 'NONE'
            : paidBills === totalBills
                ? 'LUNAS'
                : paidBills > 0
                    ? 'SEBAGIAN'
                    : 'BELUM'
        const { bills, ...rest } = s
        return { ...rest, billingSummary, totalBills, paidBills }
    })

    return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    }
}

export const santriRouter = router({
    dashboardStats: protectedProcedure
        .query(async ({ ctx }) => {
            const [total, putra, putri, mahadAly, tahfidz, formal] = await Promise.all([
                ctx.prisma.santri.count({ where: { isActive: true } }),
                ctx.prisma.santri.count({ where: { isActive: true, gender: 'L' } }),
                ctx.prisma.santri.count({ where: { isActive: true, gender: 'P' } }),
                ctx.prisma.santri.count({ where: { isActive: true, educationLevel: "Ma'had Aly" } }),
                ctx.prisma.santri.count({ where: { isActive: true, educationLevel: 'Tahfidz' } }),
                ctx.prisma.santri.count({ where: { isActive: true, educationLevel: 'Formal' } }),
            ])
            return { total, putra, putri, mahadAly, tahfidz, formal }
        }),

    // Accessible to ALL authenticated roles — used by the dashboard widget.
    // Returns recent santri within the user's scope (scoped for WALI_KELAS/PEMBIMBING_KAMAR, all for ADMIN etc.)
    listForDashboard: protectedProcedure
        .input(z.object({ limit: z.number().min(1).max(20).default(5) }).optional())
        .query(async ({ ctx, input }) => {
            const scopeWhere = buildSantriScopeWhereFromSummary(buildSantriScopeSummary(ctx))
            const limit = input?.limit ?? 5
            const data = await ctx.prisma.santri.findMany({
                where: { isActive: true, ...scopeWhere },
                orderBy: { createdAt: 'desc' },
                take: limit,
                select: {
                    id: true,
                    fullName: true,
                    nis: true,
                    photoUrl: true,
                    gender: true,
                    classGroup: { select: { name: true } },
                },
            })
            return { data }
        }),

    listScoped: santriViewProcedure
        .input(santriListInputSchema)
        .query(async ({ ctx, input }) => {
            const scopeSummary = buildSantriScopeSummary(ctx)
            const scopeWhere = buildSantriScopeWhereFromSummary(scopeSummary)
            const result = await runSantriListQuery({ ctx, input, scopeWhere })

            return {
                ...result,
                scopeInfo: {
                    isPrivileged: scopeSummary.isPrivileged,
                    hasRelevantScope: scopeSummary.hasRelevantScope,
                    classGroupIds: scopeSummary.classGroupIds,
                    roomIds: scopeSummary.roomIds,
                    buildingIds: scopeSummary.buildingIds,
                    complexIds: scopeSummary.complexIds,
                },
            }
        }),

    listCentralized: santriCentralizedProcedure
        .input(santriListInputSchema)
        .query(async ({ ctx, input }) => {
            return runSantriListQuery({ ctx, input, scopeWhere: {} })
        }),

    // Backward compatible endpoint (defaults to scoped behavior).
    list: santriViewProcedure
        .input(santriListInputSchema)
        .query(async ({ ctx, input }) => {
            const scopeSummary = buildSantriScopeSummary(ctx)
            const scopeWhere = buildSantriScopeWhereFromSummary(scopeSummary)
            return runSantriListQuery({ ctx, input, scopeWhere })
        }),

    getById: santriViewProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            const scopeWhere = await buildSantriScopeWhere(ctx)
            const santri = await ctx.prisma.santri.findFirst({
                where: {
                    AND: [
                        { id: input },
                        scopeWhere,
                    ],
                },
                include: {
                    classGroup: {
                        include: {
                            grade: { include: { level: true } },
                            schoolYear: { select: { id: true, name: true } },
                        },
                    },
                    dormRoom: {
                        include: {
                            floor: {
                                include: {
                                    building: {
                                        include: { complex: { select: { id: true, name: true } } },
                                    },
                                },
                            },
                        },
                    },
                    bills: {
                        orderBy: { dueDate: 'desc' },
                        include: { billingModel: true, paymentProofs: { take: 1, orderBy: { createdAt: 'desc' } } },
                    },
                    attendances: { orderBy: { date: 'desc' }, take: 30 },
                    sharedLinks: {
                        where: {
                            revokedAt: null,
                            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                        },
                    },
                },
            })
            if (!santri) {
                const exists = await ctx.prisma.santri.findUnique({
                    where: { id: input },
                    select: { id: true },
                })
                if (exists) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Anda tidak memiliki akses ke data santri ini',
                    })
                }
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Santri tidak ditemukan',
                })
            }
            return santri
        }),

    // CRUD restricted to STAF_PENDATAAN and ADMIN only
    create: santriRoleProcedure('STAF_PENDATAAN', 'ADMIN')
        .input(
            z.object({
                fullName: z.string().min(2, 'Nama minimal 2 karakter'),
                nis: z.string().min(4, 'NIS minimal 4 karakter'),
                gender: z.enum(['L', 'P']).default('L'),
                birthDate: z.string().optional(),
                birthPlace: z.string().optional(),
                phone: z.string().optional(),
                fatherName: z.string().optional(),
                motherName: z.string().optional(),
                fatherPhone: z.string().optional(),
                motherPhone: z.string().optional(),
                waliName: z.string().optional(),
                waliPhone: z.string().optional(),
                description: z.string().optional(),
                photoUrl: z.string().optional(),
                dormRoomId: z.number().nullable().optional(),
                classGroupId: z.string().nullable().optional(),
                nik: z.string().optional(),
                noKK: z.string().optional(),
                educationLevel: z.string().nullable().optional(),
                enrollmentDate: z.string().nullable().optional(),
                address: addressSchema.optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { birthDate, enrollmentDate, address, ...rest } = input
            return ctx.prisma.santri.create({
                data: {
                    ...rest,
                    birthDate: birthDate ? new Date(birthDate) : undefined,
                    enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
                    address: address ?? undefined,
                },
            })
        }),

    update: santriRoleProcedure('STAF_PENDATAAN', 'ADMIN')
        .input(
            z.object({
                id: z.string(),
                fullName: z.string().min(2).optional(),
                nis: z.string().min(4).optional(),
                gender: z.enum(['L', 'P']).optional(),
                birthDate: z.string().optional(),
                birthPlace: z.string().optional(),
                phone: z.string().optional(),
                fatherName: z.string().optional(),
                motherName: z.string().optional(),
                fatherPhone: z.string().optional(),
                motherPhone: z.string().optional(),
                waliName: z.string().nullable().optional(),
                waliPhone: z.string().nullable().optional(),
                description: z.string().nullable().optional(),
                dormRoomId: z.number().nullable().optional(),
                classGroupId: z.string().nullable().optional(),
                photoUrl: z.string().optional(),
                nik: z.string().nullable().optional(),
                noKK: z.string().nullable().optional(),
                educationLevel: z.string().nullable().optional(),
                enrollmentDate: z.string().nullable().optional(),
                kkFileUrl: z.string().nullable().optional(),
                kkFileKey: z.string().nullable().optional(),
                address: addressSchema.optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, birthDate, enrollmentDate, address, dormRoomId, ...rest } = input

            // Fetch old file URLs before update (for auto-delete)
            const oldSantri = await ctx.prisma.santri.findUnique({
                where: { id },
                select: { photoUrl: true, kkFileUrl: true, dormRoomId: true },
            })

            // Validate room capacity if dormRoomId is being set
            if (dormRoomId !== undefined && dormRoomId !== null) {
                // Only validate if actually changing to a different room
                if (oldSantri?.dormRoomId !== dormRoomId) {
                    const room = await ctx.prisma.dormRoom.findUnique({
                        where: { id: dormRoomId },
                        select: {
                            capacity: true,
                            _count: { select: { santri: { where: { isActive: true } } } },
                        },
                    })
                    if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Kamar tidak ditemukan' })
                    if (room._count.santri >= room.capacity) {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message: `Kamar sudah penuh (${room._count.santri}/${room.capacity}). Pilih kamar lain.`,
                        })
                    }
                }
            }

            const updated = await ctx.prisma.santri.update({
                where: { id },
                data: {
                    ...rest,
                    ...(dormRoomId !== undefined && { dormRoomId }),
                    ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
                    ...(enrollmentDate !== undefined && { enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : null }),
                    ...(address !== undefined && { address }),
                },
            })

            // Auto-delete old local files if they were replaced
            if (oldSantri) {
                if (input.photoUrl && oldSantri.photoUrl !== input.photoUrl && isLocalUpload(oldSantri.photoUrl)) {
                    deleteLocalFile(oldSantri.photoUrl).catch(() => { }) // fire-and-forget
                }
                if (input.kkFileUrl && oldSantri.kkFileUrl !== input.kkFileUrl && isLocalUpload(oldSantri.kkFileUrl)) {
                    deleteLocalFile(oldSantri.kkFileUrl).catch(() => { }) // fire-and-forget
                }
            }

            return updated
        }),

    delete: santriRoleProcedure('STAF_PENDATAAN', 'ADMIN')
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.santri.delete({
                where: { id: input },
            })
        }),

    deactivate: santriRoleProcedure('STAF_PENDATAAN', 'ADMIN')
        .input(z.string())
        .mutation(async ({ ctx, input: santriId }) => {
            // Remove from class, room, and end dorm assignments in a transaction
            return ctx.prisma.$transaction(async (tx: any) => {
                // Remove active dorm assignments (delete instead of soft-deactivate
                // to avoid unique constraint on [santriId, isActive])
                await tx.dormAssignment.deleteMany({
                    where: { santriId, isActive: true },
                })

                // Set santri as inactive + clear all assignments + record deactivation time
                return tx.santri.update({
                    where: { id: santriId },
                    data: {
                        isActive: false,
                        classGroupId: null,
                        dormRoomId: null,
                        deactivatedAt: new Date(),
                    },
                })
            })
        }),

    reactivate: santriRoleProcedure('STAF_PENDATAAN', 'ADMIN')
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.santri.update({
                where: { id: input },
                data: { isActive: true },
            })
        }),

    listArchived: santriCentralizedProcedure
        .input(z.object({
            search: z.string().optional(),
            page: z.number().min(1).default(1),
            limit: z.number().min(1).max(100).default(12),
        }).optional())
        .query(async ({ ctx, input }) => {
            const { search, page = 1, limit = 12 } = input ?? {}
            const where: Prisma.SantriWhereInput = {
                isActive: false,
                ...(search ? {
                    OR: [
                        { fullName: { contains: search, mode: 'insensitive' } },
                        { nis: { contains: search, mode: 'insensitive' } },
                    ],
                } : {}),
            }

            const [data, total] = await Promise.all([
                ctx.prisma.santri.findMany({
                    where,
                    include: {
                        classGroup: { include: { grade: { include: { level: true } } } },
                        dormRoom: { include: { floor: { include: { building: true } } } },
                    },
                    orderBy: { updatedAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                ctx.prisma.santri.count({ where }),
            ])

            return { data, total, page, totalPages: Math.ceil(total / limit) }
        }),

    // Lightweight search for bulk-assign selection basket
    search: santriViewProcedure
        .input(z.object({
            q: z.string().min(2),
            limit: z.number().min(1).max(50).default(20),
        }))
        .query(async ({ ctx, input }) => {
            const scopeWhere = await buildSantriScopeWhere(ctx)
            return ctx.prisma.santri.findMany({
                where: {
                    AND: [
                        { isActive: true },
                        scopeWhere,
                        {
                            OR: [
                                { fullName: { contains: input.q, mode: 'insensitive' } },
                                { nis: { contains: input.q, mode: 'insensitive' } },
                            ],
                        },
                    ],
                },
                select: { id: true, fullName: true, nis: true, gender: true, classGroupId: true, dormRoomId: true },
                orderBy: { fullName: 'asc' },
                take: input.limit,
            })
        }),

    // Bulk assign santri to a ClassGroup (rombel)
    bulkAssignToClassGroup: santriRoleProcedure('STAF_PENDATAAN', 'ADMIN')
        .input(z.object({
            classGroupId: z.string(),
            santriIds: z.array(z.string()).min(1).max(200),
            mode: z.enum(['REPLACE', 'ONLY_EMPTY']),
        }))
        .mutation(async ({ ctx, input }) => {
            const uniqueIds = [...new Set(input.santriIds)]
            const santriList = await ctx.prisma.santri.findMany({
                where: { id: { in: uniqueIds }, isActive: true },
                select: { id: true, classGroupId: true },
            })

            const foundIds = new Set(santriList.map(s => s.id))
            const skipped: { id: string; reason: string }[] = []

            // Not found
            for (const id of uniqueIds) {
                if (!foundIds.has(id)) skipped.push({ id, reason: 'NOT_FOUND' })
            }

            const toAssign: string[] = []
            for (const s of santriList) {
                if (s.classGroupId === input.classGroupId) {
                    skipped.push({ id: s.id, reason: 'ALREADY_IN_TARGET' })
                } else if (input.mode === 'ONLY_EMPTY' && s.classGroupId) {
                    skipped.push({ id: s.id, reason: 'HAS_CLASS' })
                } else {
                    toAssign.push(s.id)
                }
            }

            if (toAssign.length > 0) {
                await ctx.prisma.santri.updateMany({
                    where: { id: { in: toAssign } },
                    data: { classGroupId: input.classGroupId },
                })
            }

            return {
                assignedIds: toAssign,
                assignedCount: toAssign.length,
                skipped,
                skippedCount: skipped.length,
            }
        }),

    // Bulk unassign santri from their current ClassGroup
    bulkUnassignFromClassGroup: santriRoleProcedure('STAF_PENDATAAN', 'ADMIN')
        .input(z.object({
            santriIds: z.array(z.string()).min(1).max(200),
        }))
        .mutation(async ({ ctx, input }) => {
            const uniqueIds = [...new Set(input.santriIds)]
            const result = await ctx.prisma.santri.updateMany({
                where: { id: { in: uniqueIds }, isActive: true },
                data: { classGroupId: null },
            })
            return { removedCount: result.count }
        }),

    // Bulk assign santri to a DormRoom (kamar)
    bulkAssignToDormRoom: santriRoleProcedure('STAF_PENDATAAN', 'ADMIN')
        .input(z.object({
            roomId: z.number(),
            santriIds: z.array(z.string()).min(1).max(200),
            mode: z.enum(['REPLACE', 'ONLY_EMPTY']),
        }))
        .mutation(async ({ ctx, input }) => {
            const uniqueIds = [...new Set(input.santriIds)]

            // Get room capacity + current occupancy
            const room = await ctx.prisma.dormRoom.findUnique({
                where: { id: input.roomId },
                select: {
                    capacity: true,
                    _count: { select: { assignments: { where: { isActive: true } } } },
                },
            })
            if (!room) throw new Error('Kamar tidak ditemukan')
            const currentOccupancy = room._count.assignments
            let availableSlots = room.capacity - currentOccupancy

            // Fetch santri
            const santriList = await ctx.prisma.santri.findMany({
                where: { id: { in: uniqueIds }, isActive: true },
                select: { id: true, dormRoomId: true },
            })
            const foundIds = new Set(santriList.map(s => s.id))
            const skipped: { id: string; reason: string }[] = []

            for (const id of uniqueIds) {
                if (!foundIds.has(id)) skipped.push({ id, reason: 'NOT_FOUND' })
            }

            // Filter based on mode
            const candidates: string[] = []
            for (const s of santriList) {
                if (s.dormRoomId === input.roomId) {
                    skipped.push({ id: s.id, reason: 'ALREADY_IN_TARGET' })
                } else if (input.mode === 'ONLY_EMPTY' && s.dormRoomId) {
                    skipped.push({ id: s.id, reason: 'HAS_ROOM' })
                } else {
                    candidates.push(s.id)
                }
            }

            // Enforce capacity — only assign what fits
            // Santri already in this room counted in occupancy; those replacing from another room don't add net occupancy unless they weren't there before
            const toAssign: string[] = []
            for (const id of candidates) {
                if (availableSlots <= 0) {
                    skipped.push({ id, reason: 'CAPACITY_FULL' })
                } else {
                    toAssign.push(id)
                    availableSlots--
                }
            }

            // Execute in transaction
            if (toAssign.length > 0) {
                await ctx.prisma.$transaction(async (tx) => {
                    // 0. Delete old inactive assignments to avoid unique constraint on (santri_id, is_active)
                    await tx.dormAssignment.deleteMany({
                        where: { santriId: { in: toAssign }, isActive: false },
                    })
                    // 1. End all active assignments for these santri
                    await tx.dormAssignment.updateMany({
                        where: { santriId: { in: toAssign }, isActive: true },
                        data: { isActive: false, endAt: new Date() },
                    })
                    // 2. Create new assignments
                    await tx.dormAssignment.createMany({
                        data: toAssign.map(santriId => ({
                            santriId,
                            roomId: input.roomId,
                            isActive: true,
                        })),
                    })
                    // 3. Update santri helper field
                    await tx.santri.updateMany({
                        where: { id: { in: toAssign } },
                        data: { dormRoomId: input.roomId },
                    })
                })
            }

            return {
                assignedIds: toAssign,
                assignedCount: toAssign.length,
                skipped,
                skippedCount: skipped.length,
            }
        }),

    // ==================== IMPORT EXCEL ====================

    templateXlsx: santriRoleProcedure('STAF_PENDATAAN', 'ADMIN')
        .mutation(async () => {
            const buf = await generateSantriTemplate()
            return { filename: 'template-import-santri.xlsx', base64: buf.toString('base64') }
        }),

    importXlsxPreview: santriRoleProcedure('STAF_PENDATAAN', 'ADMIN')
        .input(z.object({ fileBase64: z.string().max(10_000_000, 'File terlalu besar (maks 10MB)') }))
        .mutation(async ({ input }) => {
            return parseSantriXlsx(input.fileBase64)
        }),

    importXlsxCommit: santriRoleProcedure('STAF_PENDATAAN', 'ADMIN')
        .input(z.object({ fileBase64: z.string().max(10_000_000) }))
        .mutation(async ({ ctx, input }) => {
            const { validRows } = await parseSantriXlsx(input.fileBase64)
            if (validRows.length === 0) return { createdCount: 0, updatedCount: 0, failedRows: [] }

            const failedRows: { rowNumber: number; nis?: string; reason: string }[] = []
            let createdCount = 0
            let updatedCount = 0

            // Process in chunks of 100
            const chunkSize = 100
            for (let i = 0; i < validRows.length; i += chunkSize) {
                const chunk = validRows.slice(i, i + chunkSize)
                const nisList = chunk.map(r => r.data.nis)

                // Precheck which NIS exist
                const existing = await ctx.prisma.santri.findMany({
                    where: { nis: { in: nisList } },
                    select: { nis: true },
                })
                const existingSet = new Set(existing.map(e => e.nis))

                for (const row of chunk) {
                    const d = row.data
                    try {
                        const birthDate = d.birth_date ? parseDateStrict(d.birth_date) : undefined

                        await ctx.prisma.santri.upsert({
                            where: { nis: d.nis },
                            create: {
                                fullName: d.full_name,
                                nis: d.nis,
                                gender: d.gender,
                                birthDate: birthDate ?? undefined,
                                phone: d.phone ?? undefined,
                                fatherName: d.guardian_name ?? undefined,
                                fatherPhone: d.guardian_phone ?? undefined,
                            },
                            update: {
                                fullName: d.full_name,
                                gender: d.gender,
                                birthDate: birthDate ?? undefined,
                                phone: d.phone ?? undefined,
                                fatherName: d.guardian_name ?? undefined,
                                fatherPhone: d.guardian_phone ?? undefined,
                            },
                        })

                        if (existingSet.has(d.nis)) updatedCount++
                        else createdCount++
                    } catch (err: any) {
                        failedRows.push({ rowNumber: row.rowNumber, nis: d.nis, reason: err.message ?? 'Unknown error' })
                    }
                }
            }

            return { createdCount, updatedCount, failedRows }
        }),

    generateNis: santriManageProcedure
        .query(async ({ ctx }) => {
            const now = new Date()
            const yearPrefix = String(now.getFullYear()).slice(-2) // "26" for 2026

            // Find the latest NIS that starts with this year prefix
            const latest = await ctx.prisma.santri.findFirst({
                where: { nis: { startsWith: yearPrefix } },
                orderBy: { nis: 'desc' },
                select: { nis: true },
            })

            let nextSeq = 1
            if (latest) {
                const seqPart = latest.nis.slice(yearPrefix.length)
                const parsed = parseInt(seqPart, 10)
                if (!isNaN(parsed)) nextSeq = parsed + 1
            }

            // Pad sequence to at least 3 digits
            const seqStr = String(nextSeq).padStart(3, '0')
            return { nis: `${yearPrefix}${seqStr}` }
        }),
})
