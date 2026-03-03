import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, pageProtectedProcedure, hasRole } from '../trpc'
import type { Prisma } from '@prisma/client'
import { parseGregorianPeriodKey } from '@/lib/billing/period'

const billingProcedure = pageProtectedProcedure('/keuangan')
const billingRoleProcedure = (...roles: string[]) =>
    billingProcedure.use(({ ctx, next }) => {
        const hasAccess = roles.some(role => hasRole(ctx, role))
        if (!hasAccess) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: `Akses ditolak. Role yang diperlukan: ${roles.join(', ')}`,
            })
        }
        return next({ ctx })
    })

export const invoiceRouter = router({
    // ========== Generate invoices from a BillingModel ==========
    generateFromModel: billingRoleProcedure('ADMIN')
        .input(z.object({
            billingModelId: z.string(),
            periodKey: z.string().min(1, 'Period wajib diisi'), // e.g. "2025-04"
            periodDisplayMode: z.enum(['GREGORIAN', 'HIJRI']).default('GREGORIAN'),
            periodYear: z.number().int().min(1).optional(),
            periodMonth: z.number().int().min(1).max(12).optional(),
            hijriYear: z.number().int().min(1).optional(),
            hijriMonth: z.number().int().min(1).max(12).optional(),
            hijriVariant: z.string().min(1).optional(),
            dueAt: z.string().optional(),
            dryRun: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const model = await ctx.prisma.billingModel.findUnique({
                where: { id: input.billingModelId },
                include: { items: { orderBy: { sortOrder: 'asc' } }, scopes: true },
            })
            if (!model) throw new Error('Model tagihan tidak ditemukan')
            if (!model.isActive) throw new Error('Model tagihan tidak aktif')

            // Calculate total from items (or fallback to defaultAmount)
            const totalAmount = model.items.length > 0
                ? model.items.reduce((sum, item) => sum + item.amount, 0)
                : (model.defaultAmount ?? 0)
            if (totalAmount <= 0) throw new Error('Total tagihan harus > 0. Tambahkan item rincian.')

            const parsedPeriod = parseGregorianPeriodKey(input.periodKey)
            const periodYear = input.periodYear ?? parsedPeriod.periodYear
            const periodMonth = input.periodMonth ?? parsedPeriod.periodMonth

            if (model.periodType === 'bulanan' && (!periodYear || !periodMonth)) {
                throw new Error('Periode bulanan memerlukan periodYear dan periodMonth Gregorian.')
            }

            if (input.periodDisplayMode === 'HIJRI' && (!input.hijriYear || !input.hijriMonth)) {
                throw new Error('Mode HIJRI memerlukan hijriYear dan hijriMonth.')
            }

            // Resolve target students based on scopes
            const studentWhere = await resolveScopeFilter(ctx.prisma, model.scopes)
            const students = await ctx.prisma.santri.findMany({
                where: { isActive: true, ...studentWhere },
                select: { id: true },
            })

            if (input.dryRun) {
                // Check how many already exist
                const existing = await ctx.prisma.invoice.count({
                    where: {
                        billingModelId: input.billingModelId,
                        periodKey: input.periodKey,
                        santriId: { in: students.map(s => s.id) },
                    },
                })
                return {
                    dryRun: true,
                    targetCount: students.length,
                    existingCount: existing,
                    wouldCreate: students.length - existing,
                    totalAmount,
                }
            }

            // Get existing invoices to skip
            const existingInvoices = await ctx.prisma.invoice.findMany({
                where: {
                    billingModelId: input.billingModelId,
                    periodKey: input.periodKey,
                    santriId: { in: students.map(s => s.id) },
                },
                select: { santriId: true },
            })
            const existingSet = new Set(existingInvoices.map(i => i.santriId))
            const newStudents = students.filter(s => !existingSet.has(s.id))

            if (newStudents.length === 0) {
                return { createdCount: 0, skippedCount: students.length, totalAmount }
            }

            // Bulk create in transaction
            const itemsData = model.items.map(item => ({
                label: item.label,
                amount: item.amount,
                sortOrder: item.sortOrder,
            }))

            await ctx.prisma.$transaction(async (tx) => {
                for (const student of newStudents) {
                    await tx.invoice.create({
                        data: {
                            santriId: student.id,
                            billingModelId: input.billingModelId,
                            periodKey: input.periodKey,
                            periodDisplayMode: input.periodDisplayMode,
                            periodYear: periodYear ?? undefined,
                            periodMonth: periodMonth ?? undefined,
                            hijriYear: input.periodDisplayMode === 'HIJRI' ? input.hijriYear : null,
                            hijriMonth: input.periodDisplayMode === 'HIJRI' ? input.hijriMonth : null,
                            hijriVariant: input.periodDisplayMode === 'HIJRI' ? (input.hijriVariant ?? 'indonesia') : null,
                            totalAmount,
                            dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
                            items: itemsData.length > 0 ? { createMany: { data: itemsData } } : undefined,
                        },
                    })
                }
            })

            return {
                createdCount: newStudents.length,
                skippedCount: existingSet.size,
                totalAmount,
            }
        }),

    // ========== List invoices (global, with filters) ==========
    list: billingRoleProcedure('ADMIN', 'STAF_PENDATAAN')
        .input(z.object({
            periodKey: z.string().optional(),
            periodDisplayMode: z.enum(['GREGORIAN', 'HIJRI']).optional(),
            periodYear: z.number().int().min(1).optional(),
            periodMonth: z.number().int().min(1).max(12).optional(),
            hijriYear: z.number().int().min(1).optional(),
            hijriMonth: z.number().int().min(1).max(12).optional(),
            status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'VOID']).optional(),
            billingModelId: z.string().optional(),
            search: z.string().optional(),
            page: z.number().min(1).default(1),
            limit: z.number().min(1).max(100).default(20),
        }).optional())
        .query(async ({ ctx, input }) => {
            const {
                periodKey,
                periodDisplayMode,
                periodYear,
                periodMonth,
                hijriYear,
                hijriMonth,
                status,
                billingModelId,
                search,
                page = 1,
                limit = 20,
            } = input ?? {}

            const where: Prisma.InvoiceWhereInput = {
                ...(periodKey && { periodKey }),
                ...(periodDisplayMode && { periodDisplayMode }),
                ...(periodDisplayMode !== 'HIJRI' && periodYear ? { periodYear } : {}),
                ...(periodDisplayMode !== 'HIJRI' && periodMonth ? { periodMonth } : {}),
                ...(periodDisplayMode === 'HIJRI' && hijriYear ? { hijriYear } : {}),
                ...(periodDisplayMode === 'HIJRI' && hijriMonth ? { hijriMonth } : {}),
                ...(status && { status }),
                ...(billingModelId && { billingModelId }),
                ...(search && {
                    santri: {
                        OR: [
                            { fullName: { contains: search, mode: 'insensitive' as const } },
                            { nis: { contains: search, mode: 'insensitive' as const } },
                        ],
                    },
                }),
            }

            const [invoices, total] = await Promise.all([
                ctx.prisma.invoice.findMany({
                    where,
                    include: {
                        santri: { select: { fullName: true, nis: true, dormRoom: { select: { name: true } }, classGroup: { select: { name: true } } } },
                        billingModel: { select: { name: true, periodType: true } },
                        _count: { select: { payments: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                ctx.prisma.invoice.count({ where }),
            ])

            // Compute paid amounts
            const data = await Promise.all(invoices.map(async (inv) => {
                const paidAgg = await ctx.prisma.payment.aggregate({
                    where: { invoiceId: inv.id, verifiedAt: { not: null } },
                    _sum: { amount: true },
                })
                return { ...inv, paidAmount: paidAgg._sum.amount ?? 0 }
            }))

            return { data, total, page, totalPages: Math.ceil(total / limit) }
        }),

    // ========== Get invoices by student ==========
    getByStudent: billingProcedure
        .input(z.string())
        .query(async ({ ctx, input: santriId }) => {
            const invoices = await ctx.prisma.invoice.findMany({
                where: { santriId },
                include: {
                    billingModel: { select: { name: true, periodType: true } },
                    items: { orderBy: { sortOrder: 'asc' } },
                    payments: {
                        orderBy: { paidAt: 'desc' },
                        include: { receipt: true },
                    },
                },
                orderBy: [{ periodKey: 'desc' }, { createdAt: 'desc' }],
            })
            return invoices
        }),

    // ========== Get single invoice detail ==========
    getDetail: billingProcedure
        .input(z.string())
        .query(async ({ ctx, input: invoiceId }) => {
            const invoice = await ctx.prisma.invoice.findUnique({
                where: { id: invoiceId },
                include: {
                    santri: { select: { fullName: true, nis: true, dormRoom: { select: { name: true } }, classGroup: { select: { name: true } } } },
                    billingModel: { select: { name: true, periodType: true } },
                    items: { orderBy: { sortOrder: 'asc' } },
                    payments: {
                        orderBy: { paidAt: 'desc' },
                        include: { receipt: true },
                    },
                },
            })
            if (!invoice) throw new Error('Invoice tidak ditemukan')
            return invoice
        }),

    // ========== Dashboard stats ==========
    stats: billingRoleProcedure('ADMIN')
        .input(z.object({
            periodKey: z.string().optional(),
            periodDisplayMode: z.enum(['GREGORIAN', 'HIJRI']).optional(),
            periodYear: z.number().int().min(1).optional(),
            periodMonth: z.number().int().min(1).max(12).optional(),
            hijriYear: z.number().int().min(1).optional(),
            hijriMonth: z.number().int().min(1).max(12).optional(),
        }).optional())
        .query(async ({ ctx, input }) => {
            const where: Prisma.InvoiceWhereInput = {
                ...(input?.periodKey ? { periodKey: input.periodKey } : {}),
                ...(input?.periodDisplayMode ? { periodDisplayMode: input.periodDisplayMode } : {}),
                ...(input?.periodDisplayMode !== 'HIJRI' && input?.periodYear ? { periodYear: input.periodYear } : {}),
                ...(input?.periodDisplayMode !== 'HIJRI' && input?.periodMonth ? { periodMonth: input.periodMonth } : {}),
                ...(input?.periodDisplayMode === 'HIJRI' && input?.hijriYear ? { hijriYear: input.hijriYear } : {}),
                ...(input?.periodDisplayMode === 'HIJRI' && input?.hijriMonth ? { hijriMonth: input.hijriMonth } : {}),
            }

            const [total, paid, pending, partial] = await Promise.all([
                ctx.prisma.invoice.aggregate({ where, _sum: { totalAmount: true }, _count: true }),
                ctx.prisma.invoice.aggregate({ where: { ...where, status: 'PAID' }, _sum: { totalAmount: true }, _count: true }),
                ctx.prisma.invoice.aggregate({ where: { ...where, status: 'PENDING' }, _sum: { totalAmount: true }, _count: true }),
                ctx.prisma.invoice.aggregate({ where: { ...where, status: 'PARTIAL' }, _sum: { totalAmount: true }, _count: true }),
            ])

            // Get total paid amount from payments
            const paidAmount = await ctx.prisma.payment.aggregate({
                where: { invoice: where, verifiedAt: { not: null } },
                _sum: { amount: true },
            })

            return {
                totalAmount: total._sum.totalAmount ?? 0,
                totalCount: total._count,
                paidAmount: paidAmount._sum.amount ?? 0,
                paidCount: paid._count,
                pendingAmount: pending._sum.totalAmount ?? 0,
                pendingCount: pending._count,
                partialAmount: partial._sum.totalAmount ?? 0,
                partialCount: partial._count,
            }
        }),

    // ========== Rekap Pembayaran (aggregation for Rekap tab) ==========
    rekapPembayaran: billingRoleProcedure('ADMIN')
        .input(z.object({
            periodDisplayMode: z.enum(['GREGORIAN', 'HIJRI']).optional(),
            periodYear: z.number().int().min(1).optional(),
            periodMonth: z.number().int().min(1).max(12).optional(),
            hijriYear: z.number().int().min(1).optional(),
            hijriMonth: z.number().int().min(1).max(12).optional(),
        }).optional())
        .query(async ({ ctx, input }) => {
            const invoiceWhere: Prisma.InvoiceWhereInput = {
                ...(input?.periodDisplayMode ? { periodDisplayMode: input.periodDisplayMode } : {}),
                ...(input?.periodDisplayMode !== 'HIJRI' && input?.periodYear ? { periodYear: input.periodYear } : {}),
                ...(input?.periodDisplayMode !== 'HIJRI' && input?.periodMonth ? { periodMonth: input.periodMonth } : {}),
                ...(input?.periodDisplayMode === 'HIJRI' && input?.hijriYear ? { hijriYear: input.hijriYear } : {}),
                ...(input?.periodDisplayMode === 'HIJRI' && input?.hijriMonth ? { hijriMonth: input.hijriMonth } : {}),
            }

            const [invoiceAgg, invoiceCount, verifiedPayments, allPayments] = await Promise.all([
                ctx.prisma.invoice.aggregate({
                    where: invoiceWhere,
                    _sum: { totalAmount: true },
                }),
                ctx.prisma.invoice.count({ where: invoiceWhere }),
                ctx.prisma.payment.aggregate({
                    where: { invoice: invoiceWhere, verifiedAt: { not: null } },
                    _sum: { amount: true },
                    _count: true,
                }),
                ctx.prisma.payment.aggregate({
                    where: { invoice: invoiceWhere },
                    _sum: { amount: true },
                    _count: true,
                }),
            ])

            const totalTagihan = invoiceAgg._sum.totalAmount ?? 0
            const totalDibayar = verifiedPayments._sum.amount ?? 0

            return {
                totalTagihan,
                totalDibayar,
                outstanding: Math.max(totalTagihan - totalDibayar, 0),
                invoiceCount,
                paymentCount: allPayments._count,
                verifiedPaymentCount: verifiedPayments._count,
                pendingPaymentCount: allPayments._count - verifiedPayments._count,
            }
        }),
})

// ========== Helper: Resolve scope filter for targeting students ==========
async function resolveScopeFilter(
    prisma: any,
    scopes: Array<{ scopeType: string; scopeRefId: string | null; scopeValue: string | null; include: boolean }>
): Promise<Prisma.SantriWhereInput> {
    if (!scopes.length || scopes.some(s => s.scopeType === 'ALL')) {
        return {} // ALL students
    }

    const conditions: Prisma.SantriWhereInput[] = []

    for (const scope of scopes) {
        if (!scope.include) continue

        switch (scope.scopeType) {
            case 'ACADEMIC_LEVEL':
                if (scope.scopeRefId) {
                    // Find all grades in this level, then all class groups
                    const grades = await prisma.grade.findMany({
                        where: { levelId: scope.scopeRefId },
                        select: { id: true },
                    })
                    const classGroups = await prisma.classGroup.findMany({
                        where: { gradeId: { in: grades.map((g: any) => g.id) } },
                        select: { id: true },
                    })
                    conditions.push({ classGroupId: { in: classGroups.map((c: any) => c.id) } })
                }
                break
            case 'GRADE':
                if (scope.scopeRefId) {
                    const classGroups = await prisma.classGroup.findMany({
                        where: { gradeId: scope.scopeRefId },
                        select: { id: true },
                    })
                    conditions.push({ classGroupId: { in: classGroups.map((c: any) => c.id) } })
                }
                break
            case 'CLASSGROUP':
                if (scope.scopeRefId) {
                    conditions.push({ classGroupId: scope.scopeRefId })
                }
                break
            case 'ROOM':
                if (scope.scopeRefId) {
                    conditions.push({ dormRoomId: parseInt(scope.scopeRefId) })
                }
                break
            case 'GENDER':
                if (scope.scopeValue) {
                    conditions.push({ gender: scope.scopeValue })
                }
                break
        }
    }

    if (conditions.length === 0) return {}
    if (conditions.length === 1) return conditions[0]
    return { OR: conditions }
}
