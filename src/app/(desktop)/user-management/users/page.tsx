'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'
import { getRoleLabel } from '@/utils/format'

export default function UserManagementUsersPage() {
    const utils = trpc.useUtils()
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

    const usersQuery = trpc.user.list.useQuery()
    const rolesQuery = trpc.user.roles.list.useQuery()

    const deleteUser = trpc.user.delete.useMutation({
        onSuccess: () => { setDeleteTarget(null); utils.user.list.invalidate() },
    })

    const users = usersQuery.data ?? []

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            {/* ── Header ── */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">Manajemen User</h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {usersQuery.isLoading ? 'Memuat...' : `${users.length} user terdaftar`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah User
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Username</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Roles</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">WhatsApp</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {usersQuery.isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : usersQuery.error ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-red-600">{usersQuery.error.message}</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-14 text-center">
                                <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <p className="text-sm text-gray-400">Belum ada user</p>
                            </td></tr>
                        ) : users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50/80 cursor-pointer transition group" onClick={() => window.location.href = `/user-management/users/${user.id}`}>
                                <td className="px-4 py-2.5">
                                    <Link href={`/user-management/users/${user.id}`} className="flex items-center gap-2.5" onClick={e => e.stopPropagation()}>
                                        <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-[10px] overflow-hidden">
                                            {user.photoUrl
                                                ? <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                                                : user.fullName.charAt(0).toUpperCase()
                                            }
                                        </div>
                                        <span className="text-xs font-semibold text-gray-900 group-hover:text-emerald-700 transition truncate max-w-[160px]">{user.fullName}</span>
                                    </Link>
                                </td>
                                <td className="px-4 py-2.5">
                                    <span className="text-xs font-mono text-gray-600">{user.username}</span>
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex flex-wrap gap-1">
                                        {user.userRoles.length > 0
                                            ? user.userRoles.map((ur) => (
                                                <span key={ur.role.id} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                                    {getRoleLabel(ur.role.code)}
                                                </span>
                                            ))
                                            : <span className="text-[10px] text-gray-300">—</span>
                                        }
                                    </div>
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user.isActive && user.isEnabled ? 'bg-emerald-500' : user.isActive ? 'bg-amber-400' : 'bg-gray-300'}`} />
                                        <span className={`text-[10px] font-medium ${user.isActive && user.isEnabled ? 'text-emerald-700' : user.isActive ? 'text-amber-600' : 'text-gray-400'}`}>
                                            {user.isActive && user.isEnabled ? 'Aktif' : user.isActive ? 'Belum diaktivasi' : 'Nonaktif'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-2.5">
                                    <span className="text-xs text-gray-600">{user.phone || <span className="text-gray-300">—</span>}</span>
                                </td>
                                <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1">
                                        <Link
                                            href={`/user-management/users/${user.id}`}
                                            className="w-7 h-7 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 text-gray-500 rounded flex items-center justify-center transition"
                                            title="Lihat Detail"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </Link>
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

            {/* Create User Modal */}
            {showCreateModal && (
                <CreateUserModal
                    roles={rolesQuery.data ?? []}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => { setShowCreateModal(false); utils.user.list.invalidate() }}
                />
            )}

            {/* Delete Confirm Modal */}
            {deleteTarget && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">Hapus User?</h3>
                            <p className="text-sm text-gray-500 mt-1">User <strong>&quot;{deleteTarget.name}&quot;</strong> akan dihapus permanen.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={() => deleteUser.mutate(deleteTarget.id)} disabled={deleteUser.isPending}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-50">
                                {deleteUser.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

function CreateUserModal({
    roles, onClose, onSuccess,
}: {
    roles: { id: string; code: string; name: string }[]
    onClose: () => void
    onSuccess: () => void
}) {
    const [form, setForm] = useState({ username: '', password: '', fullName: '', phone: '' })
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
    const [error, setError] = useState('')

    const createUser = trpc.user.create.useMutation({
        onSuccess,
        onError: (err) => setError(err.message),
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (selectedRoleIds.length === 0) { setError('Pilih minimal 1 role'); return }
        createUser.mutate({ ...form, phone: form.phone || undefined, roleIds: selectedRoleIds })
    }

    const toggleRole = (id: string) => {
        setSelectedRoleIds(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Tambah User Baru</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Buat akun user baru dengan role yang dipilih.</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Nama Lengkap <span className="text-red-500">*</span></label>
                        <input type="text" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required minLength={2}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Username <span className="text-red-500">*</span></label>
                            <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required minLength={3}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Password <span className="text-red-500">*</span></label>
                            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">No. WhatsApp <span className="text-gray-400">(opsional)</span></label>
                        <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="08xxxxxxxxxx"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-2 block">Role <span className="text-red-500">*</span></label>
                        <div className="flex flex-wrap gap-1.5">
                            {roles.map(role => (
                                <button key={role.id} type="button" onClick={() => toggleRole(role.id)}
                                    className={`px-2.5 py-1 rounded text-xs font-medium border transition ${selectedRoleIds.includes(role.id)
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                                    {getRoleLabel(role.code)}
                                </button>
                            ))}
                        </div>
                        {selectedRoleIds.length === 0 && <p className="text-[10px] text-red-400 mt-1">Pilih minimal satu role</p>}
                    </div>

                    {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                        <button type="submit" disabled={createUser.isPending || selectedRoleIds.length === 0}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50">
                            {createUser.isPending ? 'Menyimpan...' : 'Buat User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
