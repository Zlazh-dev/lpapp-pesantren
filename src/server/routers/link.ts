import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../trpc'
import { GUARDIAN_LINK_INVALID_MESSAGE, createGuardianToken, resolveActiveGuardianLink } from '../guardian-link'
import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@prisma/client'
import { formatBillingPeriod } from '@/lib/billing/period'

async function getGuardianInvoices(prisma: PrismaClient, santriId: string) {
    const invoices = await prisma.invoice.findMany({
        where: { santriId },
        orderBy: { issuedAt: 'desc' },
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
            dueAt: true,
            items: {
                orderBy: { sortOrder: 'asc' },
                select: { id: true, label: true, amount: true },
            },
            payments: {
                where: { verifiedAt: { not: null } },
                orderBy: { paidAt: 'desc' },
                select: {
                    id: true,
                    amount: true,
                    method: true,
                    paidAt: true,
                    verifiedAt: true,
                    receipt: { select: { id: true, receiptNo: true, pdfUrl: true } },
                },
            },
            paymentProofs: {
                where: { invoiceId: { not: null } },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    amount: true,
                    imageUrl: true,
                    status: true,
                    note: true,
                    createdAt: true,
                    reviewedAt: true,
                },
            },
        },
    })

    const mappedInvoices = invoices.map((invoice) => {
        const paidAmount = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
        const outstandingAmount = Math.max(invoice.totalAmount - paidAmount, 0)
        const pendingProofCount = invoice.paymentProofs.filter((proof) => proof.status === 'PENDING').length
        const latestProof = invoice.paymentProofs[0] ?? null
        const latestReceiptPayment = invoice.payments.find((payment) => !!payment.receipt) ?? null

        return {
            id: invoice.id,
            code: `INV-${invoice.id.slice(-6).toUpperCase()}`,
            periodKey: invoice.periodKey,
            periodDisplayMode: invoice.periodDisplayMode,
            periodYear: invoice.periodYear,
            periodMonth: invoice.periodMonth,
            hijriYear: invoice.hijriYear,
            hijriMonth: invoice.hijriMonth,
            hijriVariant: invoice.hijriVariant,
            periodLabel: formatBillingPeriod(invoice),
            totalAmount: invoice.totalAmount,
            paidAmount,
            outstandingAmount,
            status: invoice.status,
            dueDate: invoice.dueAt,
            canUploadProof: invoice.status !== 'PAID' && invoice.status !== 'VOID',
            pendingProofCount,
            latestProof,
            items: invoice.items.map((item) => ({
                id: item.id,
                name: item.label,
                amount: item.amount,
            })),
            payments: invoice.payments,
            receiptAvailable: !!latestReceiptPayment,
            receiptPaymentId: latestReceiptPayment?.id ?? null,
            receiptNo: latestReceiptPayment?.receipt?.receiptNo ?? null,
            receiptUrl: latestReceiptPayment?.receipt?.pdfUrl ?? null,
        }
    })

    const totalInvoiced = mappedInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
    const totalPaid = mappedInvoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0)
    const outstanding = Math.max(totalInvoiced - totalPaid, 0)

    const paidInvoiceCount = mappedInvoices.filter((invoice) => invoice.status === 'PAID').length
    const partialInvoiceCount = mappedInvoices.filter((invoice) => invoice.status === 'PARTIAL').length
    const pendingInvoiceCount = mappedInvoices.filter((invoice) => invoice.status === 'PENDING').length

    return {
        billingSummary: {
            totalInvoiced,
            totalPaid,
            outstanding,
            invoiceCount: mappedInvoices.length,
            paidInvoiceCount,
            partialInvoiceCount,
            pendingInvoiceCount,
        },
        invoices: mappedInvoices,
    }
}

export const linkRouter = router({
    generate: protectedProcedure
        .input(z.object({
            santriId: z.string(),
            expiresInDays: z.number().positive().default(30),
        }))
        .mutation(async ({ ctx, input }) => {
            const now = new Date()
            const { token, tokenHash } = createGuardianToken()

            await ctx.prisma.sharedLink.updateMany({
                where: {
                    santriId: input.santriId,
                    revokedAt: null,
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
                data: { revokedAt: now },
            })

            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + input.expiresInDays)

            const created = await ctx.prisma.sharedLink.create({
                data: {
                    santriId: input.santriId,
                    tokenHash,
                    expiresAt,
                },
            })

            return {
                id: created.id,
                token,
                expiresAt: created.expiresAt,
            }
        }),

    resolveToken: publicProcedure
        .input(z.object({ token: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const { santriId } = await resolveActiveGuardianLink(ctx.prisma, input.token)

            const santri = await ctx.prisma.santri.findUnique({
                where: { id: santriId },
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
                                        include: { complex: true },
                                    },
                                },
                            },
                        },
                    },
                },
            })

            if (!santri) {
                throw new TRPCError({ code: 'NOT_FOUND', message: GUARDIAN_LINK_INVALID_MESSAGE })
            }

            const activeAssignment = await ctx.prisma.dormAssignment.findFirst({
                where: { santriId, isActive: true, endAt: null },
                orderBy: { startAt: 'desc' },
                include: {
                    room: {
                        include: {
                            floor: {
                                include: {
                                    building: {
                                        include: { complex: true },
                                    },
                                },
                            },
                        },
                    },
                },
            })

            const room = activeAssignment?.room ?? santri.dormRoom ?? null

            return {
                santri: {
                    id: santri.id,
                    nis: santri.nis,
                    fullName: santri.fullName,
                    gender: santri.gender,
                    birthDate: santri.birthDate,
                    phone: santri.phone,
                    fatherName: santri.fatherName,
                    motherName: santri.motherName,
                    fatherPhone: santri.fatherPhone,
                    motherPhone: santri.motherPhone,
                    address: santri.address,
                    photoUrl: santri.photoUrl,
                    isActive: santri.isActive,
                    classGroup: santri.classGroup
                        ? {
                            id: santri.classGroup.id,
                            name: santri.classGroup.name,
                            grade: {
                                number: santri.classGroup.grade.number,
                                level: {
                                    code: santri.classGroup.grade.level.code,
                                    name: santri.classGroup.grade.level.name,
                                },
                            },
                            schoolYear: santri.classGroup.schoolYear,
                        }
                        : null,
                    currentRoom: room
                        ? {
                            id: String(room.id),
                            name: room.name,
                            complexName: room.floor.building.complex.name,
                            buildingName: room.floor.building.name,
                            floorNumber: room.floor.number,
                        }
                        : null,
                },
                ...await getGuardianInvoices(ctx.prisma, santriId),
            }
        }),

    listInvoicesByToken: publicProcedure
        .input(z.object({ token: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const { santriId } = await resolveActiveGuardianLink(ctx.prisma, input.token)
            return getGuardianInvoices(ctx.prisma, santriId)
        }),

    uploadPaymentProof: publicProcedure
        .input(z.object({
            token: z.string().min(1),
            invoiceId: z.string().min(1),
            amount: z.number().int().positive(),
            imageUrl: z.string().url(),
            note: z.string().max(500).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const link = await resolveActiveGuardianLink(ctx.prisma, input.token)

            const invoice = await ctx.prisma.invoice.findFirst({
                where: { id: input.invoiceId, santriId: link.santriId },
                select: { id: true, status: true },
            })

            if (!invoice) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice tidak ditemukan untuk santri ini.' })
            }
            if (invoice.status === 'PAID') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice sudah lunas.' })
            }
            if (invoice.status === 'VOID') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice sudah dibatalkan.' })
            }

            return ctx.prisma.paymentProof.create({
                data: {
                    invoiceId: invoice.id,
                    amount: input.amount,
                    imageUrl: input.imageUrl,
                    note: input.note,
                    uploadedBy: 'WALI',
                    status: 'PENDING',
                },
                select: {
                    id: true,
                    status: true,
                    createdAt: true,
                },
            })
        }),

    // Legacy shape used by old upload-proof page
    getByToken: publicProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            const { santriId } = await resolveActiveGuardianLink(ctx.prisma, input)
            const santri = await ctx.prisma.santri.findUnique({
                where: { id: santriId },
                include: {
                    bills: {
                        orderBy: { dueDate: 'desc' },
                        take: 20,
                        include: {
                            billingModel: true,
                            paymentProofs: { orderBy: { createdAt: 'desc' }, take: 1 },
                        },
                    },
                },
            })

            if (!santri) {
                throw new TRPCError({ code: 'NOT_FOUND', message: GUARDIAN_LINK_INVALID_MESSAGE })
            }

            return {
                santri: {
                    fullName: santri.fullName,
                    nis: santri.nis,
                },
                bills: santri.bills.map((b) => ({
                    id: b.id,
                    type: b.type,
                    amount: b.amount,
                    paidAmount: b.paidAmount,
                    dueDate: b.dueDate,
                    status: b.status,
                    period: b.period,
                    billingModel: b.billingModel?.name ?? null,
                    latestProofStatus: b.paymentProofs[0]?.status ?? null,
                })),
            }
        }),

    revoke: protectedProcedure
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.sharedLink.update({
                where: { id: input },
                data: { revokedAt: new Date() },
            })
        }),
})
