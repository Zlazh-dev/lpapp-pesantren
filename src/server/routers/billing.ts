import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, pageProtectedProcedure, hasRole, hasAnyPageAccess } from '../trpc'
import { BillStatus } from '@prisma/client'
import { formatBillingPeriod } from '@/lib/billing/period'

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

const santriFinanceProcedure = protectedProcedure.use(({ ctx, next }) => {
    const allowed = hasRole(ctx, 'ADMIN') || hasAnyPageAccess(ctx, ['/keuangan', '/master-data/santri'])
    if (!allowed) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Akses ditolak. Anda tidak memiliki akses ke ringkasan finansial santri',
        })
    }
    return next({ ctx })
})

function getInvoiceStatus(totalAmount: number, paidAmount: number): 'PENDING' | 'PARTIAL' | 'PAID' {
    if (paidAmount >= totalAmount) return 'PAID'
    if (paidAmount > 0) return 'PARTIAL'
    return 'PENDING'
}

export const billingRouter = router({
    dashboard: billingRoleProcedure('ADMIN')
        .input(
            z.object({
                period: z.string().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const where = {
                ...(input?.period && { period: input.period }),
            }

            const [totalBills, paidBills, pendingBills, partialBills] = await Promise.all([
                ctx.prisma.bill.aggregate({ where, _sum: { amount: true }, _count: true }),
                ctx.prisma.bill.aggregate({ where: { ...where, status: 'PAID' }, _sum: { amount: true, paidAmount: true }, _count: true }),
                ctx.prisma.bill.aggregate({ where: { ...where, status: 'PENDING' }, _sum: { amount: true }, _count: true }),
                ctx.prisma.bill.aggregate({ where: { ...where, status: 'PARTIAL' }, _sum: { amount: true, paidAmount: true }, _count: true }),
            ])

            const perKamar = await ctx.prisma.bill.groupBy({
                by: ['status'],
                where: { santri: { dormRoomId: { not: null } } },
                _sum: { amount: true, paidAmount: true },
                _count: true,
            })

            const perType = await ctx.prisma.bill.groupBy({
                by: ['type'],
                _sum: { amount: true, paidAmount: true },
                _count: true,
            })

            return {
                summary: {
                    totalAmount: totalBills._sum.amount ?? 0,
                    totalCount: totalBills._count,
                    paidAmount: paidBills._sum.paidAmount ?? 0,
                    paidCount: paidBills._count,
                    pendingAmount: pendingBills._sum.amount ?? 0,
                    pendingCount: pendingBills._count,
                    partialAmount: partialBills._sum.amount ?? 0,
                    partialPaidAmount: partialBills._sum.paidAmount ?? 0,
                    partialCount: partialBills._count,
                },
                perKamar,
                perType,
            }
        }),

    getSantriFinancialSummary: santriFinanceProcedure
        .input(z.object({ santriId: z.string() }))
        .query(async ({ ctx, input }) => {
            const invoices = await ctx.prisma.invoice.findMany({
                where: { santriId: input.santriId },
                select: {
                    id: true,
                    totalAmount: true,
                    status: true,
                    payments: {
                        select: {
                            amount: true,
                            verifiedAt: true,
                        },
                    },
                },
            })

            const totalInvoiced = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
            const totalPaid = invoices.reduce(
                (sum, invoice) =>
                    sum +
                    invoice.payments
                        .filter((payment) => payment.verifiedAt !== null)
                        .reduce((paymentSum, payment) => paymentSum + payment.amount, 0),
                0
            )

            const paidInvoiceCount = invoices.filter((invoice) => invoice.status === 'PAID').length
            const partialInvoiceCount = invoices.filter((invoice) => invoice.status === 'PARTIAL').length
            const pendingInvoiceCount = invoices.filter((invoice) => invoice.status === 'PENDING').length

            return {
                totalInvoiced,
                totalPaid,
                outstanding: Math.max(totalInvoiced - totalPaid, 0),
                invoiceCount: invoices.length,
                paidInvoiceCount,
                partialInvoiceCount,
                pendingInvoiceCount,
            }
        }),

    listPaymentProofs: billingRoleProcedure('ADMIN')
        .input(z.object({
            status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
            page: z.number().min(1).default(1),
            limit: z.number().min(1).max(100).default(20),
        }).optional())
        .query(async ({ ctx, input }) => {
            const { status, page = 1, limit = 20 } = input ?? {}

            const where = {
                invoiceId: { not: null as null | string },
                ...(status ? { status } : {}),
            }

            const [proofs, total] = await Promise.all([
                ctx.prisma.paymentProof.findMany({
                    where,
                    include: {
                        invoice: {
                            include: {
                                santri: { select: { id: true, fullName: true, nis: true } },
                                billingModel: { select: { name: true } },
                                payments: {
                                    where: { verifiedAt: { not: null } },
                                    select: { amount: true },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                ctx.prisma.paymentProof.count({ where }),
            ])

            return {
                data: proofs.map((proof) => {
                    const paidAmount = proof.invoice?.payments.reduce((sum, payment) => sum + payment.amount, 0) ?? 0
                    const totalAmount = proof.invoice?.totalAmount ?? 0
                    return {
                        ...proof,
                        invoicePaidAmount: paidAmount,
                        invoiceOutstandingAmount: Math.max(totalAmount - paidAmount, 0),
                    }
                }),
                total,
                page,
                totalPages: Math.ceil(total / limit),
            }
        }),

    verifyPaymentProof: billingRoleProcedure('ADMIN')
        .input(z.object({
            proofId: z.string(),
            action: z.enum(['APPROVE', 'REJECT']),
            note: z.string().max(500).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const proof = await ctx.prisma.paymentProof.findUnique({
                where: { id: input.proofId },
                include: {
                    invoice: {
                        include: {
                            payments: { where: { verifiedAt: { not: null } }, select: { amount: true } },
                            items: { orderBy: { sortOrder: 'asc' } },
                            santri: { select: { fullName: true, nis: true, classGroup: { select: { name: true } } } },
                            billingModel: { select: { name: true } },
                        },
                    },
                },
            })

            if (!proof || !proof.invoiceId || !proof.invoice) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Bukti pembayaran tidak ditemukan.' })
            }
            const proofInvoice = proof.invoice

            if (proof.status !== 'PENDING') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bukti pembayaran ini sudah diproses.' })
            }
            if (proofInvoice.status === 'VOID') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice sudah dibatalkan.' })
            }

            if (input.action === 'REJECT') {
                return ctx.prisma.paymentProof.update({
                    where: { id: proof.id },
                    data: {
                        status: 'REJECTED',
                        note: input.note ?? proof.note,
                        reviewedAt: new Date(),
                        reviewedBy: ctx.session.user.username,
                    },
                })
            }

            const now = new Date()

            return ctx.prisma.$transaction(async (tx) => {
                const payment = await tx.payment.create({
                    data: {
                        invoiceId: proof.invoiceId!,
                        amount: proof.amount,
                        method: 'TRANSFER',
                        proofUrl: proof.imageUrl,
                        note: input.note ?? proof.note ?? 'Verifikasi bukti pembayaran wali santri',
                        verifiedByUserId: ctx.session.user.id,
                        verifiedAt: now,
                    },
                })

                const paidAgg = await tx.payment.aggregate({
                    where: { invoiceId: proof.invoiceId!, verifiedAt: { not: null } },
                    _sum: { amount: true },
                })
                const paidAmount = paidAgg._sum.amount ?? 0
                const newStatus = getInvoiceStatus(proofInvoice.totalAmount, paidAmount)

                const invoice = await tx.invoice.update({
                    where: { id: proof.invoiceId! },
                    data: { status: newStatus },
                })

                const updatedProof = await tx.paymentProof.update({
                    where: { id: proof.id },
                    data: {
                        status: 'APPROVED',
                        note: input.note ?? proof.note,
                        reviewedAt: now,
                        reviewedBy: ctx.session.user.username,
                    },
                })

                const existingReceipt = await tx.receipt.findUnique({ where: { paymentId: payment.id } })
                let receipt = existingReceipt
                if (!existingReceipt) {
                    const prefix = `RCPT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
                    const lastReceipt = await tx.receipt.findFirst({
                        where: { receiptNo: { startsWith: prefix } },
                        orderBy: { receiptNo: 'desc' },
                    })
                    const nextNum = lastReceipt ? parseInt(lastReceipt.receiptNo.split('-')[2]) + 1 : 1
                    const receiptNo = `${prefix}-${String(nextNum).padStart(4, '0')}`

                    receipt = await tx.receipt.create({
                        data: {
                            paymentId: payment.id,
                            receiptNo,
                            snapshot: {
                                santriName: proofInvoice.santri.fullName,
                                santriNis: proofInvoice.santri.nis,
                                kelasName: proofInvoice.santri.classGroup?.name ?? null,
                                modelName: proofInvoice.billingModel.name,
                                periodKey: proofInvoice.periodKey,
                                periodDisplayMode: proofInvoice.periodDisplayMode,
                                periodYear: proofInvoice.periodYear,
                                periodMonth: proofInvoice.periodMonth,
                                hijriYear: proofInvoice.hijriYear,
                                hijriMonth: proofInvoice.hijriMonth,
                                hijriVariant: proofInvoice.hijriVariant,
                                periodLabel: formatBillingPeriod(proofInvoice),
                                items: proofInvoice.items.map((item) => ({ label: item.label, amount: item.amount })),
                                totalAmount: proofInvoice.totalAmount,
                                paymentAmount: payment.amount,
                                paymentMethod: payment.method,
                                paidAt: payment.paidAt,
                            },
                        },
                    })
                }

                return { proof: updatedProof, payment, invoice, receipt }
            })
        }),

    listBySantri: billingProcedure
        .input(z.object({
            santriId: z.string(),
            status: z.nativeEnum(BillStatus).optional(),
        }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.bill.findMany({
                where: {
                    santriId: input.santriId,
                    ...(input.status && { status: input.status }),
                },
                orderBy: { dueDate: 'desc' },
                include: {
                    santri: { select: { fullName: true, nis: true } },
                    billingModel: true,
                    paymentProofs: { orderBy: { createdAt: 'desc' } },
                },
            })
        }),

    listAll: billingRoleProcedure('ADMIN', 'STAF_PENDATAAN')
        .input(
            z.object({
                status: z.nativeEnum(BillStatus).optional(),
                type: z.string().optional(),
                billingModelId: z.string().optional(),
                search: z.string().optional(),
                page: z.number().min(1).default(1),
                limit: z.number().min(1).max(100).default(20),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const { status, type, billingModelId, search, page = 1, limit = 20 } = input ?? {}

            const where = {
                ...(status && { status }),
                ...(type && { type }),
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

            const [bills, total] = await Promise.all([
                ctx.prisma.bill.findMany({
                    where,
                    include: {
                        santri: { select: { fullName: true, nis: true, dormRoom: { select: { name: true } }, classGroup: { select: { name: true } } } },
                        billingModel: true,
                        paymentProofs: { orderBy: { createdAt: 'desc' }, take: 1 },
                    },
                    orderBy: { dueDate: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                ctx.prisma.bill.count({ where }),
            ])

            return { data: bills, total, page, totalPages: Math.ceil(total / limit) }
        }),

    create: billingRoleProcedure('ADMIN')
        .input(
            z.object({
                santriId: z.string(),
                type: z.string().min(1),
                amount: z.number().positive(),
                dueDate: z.string(),
                period: z.string().optional(),
                notes: z.string().optional(),
                billingModelId: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { dueDate, ...rest } = input
            return ctx.prisma.bill.create({
                data: { ...rest, dueDate: new Date(dueDate) },
            })
        }),

    createBatch: billingRoleProcedure('ADMIN')
        .input(
            z.object({
                santriIds: z.array(z.string()).min(1),
                type: z.string().min(1),
                amount: z.number().positive(),
                dueDate: z.string(),
                period: z.string().optional(),
                notes: z.string().optional(),
                billingModelId: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { santriIds, dueDate, ...rest } = input
            return ctx.prisma.bill.createMany({
                data: santriIds.map((santriId) => ({
                    santriId,
                    ...rest,
                    dueDate: new Date(dueDate),
                })),
            })
        }),

    updatePayment: billingRoleProcedure('ADMIN')
        .input(
            z.object({
                id: z.string(),
                paidAmount: z.number().min(0),
                notes: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const bill = await ctx.prisma.bill.findUnique({ where: { id: input.id } })
            if (!bill) throw new Error('Tagihan tidak ditemukan')

            const newPaidAmount = input.paidAmount
            let status: BillStatus = 'PENDING'
            if (newPaidAmount >= bill.amount) {
                status = 'PAID'
            } else if (newPaidAmount > 0) {
                status = 'PARTIAL'
            }

            return ctx.prisma.bill.update({
                where: { id: input.id },
                data: {
                    paidAmount: newPaidAmount,
                    status,
                    paidDate: status === 'PAID' ? new Date() : null,
                    notes: input.notes,
                },
            })
        }),

    delete: billingRoleProcedure('ADMIN')
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.bill.delete({ where: { id: input } })
        }),
})
