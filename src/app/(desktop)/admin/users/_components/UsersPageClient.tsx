'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { trpc } from '@/utils/trpc'

const UserRoleEditorModal = dynamic(() => import('./UserRoleEditorModal'), { ssr: false })
const RoleScopeEditorModal = dynamic(() => import('./RoleScopeEditorModal'), { ssr: false })

type Tab = 'users' | 'roles' | 'roleRequests'

export default function UsersPageClient() {
    const [tab, setTab] = useState<Tab>('users')
    const utils = trpc.useUtils()

    const { data: users, isLoading: loadingUsers } = trpc.user.list.useQuery()
    const { data: roles } = trpc.user.roles.list.useQuery()
    const { data: roleRequests, isLoading: loadingRoleRequests } = trpc.roleRequest.listPending.useQuery(
        { status: 'PENDING', page: 1, limit: 50 },
        { enabled: tab === 'roleRequests' }
    )

    const createUser = trpc.user.create.useMutation({ onSuccess: () => utils.user.list.invalidate() })
    const deleteUser = trpc.user.delete.useMutation({ onSuccess: () => utils.user.list.invalidate() })
    const resetPassword = trpc.user.resetPassword.useMutation()
    const updateUser = trpc.user.update.useMutation({ onSuccess: () => utils.user.list.invalidate() })

    const createRole = trpc.user.roles.create.useMutation({ onSuccess: () => utils.user.roles.list.invalidate() })
    const deleteRole = trpc.user.roles.delete.useMutation({ onSuccess: () => utils.user.roles.list.invalidate() })

    const reviewRoleRequest = trpc.roleRequest.review.useMutation({
        onSuccess: () => {
            utils.roleRequest.listPending.invalidate()
            utils.user.list.invalidate()
        },
    })

    const generateInvite = trpc.invite.generate.useMutation()

    const [editRoleUser, setEditRoleUser] = useState<any>(null)
    const [editScopeUser, setEditScopeUser] = useState<any>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

    // Create user form state
    const [fullName, setFullName] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [roleIds, setRoleIds] = useState<string[]>([])

    // Invite form state
    const [inviteDays, setInviteDays] = useState('7')
    const [inviteMaxUses, setInviteMaxUses] = useState('')

    const toggleRole = (id: string) => {
        setRoleIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
    }

    const submitCreateUser = (event: React.FormEvent) => {
        event.preventDefault()
        if (roleIds.length === 0) return
        createUser.mutate({ fullName, username, password, roleIds }, {
            onSuccess: () => {
                setShowCreateModal(false)
                setFullName(''); setUsername(''); setPassword(''); setRoleIds([])
            },
        })
    }

    const submitInvite = (event: React.FormEvent) => {
        event.preventDefault()
        generateInvite.mutate({
            expiresInDays: Number(inviteDays),
            maxUses: inviteMaxUses ? Number(inviteMaxUses) : undefined,
        })
    }

    const pendingCount = roleRequests?.data?.length ?? 0

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            {/* ── Header ── */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">Manajemen User & Role</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Tambah user, generate undangan, dan verifikasi role request.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {tab === 'users' && (
                            <>
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs font-medium flex items-center gap-1.5 transition"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    Buat Undangan
                                </button>
                                <button
                                    onClick={() => { setShowCreateModal(true); setFullName(''); setUsername(''); setPassword(''); setRoleIds([]) }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                    Tambah User
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 mt-3">
                    {([
                        { key: 'users', label: 'Users' },
                        { key: 'roles', label: 'Roles' },
                        { key: 'roleRequests', label: 'Permintaan Role' },
                    ] as { key: Tab; label: string }[]).map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`relative px-3 py-1.5 rounded text-xs font-medium transition ${tab === t.key
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {t.label}
                            {t.key === 'roleRequests' && pendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Users Tab ── */}
            {tab === 'users' && (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Username</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Roles</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-48">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loadingUsers ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : !users?.length ? (
                                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">Belum ada user</td></tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/80 transition group">
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                <span className="text-[10px] font-bold text-emerald-700">{user.fullName.charAt(0)}</span>
                                            </div>
                                            <span className="text-xs font-semibold text-gray-900">{user.fullName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-xs font-mono text-gray-600">{user.username}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-wrap gap-1">
                                            {user.userRoles.length > 0
                                                ? user.userRoles.map((ur: any) => (
                                                    <span key={ur.role.id} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                                        {ur.role.code}
                                                    </span>
                                                ))
                                                : <span className="text-[10px] text-gray-400">{(user as any).role || '—'}</span>
                                            }
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {user.isEnabled ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Aktif
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                Menunggu
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => setEditRoleUser(user)}
                                                className="px-2 py-1 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-600 rounded text-[10px] font-medium transition"
                                                title="Edit Roles"
                                            >Roles</button>
                                            <button
                                                onClick={() => setEditScopeUser(user)}
                                                className="px-2 py-1 bg-gray-100 hover:bg-purple-100 hover:text-purple-700 text-gray-600 rounded text-[10px] font-medium transition"
                                                title="Edit Scope"
                                            >Scope</button>
                                            <button
                                                onClick={() => updateUser.mutate({ id: user.id, isActive: !(user as any).isActive })}
                                                className="px-2 py-1 bg-gray-100 hover:bg-amber-100 hover:text-amber-700 text-gray-600 rounded text-[10px] font-medium transition"
                                            >{(user as any).isActive ? 'Nonaktif' : 'Aktifkan'}</button>
                                            <button
                                                onClick={() => resetPassword.mutate({ id: user.id, newPassword: 'password123' })}
                                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] font-medium transition"
                                                title="Reset ke password123"
                                            >Reset</button>
                                            <button
                                                onClick={() => setDeleteTarget({ id: user.id, name: user.fullName })}
                                                className="w-7 h-7 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                                                title="Hapus"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Roles Tab ── */}
            {tab === 'roles' && (
                <RolesTab
                    roles={roles ?? []}
                    onCreate={(code, name) => createRole.mutate({ code, name })}
                    onDelete={(id) => deleteRole.mutate(id)}
                    creating={createRole.isPending}
                />
            )}

            {/* ── Role Requests Tab ── */}
            {tab === 'roleRequests' && (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role Diminta</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Catatan</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tanggal</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loadingRoleRequests ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : !roleRequests?.data?.length ? (
                                <tr><td colSpan={5} className="px-4 py-12 text-center">
                                    <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-gray-400">Tidak ada permintaan role yang menunggu</p>
                                </td></tr>
                            ) : roleRequests.data.map((request: any) => (
                                <tr key={request.id} className="hover:bg-gray-50/80 transition">
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                                <span className="text-[10px] font-bold text-purple-700">{request.user.fullName.charAt(0)}</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-900">{request.user.fullName}</p>
                                                <p className="text-[10px] font-mono text-gray-400">{request.user.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-wrap gap-1">
                                            {request.requestedRoleCodes.map((code: string) => (
                                                <span key={code} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">{code}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-xs text-gray-600">{request.note ?? <span className="text-gray-300">—</span>}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-xs text-gray-500">{new Date(request.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                onClick={() => reviewRoleRequest.mutate({ requestId: request.id, action: 'APPROVE' })}
                                                className="px-3 py-1 rounded text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                                            >Approve</button>
                                            <button
                                                onClick={() => reviewRoleRequest.mutate({ requestId: request.id, action: 'REJECT' })}
                                                className="px-3 py-1 rounded text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition"
                                            >Reject</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Modals ── */}
            {editRoleUser && (
                <UserRoleEditorModal
                    userId={editRoleUser.id}
                    userName={editRoleUser.fullName}
                    currentRoleIds={editRoleUser.userRoles.map((ur: any) => ur.role.id)}
                    onClose={() => setEditRoleUser(null)}
                    onSaved={() => utils.user.list.invalidate()}
                />
            )}
            {editScopeUser && (
                <RoleScopeEditorModal
                    userId={editScopeUser.id}
                    userName={editScopeUser.fullName}
                    userRoleCodes={editScopeUser.userRoles.map((ur: any) => ur.role.code)}
                    currentScopes={editScopeUser.roleScopes}
                    onClose={() => setEditScopeUser(null)}
                    onSaved={() => utils.user.list.invalidate()}
                />
            )}

            {/* Create User Modal */}
            {showCreateModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Tambah User Baru</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Isi data user dan pilih minimal satu role</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition">✕</button>
                        </div>
                        <form onSubmit={submitCreateUser} className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Nama Lengkap</label>
                                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama lengkap user" required
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Username</label>
                                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username unik" required
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Password</label>
                                <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password awal" type="password" required
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-2 block">Roles <span className="text-red-500">*</span></label>
                                <div className="flex flex-wrap gap-1.5">
                                    {roles?.map((role) => (
                                        <button key={role.id} type="button" onClick={() => toggleRole(role.id)}
                                            className={`px-2.5 py-1 rounded text-xs font-medium border transition ${roleIds.includes(role.id)
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                }`}>
                                            {role.name}
                                        </button>
                                    ))}
                                </div>
                                {roleIds.length === 0 && <p className="text-[10px] text-red-500 mt-1">Pilih minimal satu role</p>}
                            </div>
                            <button type="submit" disabled={createUser.isPending || roleIds.length === 0}
                                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50 mt-2">
                                {createUser.isPending ? 'Menyimpan...' : 'Simpan User'}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Invite Modal */}
            {showInviteModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Buat Link Undangan</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Generate link untuk undang user baru mendaftar</p>
                            </div>
                            <button onClick={() => setShowInviteModal(false)} className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition">✕</button>
                        </div>
                        <form onSubmit={submitInvite} className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Masa berlaku (hari)</label>
                                <input type="number" min={1} max={90} value={inviteDays} onChange={(e) => setInviteDays(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Batas penggunaan <span className="text-gray-400">(opsional)</span></label>
                                <input type="number" min={1} value={inviteMaxUses} onChange={(e) => setInviteMaxUses(e.target.value)} placeholder="Tidak terbatas"
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                            </div>
                            <button type="submit" disabled={generateInvite.isPending}
                                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50">
                                {generateInvite.isPending ? 'Membuat...' : 'Generate Link'}
                            </button>
                        </form>
                        {generateInvite.data?.url && (
                            <div className="mt-4 p-3 rounded-xl border border-gray-200 bg-gray-50">
                                <p className="text-xs font-medium text-gray-600 mb-2">Link undangan:</p>
                                <p className="break-all text-xs text-blue-700 font-mono">{generateInvite.data.url}</p>
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(generateInvite.data!.url)}
                                    className="mt-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-100 transition flex items-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                    Salin URL
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirm Modal */}
            {deleteTarget && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">Hapus User?</h3>
                            <p className="text-sm text-gray-500 mt-1">User <strong>&quot;{deleteTarget.name}&quot;</strong> akan dihapus. Aksi ini tidak bisa dibatalkan.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={() => { deleteUser.mutate(deleteTarget.id); setDeleteTarget(null) }} disabled={deleteUser.isPending}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-50">
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

function RolesTab({
    roles, onCreate, onDelete, creating,
}: {
    roles: Array<{ id: string; code: string; name: string; _count: { userRoles: number } }>
    onCreate: (code: string, name: string) => void
    onDelete: (id: string) => void
    creating: boolean
}) {
    const [newCode, setNewCode] = useState('')
    const [newName, setNewName] = useState('')

    return (
        <div>
            {/* Add Role Bar */}
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex gap-2">
                <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Code (e.g. ADMIN)"
                    className="w-40 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama role"
                    className="flex-1 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                <button
                    type="button"
                    onClick={() => { onCreate(newCode, newName); setNewCode(''); setNewName('') }}
                    disabled={!newCode || !newName || creating}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                    {creating ? '...' : 'Tambah'}
                </button>
            </div>
            {/* Roles Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Code</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama Role</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pengguna</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {roles.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">Belum ada role</td></tr>
                        ) : roles.map((role) => (
                            <tr key={role.id} className="hover:bg-gray-50/80 transition">
                                <td className="px-4 py-2.5">
                                    <span className="text-xs font-mono font-semibold text-gray-800">{role.code}</span>
                                </td>
                                <td className="px-4 py-2.5">
                                    <span className="text-xs text-gray-700">{role.name}</span>
                                </td>
                                <td className="px-4 py-2.5">
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                                        {role._count.userRoles} user
                                    </span>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <button
                                        type="button"
                                        onClick={() => onDelete(role.id)}
                                        disabled={role._count.userRoles > 0}
                                        className="w-7 h-7 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition disabled:opacity-30 mx-auto"
                                        title={role._count.userRoles > 0 ? 'Role masih digunakan' : 'Hapus role'}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
