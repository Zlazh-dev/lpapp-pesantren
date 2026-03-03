import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, pageProtectedProcedure, hasRole, publicProcedure } from '../trpc'
import { resolveActiveGuardianLink } from '../guardian-link'

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

export const paymentProofRouter = router({
    listByBill: billingRoleProcedure('ADMIN')
        .input(z.string())
        .query(async ({ ctx, input }) => {
            return ctx.prisma.paymentProof.findMany({
                where: { billId: input },
                orderBy: { createdAt: 'desc' },
            })
        }),

    upload: billingRoleProcedure('ADMIN')
        .input(z.object({
            billId: z.string(),
            imageUrl: z.string().url(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.paymentProof.create({
                data: {
                    billId: input.billId,
                    amount: 0,
                    imageUrl: input.imageUrl,
                    uploadedBy: ctx.session.user.username,
                    note: input.notes,
                    status: 'APPROVED',
                    reviewedAt: new Date(),
                    reviewedBy: ctx.session.user.username,
                    verifiedAt: new Date(), // legacy
                },
            })
        }),

    // Public upload via shared link token
    uploadViaLink: publicProcedure
        .input(z.object({
            token: z.string(),
            billId: z.string(),
            imageUrl: z.string().url(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const link = await resolveActiveGuardianLink(ctx.prisma, input.token)

            // Validate bill belongs to santri
            const bill = await ctx.prisma.bill.findFirst({
                where: { id: input.billId, santriId: link.santriId },
            })
            if (!bill) throw new Error('Tagihan tidak ditemukan untuk santri ini')

            return ctx.prisma.paymentProof.create({
                data: {
                    billId: input.billId,
                    amount: 0,
                    imageUrl: input.imageUrl,
                    uploadedBy: 'WALI',
                    note: input.notes,
                    status: 'PENDING',
                },
            })
        }),

    verify: billingRoleProcedure('ADMIN')
        .input(z.object({
            id: z.string(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.paymentProof.update({
                where: { id: input.id },
                data: {
                    status: 'APPROVED',
                    reviewedAt: new Date(),
                    reviewedBy: ctx.session.user.username,
                    note: input.notes,
                    verifiedAt: new Date(), // legacy
                },
            })
        }),

    reject: billingRoleProcedure('ADMIN')
        .input(z.object({
            id: z.string(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.paymentProof.update({
                where: { id: input.id },
                data: {
                    status: 'REJECTED',
                    reviewedAt: new Date(),
                    reviewedBy: ctx.session.user.username,
                    note: input.notes,
                },
            })
        }),

    // Pending proofs count for bendahara notification badge
    pendingCount: billingRoleProcedure('ADMIN')
        .query(async ({ ctx }) => {
            return ctx.prisma.paymentProof.count({ where: { status: 'PENDING' } })
        }),
})
