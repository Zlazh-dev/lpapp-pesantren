import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, pageProtectedProcedure, hasRole } from '../trpc'

const itemSchema = z.object({
    id: z.string().optional(),
    label: z.string().min(1, 'Label item wajib diisi'),
    amount: z.number().positive('Amount harus > 0'),
    sortOrder: z.number().min(0).default(0),
})

const scopeSchema = z.object({
    scopeType: z.enum(['ALL', 'ACADEMIC_LEVEL', 'GRADE', 'CLASSGROUP', 'ROOM', 'GENDER']),
    scopeRefId: z.string().nullable().optional(),
    scopeValue: z.string().nullable().optional(),
    include: z.boolean().default(true),
})

const billingAdminProcedure = pageProtectedProcedure('/keuangan')
    .use(({ ctx, next }) => {
        const hasAccess = ['ADMIN'].some(role => hasRole(ctx, role))
        if (!hasAccess) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Akses ditolak. Role yang diperlukan: ADMIN' })
        }
        return next({ ctx })
    })

export const billingModelRouter = router({
    list: billingAdminProcedure
        .input(z.object({ onlyActive: z.boolean().optional() }).optional())
        .query(async ({ ctx, input }) => {
            return ctx.prisma.billingModel.findMany({
                where: input?.onlyActive ? { isActive: true } : undefined,
                orderBy: { name: 'asc' },
                include: {
                    items: { orderBy: { sortOrder: 'asc' } },
                    scopes: true,
                    _count: { select: { bills: true, invoices: true } },
                },
            })
        }),

    getById: billingAdminProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            const model = await ctx.prisma.billingModel.findUnique({
                where: { id: input },
                include: {
                    items: { orderBy: { sortOrder: 'asc' } },
                    scopes: true,
                    _count: { select: { bills: true, invoices: true } },
                },
            })
            if (!model) throw new Error('Model tagihan tidak ditemukan')
            return model
        }),

    create: billingAdminProcedure
        .input(z.object({
            name: z.string().min(2, 'Nama minimal 2 karakter'),
            description: z.string().optional(),
            periodType: z.enum(['bulanan', 'tahunan', 'sekali']),
            defaultAmount: z.number().positive().optional(),
            items: z.array(itemSchema).optional(),
            scopes: z.array(scopeSchema).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { items, scopes, ...data } = input
            // Check for duplicate name first
            const existing = await ctx.prisma.billingModel.findUnique({ where: { name: data.name } })
            if (existing) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Sistem billing dengan nama "${data.name}" sudah ada. Gunakan nama lain.`,
                })
            }
            return ctx.prisma.billingModel.create({
                data: {
                    ...data,
                    items: items?.length ? { createMany: { data: items.map(({ id, ...rest }) => rest) } } : undefined,
                    scopes: scopes?.length ? { createMany: { data: scopes } } : undefined,
                },
                include: { items: true, scopes: true },
            })
        }),

    update: billingAdminProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(2).optional(),
            description: z.string().optional(),
            periodType: z.enum(['bulanan', 'tahunan', 'sekali']).optional(),
            defaultAmount: z.number().positive().nullable().optional(),
            isActive: z.boolean().optional(),
            items: z.array(itemSchema).optional(),
            scopes: z.array(scopeSchema).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, items, scopes, ...data } = input

            return ctx.prisma.$transaction(async (tx) => {
                await tx.billingModel.update({ where: { id }, data })

                if (items !== undefined) {
                    await tx.billingModelItem.deleteMany({ where: { billingModelId: id } })
                    if (items.length > 0) {
                        await tx.billingModelItem.createMany({
                            data: items.map(({ id: _itemId, ...rest }) => ({ ...rest, billingModelId: id })),
                        })
                    }
                }

                if (scopes !== undefined) {
                    await tx.billingModelScope.deleteMany({ where: { billingModelId: id } })
                    if (scopes.length > 0) {
                        await tx.billingModelScope.createMany({
                            data: scopes.map(s => ({ ...s, billingModelId: id })),
                        })
                    }
                }

                return tx.billingModel.findUnique({
                    where: { id },
                    include: { items: { orderBy: { sortOrder: 'asc' } }, scopes: true },
                })
            })
        }),

    toggleActive: billingAdminProcedure
        .input(z.object({ id: z.string(), isActive: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.billingModel.update({
                where: { id: input.id },
                data: { isActive: input.isActive },
            })
        }),

    delete: billingAdminProcedure
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            const invoiceCount = await ctx.prisma.invoice.count({ where: { billingModelId: input } })
            const billCount = await ctx.prisma.bill.count({ where: { billingModelId: input } })
            if (invoiceCount > 0 || billCount > 0) {
                throw new Error(`Model ini masih digunakan oleh ${invoiceCount + billCount} tagihan. Nonaktifkan saja.`)
            }
            return ctx.prisma.billingModel.delete({ where: { id: input } })
        }),

    // ========== Cascade delete with 3 levels ==========
    deleteWithData: billingAdminProcedure
        .input(z.object({
            id: z.string(),
            level: z.enum(['system-only', 'system-and-invoices', 'everything']),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, level } = input

            return ctx.prisma.$transaction(async (tx) => {
                if (level === 'everything' || level === 'system-and-invoices') {
                    // Collect invoice IDs for this billing model
                    const invoiceIds = (await tx.invoice.findMany({
                        where: { billingModelId: id },
                        select: { id: true },
                    })).map(i => i.id)

                    if (invoiceIds.length > 0) {
                        if (level === 'everything') {
                            // Delete payments and payment proofs
                            await tx.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } })
                            await tx.paymentProof.deleteMany({ where: { invoiceId: { in: invoiceIds } } })
                        }
                        // Delete invoice items and invoices
                        await tx.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } })
                        await tx.invoice.deleteMany({ where: { billingModelId: id } })
                    }

                    // Delete legacy bills
                    await tx.bill.deleteMany({ where: { billingModelId: id } })
                }

                // Always delete billing model items, scopes, then the model itself
                await tx.billingModelItem.deleteMany({ where: { billingModelId: id } })
                await tx.billingModelScope.deleteMany({ where: { billingModelId: id } })
                return tx.billingModel.delete({ where: { id } })
            })
        }),
})
