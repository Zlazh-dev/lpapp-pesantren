import type { Prisma } from '@prisma/client'
import type { Context } from '../trpc'

type ScopeEntry = {
    roleCode: string
    scopeType: string
    scopeId: string
}

const PRIVILEGED_ROLES = new Set(['ADMIN'])

function uniqStrings(values: string[]): string[] {
    return [...new Set(values)]
}

function uniqNumbers(values: number[]): number[] {
    return [...new Set(values)]
}

function parseScopeInt(scopeId: string): number | null {
    const value = Number.parseInt(scopeId, 10)
    return Number.isNaN(value) ? null : value
}

function getRoleCodes(ctx: Context): string[] {
    return ctx.session?.user.roleCodes ?? ctx.session?.user.roles ?? [ctx.session?.user.role ?? '']
}

function getScopes(ctx: Context): ScopeEntry[] {
    return ctx.session?.user.scopes ?? []
}

export function isPrivileged(roleCodes: string[]): boolean {
    return roleCodes.some((roleCode) => PRIVILEGED_ROLES.has(roleCode))
}

export type SantriScopeSummary = {
    isPrivileged: boolean
    hasRelevantScope: boolean
    classGroupIds: string[]
    roomIds: number[]
    buildingIds: number[]
    complexIds: number[]
}

export function getAllowedClassGroupIds(scopes: ScopeEntry[]): string[] {
    return uniqStrings(
        scopes
            .filter((scope) => scope.scopeType === 'CLASS_GROUP')
            .map((scope) => scope.scopeId)
            .filter(Boolean)
    )
}

export function getAllowedDormConstraints(scopes: ScopeEntry[]): {
    roomIds: number[]
    buildingIds: number[]
    complexIds: number[]
} {
    const roomIds = uniqNumbers(
        scopes
            .filter((scope) => scope.scopeType === 'DORM_ROOM')
            .map((scope) => parseScopeInt(scope.scopeId))
            .filter((value): value is number => value !== null)
    )

    const buildingIds = uniqNumbers(
        scopes
            .filter((scope) => scope.scopeType === 'DORM_BUILDING')
            .map((scope) => parseScopeInt(scope.scopeId))
            .filter((value): value is number => value !== null)
    )

    const complexIds = uniqNumbers(
        scopes
            .filter((scope) => scope.scopeType === 'DORM_COMPLEX')
            .map((scope) => parseScopeInt(scope.scopeId))
            .filter((value): value is number => value !== null)
    )

    return { roomIds, buildingIds, complexIds }
}

function buildDormRoomWhere(constraints: {
    roomIds: number[]
    buildingIds: number[]
    complexIds: number[]
}): Prisma.DormRoomWhereInput | null {
    const or: Prisma.DormRoomWhereInput[] = []

    if (constraints.roomIds.length > 0) {
        or.push({ id: { in: constraints.roomIds } })
    }
    if (constraints.buildingIds.length > 0) {
        or.push({ floor: { buildingId: { in: constraints.buildingIds } } })
    }
    if (constraints.complexIds.length > 0) {
        or.push({ floor: { building: { complexId: { in: constraints.complexIds } } } })
    }

    if (or.length === 0) {
        return null
    }

    return or.length === 1 ? or[0] : { OR: or }
}

export function buildSantriScopeSummary(ctx: Context): SantriScopeSummary {
    const roleCodes = getRoleCodes(ctx)
    const privileged = isPrivileged(roleCodes)
    if (privileged) {
        return {
            isPrivileged: true,
            hasRelevantScope: true,
            classGroupIds: [],
            roomIds: [],
            buildingIds: [],
            complexIds: [],
        }
    }

    const scopes = getScopes(ctx)
    const classGroupIds = getAllowedClassGroupIds(scopes)
    const dormConstraints = getAllowedDormConstraints(scopes)
    const hasRelevantScope =
        classGroupIds.length > 0 ||
        dormConstraints.roomIds.length > 0 ||
        dormConstraints.buildingIds.length > 0 ||
        dormConstraints.complexIds.length > 0

    return {
        isPrivileged: false,
        hasRelevantScope,
        classGroupIds,
        roomIds: dormConstraints.roomIds,
        buildingIds: dormConstraints.buildingIds,
        complexIds: dormConstraints.complexIds,
    }
}

export function buildSantriScopeWhereFromSummary(summary: SantriScopeSummary): Prisma.SantriWhereInput {
    if (summary.isPrivileged) {
        return {}
    }

    const ors: Prisma.SantriWhereInput[] = []

    if (summary.classGroupIds.length > 0) {
        ors.push({ classGroupId: { in: summary.classGroupIds } })
    }

    const dormRoomWhere = buildDormRoomWhere({
        roomIds: summary.roomIds,
        buildingIds: summary.buildingIds,
        complexIds: summary.complexIds,
    })

    if (dormRoomWhere) {
        ors.push({
            OR: [
                {
                    dormAssignments: {
                        some: {
                            isActive: true,
                            endAt: null,
                            room: dormRoomWhere,
                        },
                    },
                },
                { dormRoom: dormRoomWhere },
            ],
        })
    }

    if (ors.length === 0) {
        return { id: '___NO_ACCESS___' }
    }

    return { OR: ors }
}

export async function buildSantriScopeWhere(ctx: Context): Promise<Prisma.SantriWhereInput> {
    return buildSantriScopeWhereFromSummary(buildSantriScopeSummary(ctx))
}
