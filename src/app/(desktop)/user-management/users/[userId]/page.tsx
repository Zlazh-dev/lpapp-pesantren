'use client'

import { useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import { getRoleLabel } from '@/utils/format'
import Link from 'next/link'

export default function UserDetailPage() {
    const { userId } = useParams<{ userId: string }>()
    const router = useRouter()
    const utils = trpc.useUtils()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const userQuery = trpc.user.getById.useQuery(userId)
    const rolesQuery = trpc.user.roles.list.useQuery()
    const scopesQuery = trpc.user.scope.list.useQuery(userId)

    // Mutations
    const updateUser = trpc.user.update.useMutation({ onSuccess: () => utils.user.getById.invalidate(userId) })
    const updateRoles = trpc.user.updateRoles.useMutation({ onSuccess: () => utils.user.getById.invalidate(userId) })
    const resetPassword = trpc.user.resetPassword.useMutation()
    const uploadPhoto = trpc.user.uploadPhoto.useMutation({ onSuccess: () => utils.user.getById.invalidate(userId) })
    const removePhoto = trpc.user.removePhoto.useMutation({ onSuccess: () => utils.user.getById.invalidate(userId) })
    const assignScope = trpc.user.scope.assign.useMutation({ onSuccess: () => utils.user.scope.list.invalidate(userId) })
    const removeScope = trpc.user.scope.remove.useMutation({ onSuccess: () => utils.user.scope.list.invalidate(userId) })
    const deleteUser = trpc.user.delete.useMutation({ onSuccess: () => router.push('/user-management/users') })

    const user = userQuery.data

    if (userQuery.isLoading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-slate-500">Memuat...</p></div>
    if (userQuery.error) return <div className="p-6"><p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{userQuery.error.message}</p></div>
    if (!user) return null

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-10">
            {/* Back link */}
            <Link href="/user-management/users" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Kembali ke Daftar User
            </Link>

            {/* Header Card */}
            <HeaderSection user={user} fileInputRef={fileInputRef} uploadPhoto={uploadPhoto} removePhoto={removePhoto} />

            {/* Info Section */}
            <InfoSection user={user} updateUser={updateUser} />

            {/* Role Section */}
            <RoleSection user={user} allRoles={rolesQuery.data ?? []} updateRoles={updateRoles} userId={userId} />

            {/* Scope Section */}
            {user.userRoles.some(ur => ['WALI_KELAS', 'PEMBIMBING_KAMAR'].includes(ur.role.code)) && (
                <ScopeSection
                    userId={userId}
                    userRoles={user.userRoles}
                    scopes={scopesQuery.data ?? []}
                    assignScope={assignScope}
                    removeScope={removeScope}
                />
            )}

            {/* Security Section */}
            <SecuritySection user={user} userId={userId} updateUser={updateUser} resetPassword={resetPassword} deleteUser={deleteUser} />
        </div>
    )
}

/* ==================== HEADER ==================== */
function HeaderSection({ user, fileInputRef, uploadPhoto, removePhoto }: any) {
    const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const buffer = await file.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        uploadPhoto.mutate({ userId: user.id, base64, filename: file.name })
    }, [user.id, uploadPhoto])

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-5">
                <div className="relative group">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        {user.photoUrl
                            ? <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
                            : user.fullName.charAt(0).toUpperCase()
                        }
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg bg-white/90 p-1.5 text-slate-700 hover:bg-white" title="Upload foto">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        {user.photoUrl && (
                            <button type="button" onClick={() => removePhoto.mutate(user.id)} className="rounded-lg bg-white/90 p-1.5 text-red-600 hover:bg-white" title="Hapus foto">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-slate-800 truncate">{user.fullName}</h1>
                    <p className="text-sm text-slate-500 font-mono">@{user.username}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {user.userRoles.map((ur: any) => (
                            <span key={ur.role.id} className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                {getRoleLabel(ur.role.code)}
                            </span>
                        ))}
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.isActive && user.isEnabled ? 'bg-emerald-50 text-emerald-700' : user.isActive ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {user.isActive && user.isEnabled ? '● Aktif' : user.isActive ? '● Belum diaktivasi' : '● Nonaktif'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ==================== INFO ==================== */
function InfoSection({ user, updateUser }: any) {
    const [form, setForm] = useState({ fullName: user.fullName, phone: user.phone ?? '' })
    const [saved, setSaved] = useState(false)

    const handleSave = () => {
        updateUser.mutate(
            { id: user.id, fullName: form.fullName, phone: form.phone || null },
            { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000) } }
        )
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">Informasi</h2>
            <div className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Nama Lengkap</label>
                    <input
                        type="text"
                        value={form.fullName}
                        onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">No. WhatsApp</label>
                    <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="08xxxxxxxxxx"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={updateUser.isPending}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {updateUser.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                    {saved && <span className="text-sm text-emerald-600 font-medium">✓ Tersimpan</span>}
                </div>
            </div>
        </div>
    )
}

/* ==================== ROLES ==================== */
function RoleSection({ user, allRoles, updateRoles, userId }: any) {
    const currentIds = user.userRoles.map((ur: any) => ur.role.id)
    const [selectedIds, setSelectedIds] = useState<string[]>(currentIds)
    const [saved, setSaved] = useState(false)

    const toggleRole = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
    }

    const handleSave = () => {
        updateRoles.mutate(
            { userId, roleIds: selectedIds },
            { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000) } }
        )
    }

    const hasChanged = JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...currentIds].sort())

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">Role</h2>
            <div className="flex flex-wrap gap-2">
                {allRoles.map((role: any) => (
                    <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id)}
                        className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${selectedIds.includes(role.id)
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                    >
                        {getRoleLabel(role.code)}
                    </button>
                ))}
            </div>
            {hasChanged && (
                <div className="mt-4 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={updateRoles.isPending || selectedIds.length === 0}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {updateRoles.isPending ? 'Menyimpan...' : 'Simpan Role'}
                    </button>
                    <button type="button" onClick={() => setSelectedIds(currentIds)} className="text-sm text-slate-500 hover:text-slate-700">Batal</button>
                    {saved && <span className="text-sm text-emerald-600 font-medium">✓ Tersimpan</span>}
                </div>
            )}
        </div>
    )
}

/* ==================== SCOPE ==================== */
function ScopeSection({ userId, userRoles, scopes, assignScope, removeScope }: any) {
    const [scopeForm, setScopeForm] = useState({ roleCode: '', scopeType: '' as string, scopeId: '' })

    const kelasQuery = trpc.kelas.list.useQuery()
    const kamarQuery = trpc.kamar.list.useQuery()

    const scopeRoleCodes = userRoles
        .map((ur: any) => ur.role.code)
        .filter((c: string) => ['WALI_KELAS', 'PEMBIMBING_KAMAR'].includes(c))

    const getScopeLabel = (scopeType: string, scopeId: string) => {
        if (scopeType === 'CLASS_GROUP') {
            const kelas = kelasQuery.data?.find((k: any) => String(k.id) === scopeId)
            return kelas ? `Kelas: ${kelas.name}` : `Kelas ID: ${scopeId}`
        }
        if (scopeType === 'DORM_ROOM') {
            const kamar = kamarQuery.data?.find((k: any) => String(k.id) === scopeId)
            return kamar ? `Kamar: ${kamar.name}` : `Kamar ID: ${scopeId}`
        }
        return `${scopeType}: ${scopeId}`
    }

    const handleAssign = () => {
        if (!scopeForm.roleCode || !scopeForm.scopeType || !scopeForm.scopeId) return
        assignScope.mutate({ userId, ...scopeForm })
        setScopeForm({ roleCode: '', scopeType: '', scopeId: '' })
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">Scope Assignment</h2>
            <p className="text-sm text-slate-500 mb-4">Tentukan kelas atau kamar yang menjadi tanggung jawab user ini.</p>

            {/* Current scopes */}
            {scopes.length > 0 && (
                <div className="mb-4 space-y-2">
                    {scopes.map((scope: any) => (
                        <div key={scope.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                            <div>
                                <span className="text-xs font-semibold text-slate-500">{getRoleLabel(scope.roleCode)}</span>
                                <span className="mx-2 text-slate-300">→</span>
                                <span className="text-sm text-slate-700">{getScopeLabel(scope.scopeType, scope.scopeId)}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeScope.mutate(scope.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                                Hapus
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add scope form */}
            <div className="flex flex-wrap gap-2 items-end">
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
                    <select
                        value={scopeForm.roleCode}
                        onChange={e => setScopeForm(p => ({ ...p, roleCode: e.target.value, scopeType: e.target.value === 'WALI_KELAS' ? 'CLASS_GROUP' : 'DORM_ROOM', scopeId: '' }))}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                        <option value="">Pilih role</option>
                        {scopeRoleCodes.map((code: string) => (
                            <option key={code} value={code}>{getRoleLabel(code)}</option>
                        ))}
                    </select>
                </div>
                {scopeForm.roleCode && (
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            {scopeForm.roleCode === 'WALI_KELAS' ? 'Kelas' : 'Kamar'}
                        </label>
                        <select
                            value={scopeForm.scopeId}
                            onChange={e => setScopeForm(p => ({ ...p, scopeId: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        >
                            <option value="">Pilih...</option>
                            {scopeForm.roleCode === 'WALI_KELAS'
                                ? kelasQuery.data?.map((k: any) => <option key={k.id} value={String(k.id)}>{k.name}</option>)
                                : kamarQuery.data?.map((k: any) => <option key={k.id} value={String(k.id)}>{k.name}</option>)
                            }
                        </select>
                    </div>
                )}
                <button
                    type="button"
                    onClick={handleAssign}
                    disabled={!scopeForm.scopeId || assignScope.isPending}
                    className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                    Tambah
                </button>
            </div>
        </div>
    )
}

/* ==================== SECURITY ==================== */
function SecuritySection({ user, userId, updateUser, resetPassword, deleteUser }: any) {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [pwMsg, setPwMsg] = useState({ type: '', text: '' })
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleResetPassword = () => {
        if (newPassword.length < 6) { setPwMsg({ type: 'error', text: 'Password minimal 6 karakter' }); return }
        if (newPassword !== confirmPassword) { setPwMsg({ type: 'error', text: 'Konfirmasi password tidak cocok' }); return }
        resetPassword.mutate(
            { id: userId, newPassword },
            {
                onSuccess: () => { setPwMsg({ type: 'success', text: 'Password berhasil direset' }); setNewPassword(''); setConfirmPassword('') },
                onError: (err: any) => setPwMsg({ type: 'error', text: err.message }),
            }
        )
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
            <h2 className="text-base font-bold text-slate-800">Keamanan & Status</h2>

            {/* Status toggles */}
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-700">Akun Aktif</p>
                            <p className="text-xs text-slate-500 mt-0.5">Nonaktifkan agar user tidak bisa login</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => updateUser.mutate({ id: userId, isActive: !user.isActive })}
                            className={`relative h-6 w-11 rounded-full transition ${user.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${user.isActive ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-700">Enabled</p>
                            <p className="text-xs text-slate-500 mt-0.5">Aktivasi akun user baru</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => updateUser.mutate({ id: userId, isEnabled: !user.isEnabled })}
                            className={`relative h-6 w-11 rounded-full transition ${user.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${user.isEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Reset Password */}
            <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Reset Password</h3>
                <div className="grid grid-cols-2 gap-3">
                    <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Password baru"
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Konfirmasi password"
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>
                {pwMsg.text && (
                    <p className={`mt-2 text-sm ${pwMsg.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{pwMsg.text}</p>
                )}
                <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resetPassword.isPending || !newPassword}
                    className="mt-3 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                    {resetPassword.isPending ? 'Mereset...' : 'Reset Password'}
                </button>
            </div>

            {/* Delete */}
            <div className="border-t border-slate-200 pt-5">
                {!showDeleteConfirm ? (
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                    >
                        Hapus User
                    </button>
                ) : (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-red-700 font-medium">Yakin ingin menghapus user <strong>{user.fullName}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
                        <div className="mt-3 flex gap-2">
                            <button
                                type="button"
                                onClick={() => deleteUser.mutate(userId)}
                                disabled={deleteUser.isPending}
                                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleteUser.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                            <button type="button" onClick={() => setShowDeleteConfirm(false)} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-white">Batal</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
