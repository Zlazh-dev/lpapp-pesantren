import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, pageProtectedProcedure, hasRole, publicProcedure } from '../trpc'
import { resolveActiveGuardianLink } from '../guardian-link'
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

export const paymentRouter = router({
    // ========== Create payment for an invoice ==========
    create: billingRoleProcedure('ADMIN')
        .input(z.object({
            invoiceId: z.string(),
            amount: z.number().positive('Nominal harus > 0'),
            method: z.enum(['CASH', 'TRANSFER', 'OTHER']).default('CASH'),
            proofUrl: z.string().url().optional(),
            proofPublicId: z.string().optional(),
            note: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const invoice = await ctx.prisma.invoice.findUnique({
                where: { id: input.invoiceId },
                include: { payments: { select: { amount: true, verifiedAt: true } } },
            })
            if (!invoice) throw new Error('Invoice tidak ditemukan')
            if (invoice.status === 'VOID') throw new Error('Invoice sudah dibatalkan')

            const currentVerifiedPaid = invoice.payments
                .filter((p) => p.verifiedAt !== null)
                .reduce((sum, p) => sum + p.amount, 0)
            const willAutoVerify = input.method === 'CASH'
            const newVerifiedTotal = currentVerifiedPaid + (willAutoVerify ? input.amount : 0)
            const remaining = invoice.totalAmount - newVerifiedTotal

            // Create payment
            const payment = await ctx.prisma.payment.create({
                data: {
                    invoiceId: input.invoiceId,
                    amount: input.amount,
                    method: input.method as any,
                    proofUrl: input.proofUrl,
                    proofPublicId: input.proofPublicId,
                    note: input.note,
                    // Auto-verify for CASH & admin uploads
                    ...(input.method === 'CASH' ? {
                        verifiedByUserId: ctx.session.user.id,
                        verifiedAt: new Date(),
                    } : {}),
                },
            })

            // Update invoice status
            let newStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 'PENDING'
            if (newVerifiedTotal >= invoice.totalAmount) {
                newStatus = 'PAID'
            } else if (newVerifiedTotal > 0) {
                newStatus = 'PARTIAL'
            }

            await ctx.prisma.invoice.update({
                where: { id: input.invoiceId },
                data: { status: newStatus },
            })

            return { payment, newStatus, paidTotal: newVerifiedTotal, remaining: Math.max(0, remaining) }
        }),

    // ========== Upload payment proof via public portal ==========
    uploadViaPortal: publicProcedure
        .input(z.object({
            token: z.string(),
            invoiceId: z.string(),
            amount: z.number().positive(),
            proofUrl: z.string().url(),
            proofPublicId: z.string().optional(),
            note: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const link = await resolveActiveGuardianLink(ctx.prisma, input.token)

            // Validate invoice belongs to this santri
            const invoice = await ctx.prisma.invoice.findFirst({
                where: { id: input.invoiceId, santriId: link.santriId },
            })
            if (!invoice) throw new Error('Invoice tidak ditemukan untuk santri ini')
            if (invoice.status === 'VOID') throw new Error('Invoice sudah dibatalkan')

            // Create payment (unverified, method=TRANSFER)
            const payment = await ctx.prisma.payment.create({
                data: {
                    invoiceId: input.invoiceId,
                    amount: input.amount,
                    method: 'TRANSFER',
                    proofUrl: input.proofUrl,
                    proofPublicId: input.proofPublicId,
                    note: input.note ?? 'Upload oleh wali santri',
                },
            })

            // Recompute status
            const paidAgg = await ctx.prisma.payment.aggregate({
                where: { invoiceId: input.invoiceId, verifiedAt: { not: null } },
                _sum: { amount: true },
            })
            const paidTotal = paidAgg._sum.amount ?? 0
            let newStatus: 'PENDING' | 'PARTIAL' | 'PAID' = paidTotal >= invoice.totalAmount ? 'PAID' : paidTotal > 0 ? 'PARTIAL' : 'PENDING'

            await ctx.prisma.invoice.update({
                where: { id: input.invoiceId },
                data: { status: newStatus },
            })

            return payment
        }),

    // ========== Verify a payment ==========
    verify: billingRoleProcedure('ADMIN')
        .input(z.object({
            paymentId: z.string(),
            verified: z.boolean(),
            note: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const payment = await ctx.prisma.payment.findUnique({ where: { id: input.paymentId } })
            if (!payment) throw new Error('Pembayaran tidak ditemukan')

            return ctx.prisma.$transaction(async (tx) => {
                const updated = input.verified
                    ? await tx.payment.update({
                        where: { id: input.paymentId },
                        data: {
                            verifiedByUserId: ctx.session.user.id,
                            verifiedAt: new Date(),
                            note: input.note ?? payment.note,
                        },
                    })
                    : await tx.payment.update({
                        where: { id: input.paymentId },
                        data: {
                            verifiedByUserId: null,
                            verifiedAt: null,
                            note: input.note ?? 'Ditolak',
                        },
                    })

                const invoice = await tx.invoice.findUnique({
                    where: { id: payment.invoiceId },
                    select: { id: true, totalAmount: true },
                })
                if (!invoice) return updated

                const paidAgg = await tx.payment.aggregate({
                    where: { invoiceId: invoice.id, verifiedAt: { not: null } },
                    _sum: { amount: true },
                })
                const paidTotal = paidAgg._sum.amount ?? 0
                const newStatus: 'PENDING' | 'PARTIAL' | 'PAID' =
                    paidTotal >= invoice.totalAmount ? 'PAID' : paidTotal > 0 ? 'PARTIAL' : 'PENDING'

                await tx.invoice.update({
                    where: { id: invoice.id },
                    data: { status: newStatus },
                })

                return updated
            })
        }),

    // ========== List recent payments (for monitoring) ==========
    listRecent: billingRoleProcedure('ADMIN')
        .input(z.object({
            verified: z.boolean().optional(),
            method: z.enum(['CASH', 'TRANSFER', 'OTHER']).optional(),
            page: z.number().min(1).default(1),
            limit: z.number().min(1).max(100).default(20),
        }).optional())
        .query(async ({ ctx, input }) => {
            const { verified, method, page = 1, limit = 20 } = input ?? {}

            const where: any = {
                ...(method && { method }),
                ...(verified === true && { verifiedAt: { not: null } }),
                ...(verified === false && { verifiedAt: null }),
            }

            const [payments, total] = await Promise.all([
                ctx.prisma.payment.findMany({
                    where,
                    include: {
                        invoice: {
                            select: {
                                id: true,
                                periodKey: true,
                                periodDisplayMode: true,
                                periodYear: true,
                                periodMonth: true,
                                hijriYear: true,
                                hijriMonth: true,
                                hijriVariant: true,
                                totalAmount: true,
                                status: true,
                                items: { select: { label: true, amount: true }, orderBy: { sortOrder: 'asc' } },
                                santri: { select: { fullName: true, nis: true } },
                                billingModel: { select: { name: true } },
                            },
                        },
                        receipt: { select: { id: true, receiptNo: true, pdfUrl: true, generatedAt: true } },
                    },
                    orderBy: { paidAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                ctx.prisma.payment.count({ where }),
            ])

            return { data: payments, total, page, totalPages: Math.ceil(total / limit) }
        }),

    // ========== Pending verification count ==========
    pendingCount: billingRoleProcedure('ADMIN')
        .query(async ({ ctx }) => {
            return ctx.prisma.payment.count({ where: { verifiedAt: null, proofUrl: { not: null } } })
        }),

    // ========== Generate receipt ==========
    generateReceipt: billingRoleProcedure('ADMIN')
        .input(z.string()) // paymentId
        .mutation(async ({ ctx, input: paymentId }) => {
            // Check if receipt already exists
            const existing = await ctx.prisma.receipt.findUnique({ where: { paymentId } })
            if (existing) return existing

            const payment = await ctx.prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    invoice: {
                        include: {
                            santri: { select: { fullName: true, nis: true, classGroup: { select: { name: true } } } },
                            billingModel: { select: { name: true } },
                            items: { orderBy: { sortOrder: 'asc' } },
                        },
                    },
                },
            })
            if (!payment) throw new Error('Pembayaran tidak ditemukan')

            // Generate receipt number: RCPT-YYYYMM-XXXX
            const now = new Date()
            const prefix = `RCPT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
            const lastReceipt = await ctx.prisma.receipt.findFirst({
                where: { receiptNo: { startsWith: prefix } },
                orderBy: { receiptNo: 'desc' },
            })
            const nextNum = lastReceipt
                ? parseInt(lastReceipt.receiptNo.split('-')[2]) + 1
                : 1
            const receiptNo = `${prefix}-${String(nextNum).padStart(4, '0')}`

            const receipt = await ctx.prisma.receipt.create({
                data: {
                    paymentId,
                    receiptNo,
                    snapshot: {
                        santriName: payment.invoice.santri.fullName,
                        santriNis: payment.invoice.santri.nis,
                        kelasName: payment.invoice.santri.classGroup?.name ?? null,
                        modelName: payment.invoice.billingModel.name,
                        periodKey: payment.invoice.periodKey,
                        periodDisplayMode: payment.invoice.periodDisplayMode,
                        periodYear: payment.invoice.periodYear,
                        periodMonth: payment.invoice.periodMonth,
                        hijriYear: payment.invoice.hijriYear,
                        hijriMonth: payment.invoice.hijriMonth,
                        hijriVariant: payment.invoice.hijriVariant,
                        periodLabel: formatBillingPeriod(payment.invoice),
                        items: payment.invoice.items.map(i => ({ label: i.label, amount: i.amount })),
                        totalAmount: payment.invoice.totalAmount,
                        paymentAmount: payment.amount,
                        paymentMethod: payment.method,
                        paidAt: payment.paidAt,
                    },
                },
            })

            return receipt
        }),
})
