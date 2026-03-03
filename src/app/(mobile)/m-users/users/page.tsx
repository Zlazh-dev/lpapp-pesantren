'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'
import { getRoleLabel } from '@/utils/format'

export default function MobileUsersPage() {
    const utils = trpc.useUtils()
    const [showCreateModal, setShowCreateModal] = useState(false)
    const usersQuery = trpc.user.list.useQuery()
    const rolesQuery = trpc.user.roles.list.useQuery()

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Manajemen User</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Kelola akun, role, dan akses.</p>
                </div>
                <button onClick={() => setShowCreateModal(true)}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold flex items-center gap-1.5 shadow-md shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Tambah
                </button>
            </div>

            {/* User List */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {usersQuery.isLoading ? (
                    <div className="divide-y divide-slate-50">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 animate-pulse bg-slate-50/50" />)}
                    </div>
                ) : !usersQuery.data?.length ? (
                    <div className="py-16 text-center"><p className="text-sm text-slate-400">Belum ada user.</p></div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {usersQuery.data.map(user => (
                            <Link key={user.id} href={`/m-users/users/${user.id}`}
                                className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                                    {user.photoUrl ? <img src={user.photoUrl} alt="" className="w-full h-full object-cover" /> : user.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{user.fullName}</p>
                                    <p className="text-xs text-slate-400 font-mono">{user.username}</p>
                                    <div className="flex gap-1 mt-0.5 flex-wrap">
                                        {user.userRoles.slice(0, 2).map((ur: any) => (
                                            <span key={ur.role.id} className="inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                                {getRoleLabel(ur.role.code)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`w-2 h-2 rounded-full ${user.isActive && user.isEnabled ? 'bg-emerald-500' : user.isActive ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && <CreateUserModal
                roles={rolesQuery.data ?? []}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => { setShowCreateModal(false); utils.user.list.invalidate() }}
            />}
        </div>
    )
}

function CreateUserModal({ roles, onClose, onSuccess }: { roles: any[], onClose: () => void, onSuccess: () => void }) {
    const [form, setForm] = useState({ username: '', password: '', fullName: '', phone: '' })
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
    const [error, setError] = useState('')

    const createUser = trpc.user.create.useMutation({ onSuccess, onError: (err) => setError(err.message) })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (selectedRoleIds.length === 0) { setError('Pilih minimal 1 role'); return }
        createUser.mutate({ ...form, phone: form.phone || undefined, roleIds: selectedRoleIds })
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
            <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 pb-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">Tambah User Baru</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Nama Lengkap *</label>
                        <input type="text" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required
                            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Username *</label>
                            <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required minLength={3}
                                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Password *</label>
                            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6}
                                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">No. WhatsApp</label>
                        <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="08xxxxxxxxxx"
                            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                        <label className="mb-2 block text-xs font-medium text-slate-600">Role *</label>
                        <div className="flex flex-wrap gap-2">
                            {roles.map(role => (
                                <button key={role.id} type="button" onClick={() => setSelectedRoleIds(prev => prev.includes(role.id) ? prev.filter(r => r !== role.id) : [...prev, role.id])}
                                    className={`h-8 px-3 rounded-lg border text-xs font-medium transition-all ${selectedRoleIds.includes(role.id) ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>
                                    {getRoleLabel(role.code)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {error && <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">Batal</button>
                        <button type="submit" disabled={createUser.isPending}
                            className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
                            {createUser.isPending ? 'Menyimpan...' : 'Buat User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
