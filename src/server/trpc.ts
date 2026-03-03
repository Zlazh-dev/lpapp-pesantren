import { initTRPC, TRPCError } from '@trpc/server'
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { getServerSession } from 'next-auth'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { hasPathAccess } from '@/lib/access-routing'

export const createTRPCContext = async (opts: FetchCreateContextFnOptions) => {
    const session = await getServerSession(authOptions)
    return {
        prisma,
        session,
        headers: opts.req.headers,
    }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
            },
        }
    },
})

export const router = t.router
export const publicProcedure = t.procedure

const enforceAuth = t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Anda harus login terlebih dahulu' })
    }
    return next({
        ctx: {
            session: ctx.session,
        },
    })
})

export const protectedProcedure = t.procedure.use(enforceAuth)

export function hasRole(ctx: Context, roleCode: string): boolean {
    const userRoles: string[] = ctx.session?.user.roleCodes ?? ctx.session?.user.roles ?? [ctx.session?.user.role ?? '']
    return userRoles.includes(roleCode)
}

function getAllowedPagePaths(ctx: Context): string[] {
    return ctx.session?.user.allowedPagePaths ?? []
}

export function hasPageAccess(ctx: Context, pagePath: string): boolean {
    if (hasRole(ctx, 'ADMIN')) return true
    return hasPathAccess(pagePath, getAllowedPagePaths(ctx))
}

export function hasAnyPageAccess(ctx: Context, pagePaths: string[]): boolean {
    return pagePaths.some((pagePath) => hasPageAccess(ctx, pagePath))
}

export function requirePageAccess(ctx: Context, pagePath: string): void {
    if (!hasPageAccess(ctx, pagePath)) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Akses ditolak. Anda tidak memiliki akses ke halaman "${pagePath}"`,
        })
    }
}

export function requireAnyPageAccess(ctx: Context, pagePaths: string[]): void {
    if (!hasAnyPageAccess(ctx, pagePaths)) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Akses ditolak. Anda tidak memiliki akses ke halaman yang dibutuhkan (${pagePaths.join(', ')})`,
        })
    }
}

export function hasGroup(ctx: Context, groupCode: string): boolean {
    if (hasRole(ctx, 'ADMIN')) return true
    const allowed: string[] = ctx.session?.user.allowedGroupCodes ?? ctx.session?.user.allowedGroups ?? []
    return allowed.includes(groupCode)
}

export function requireGroup(ctx: Context, groupCode: string): void {
    if (!hasGroup(ctx, groupCode)) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Akses ditolak. Anda tidak memiliki akses ke grup "${groupCode}"`,
        })
    }
}

export const roleProtectedProcedure = (...roles: string[]) =>
    protectedProcedure.use(({ ctx, next }) => {
        const userRoles: string[] = ctx.session.user.roleCodes ?? ctx.session.user.roles ?? [ctx.session.user.role]
        const hasAccess = userRoles.some((r) => roles.includes(r))
        if (!hasAccess) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: `Akses ditolak. Role yang diperlukan: ${roles.join(', ')}`,
            })
        }
        return next({ ctx })
    })

export const pageProtectedProcedure = (requiredPagePath: string | string[]) =>
    protectedProcedure.use(({ ctx, next }) => {
        const paths = Array.isArray(requiredPagePath) ? requiredPagePath : [requiredPagePath]
        requireAnyPageAccess(ctx, paths)
        return next({ ctx })
    })

export const groupProtectedProcedure = (groupCode: string) =>
    protectedProcedure.use(({ ctx, next }) => {
        requireGroup(ctx, groupCode)
        return next({ ctx })
    })
