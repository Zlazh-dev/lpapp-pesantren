import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../trpc'

export const settingsRouter = router({
    get: publicProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            const setting = await ctx.prisma.appSetting.findUnique({ where: { key: input } })
            return setting?.value ?? null
        }),

    getMultiple: publicProcedure
        .input(z.array(z.string()))
        .query(async ({ ctx, input }) => {
            const settings = await ctx.prisma.appSetting.findMany({
                where: { key: { in: input } },
            })
            const map: Record<string, string> = {}
            for (const s of settings) map[s.key] = s.value
            return map
        }),

    set: protectedProcedure
        .input(z.object({ key: z.string(), value: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.appSetting.upsert({
                where: { key: input.key },
                create: { key: input.key, value: input.value },
                update: { value: input.value },
            })
        }),
})
