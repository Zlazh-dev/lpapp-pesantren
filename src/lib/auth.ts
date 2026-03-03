import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { computePermissionSnapshot } from '@/server/page-permissions'

type RoleScopeEntry = { roleCode: string; scopeType: string; scopeId: string }

declare module 'next-auth' {
    interface Session {
        user: {
            id: string
            username: string
            fullName: string
            role: string // legacy - kept for backward compat
            roleCodes: string[]
            roles: string[]
            scopes: RoleScopeEntry[]
            allowedGroupCodes: string[]
            allowedGroups: string[]
            allowedPagePaths: string[]
        }
    }

    interface User {
        id: string
        username: string
        fullName: string
        role: string
        roleCodes: string[]
        roles: string[]
        scopes: RoleScopeEntry[]
        allowedGroupCodes: string[]
        allowedGroups: string[]
        allowedPagePaths: string[]
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string
        username: string
        fullName: string
        role: string
        roleCodes: string[]
        roles: string[]
        scopes: RoleScopeEntry[]
        allowedGroupCodes: string[]
        allowedGroups: string[]
        allowedPagePaths: string[]
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    throw new Error('Username dan password harus diisi')
                }

                const user = await prisma.user.findUnique({
                    where: { username: credentials.username },
                    include: {
                        userRoles: {
                            include: { role: { select: { id: true, code: true } } },
                        },
                        roleScopes: {
                            select: { roleCode: true, scopeType: true, scopeId: true },
                        },
                    },
                })

                if (!user || !user.isActive) {
                    throw new Error('Username tidak ditemukan atau akun tidak aktif')
                }

                if (!user.isEnabled) {
                    throw new Error('Akun belum diaktifkan admin')
                }

                const isValid = await bcrypt.compare(credentials.password, user.password)
                if (!isValid) {
                    throw new Error('Password salah')
                }

                const dbRoles = user.userRoles.map((ur) => ur.role.code)
                const roleCodes = dbRoles.length > 0 ? dbRoles : [user.role]

                const snapshot = await computePermissionSnapshot(prisma, roleCodes)

                if (roleCodes.includes('ADMIN')) {
                    console.info('[SIDEBAR_DEBUG][server][authorize]', {
                        username: user.username,
                        allowedGroupCodes: snapshot.allowedGroupCodes,
                        allowedPagePaths: snapshot.allowedPagePaths,
                    })
                }

                return {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    role: user.role,
                    roleCodes,
                    roles: roleCodes,
                    scopes: user.roleScopes,
                    allowedGroupCodes: snapshot.allowedGroupCodes,
                    allowedGroups: snapshot.allowedGroupCodes,
                    allowedPagePaths: snapshot.allowedPagePaths,
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.username = user.username
                token.fullName = user.fullName
                token.role = user.role
                token.roleCodes = user.roleCodes
                token.roles = user.roleCodes
                token.scopes = user.scopes
                token.allowedGroupCodes = user.allowedGroupCodes
                token.allowedGroups = user.allowedGroupCodes
                token.allowedPagePaths = user.allowedPagePaths
            }
            return token
        },
        async session({ session, token }) {
            const fallbackRoleCodes = token.roleCodes ?? token.roles ?? (token.role ? [token.role] : [])
            const liveRoleRows = token.id
                ? await prisma.userRole.findMany({
                    where: { userId: token.id },
                    select: { role: { select: { code: true } } },
                })
                : []
            const liveRoleCodes = liveRoleRows.length > 0
                ? [...new Set(liveRoleRows.map((row) => row.role.code))]
                : fallbackRoleCodes
            const liveSnapshot = await computePermissionSnapshot(prisma, liveRoleCodes)

            session.user = {
                id: token.id,
                username: token.username,
                fullName: token.fullName,
                role: token.role,
                roleCodes: liveRoleCodes,
                roles: liveRoleCodes,
                scopes: token.scopes ?? [],
                allowedGroupCodes: liveSnapshot.allowedGroupCodes,
                allowedGroups: liveSnapshot.allowedGroupCodes,
                allowedPagePaths: liveSnapshot.allowedPagePaths,
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60,
    },
    secret: process.env.NEXTAUTH_SECRET,
}
