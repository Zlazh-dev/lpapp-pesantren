'use client'

import { useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/utils/trpc'
import { getRoleLabel } from '@/utils/format'

export default function MobileUserDetailPage() {
    const { userId } = useParams<{ userId: string }>()
    const router = useRouter()
    const utils = trpc.useUtils()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const userQuery = trpc.user.getById.useQuery(userId)
    const rolesQuery = trpc.user.roles.list.useQuery()
    const scopesQuery = trpc.user.scope.list.useQuery(userId)
    const kelasQuery = trpc.kelas.list.useQuery()
    const kamarQuery = trpc.kamar.list.useQuery()

    const updateUser = trpc.user.update.useMutation({ onSuccess: () => utils.user.getById.invalidate(userId) })
    const updateRoles = trpc.user.updateRoles.useMutation({ onSuccess: () => utils.user.getById.invalidate(userId) })
    const resetPassword = trpc.user.resetPassword.useMutation()
    const uploadPhoto = trpc.user.uploadPhoto.useMutation({ onSuccess: () => utils.user.getById.invalidate(userId) })
    const removePhoto = trpc.user.removePhoto.useMutation({ onSuccess: () => utils.user.getById.invalidate(userId) })
    const assignScope = trpc.user.scope.assign.useMutation({ onSuccess: () => utils.user.scope.list.invalidate(userId) })
    const removeScope = trpc.user.scope.remove.useMutation({ onSuccess: () => utils.user.scope.list.invalidate(userId) })
    const deleteUser = trpc.user.delete.useMutation({ onSuccess: () => router.push('/m-users/users') })

    const [form, setForm] = useState({ fullName: '', phone: '' })
    const [formInit, setFormInit] = useState(false)

    const user = userQuery.data

    // Init form once user loaded
    if (user && !formInit) {
        setForm({ fullName: user.fullName, phone: user.phone ?? '' })
        setFormInit(true)
    }

    const [savedInfo, setSavedInfo] = useState(false)
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[] | null>(null)
    const [savedRoles, setSavedRoles] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [pwMsg, setPwMsg] = useState({ type: '', text: '' })
    const [showDelete, setShowDelete] = useState(false)
    const [scopeForm, setScopeForm] = useState({ roleCode: '', scopeType: '', scopeId: '' })

    const currentRoleIds = user?.userRoles.map((ur: any) => ur.role.id) ?? []
    const displayRoleIds = selectedRoleIds ?? currentRoleIds

    const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return
        const buffer = await file.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        uploadPhoto.mutate({ userId: user.id, base64, filename: file.name })
    }, [user, uploadPhoto])

    const handleResetPassword = () => {
        if (newPassword.length < 6) { setPwMsg({ type: 'error', text: 'Password minimal 6 karakter' }); return }
        if (newPassword !== confirmPassword) { setPwMsg({ type: 'error', text: 'Konfirmasi tidak cocok' }); return }
        resetPassword.mutate({ id: userId, newPassword }, {
            onSuccess: () => { setPwMsg({ type: 'success', text: '✓ Password berhasil direset' }); setNewPassword(''); setConfirmPassword('') },
            onError: (err) => setPwMsg({ type: 'error', text: err.message }),
        })
    }

    if (userQuery.isLoading) {
        return (
            <div className="space-y-4 animate-fade-in">
                <div className="h-10 w-32 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
        )
    }

    if (userQuery.error || !user) {
        return (
            <div className="space-y-4">
                <Link href="/m-users/users" className="h-10 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </Link>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                    <p className="text-sm text-red-700">{userQuery.error?.message ?? 'User tidak ditemukan'}</p>
                </div>
            </div>
        )
    }

    const scopeRoleCodes = user.userRoles.map((ur: any) => ur.role.code).filter((c: string) => ['WALI_KELAS', 'PEMBIMBING_KAMAR'].includes(c))
    const hasScope = user.userRoles.some((ur: any) => ['WALI_KELAS', 'PEMBIMBING_KAMAR'].includes(ur.role.code))
    const hasRoleChanged = JSON.stringify([...displayRoleIds].sort()) !== JSON.stringify([...currentRoleIds].sort())

    const getScopeLabel = (scopeType: string, scopeId: string) => {
        if (scopeType === 'CLASS_GROUP') {
            const k = kelasQuery.data?.find((k: any) => String(k.id) === scopeId)
            return k ? `Kelas: ${k.name}` : `Kelas ID: ${scopeId}`
        }
        if (scopeType === 'DORM_ROOM') {
            const k = kamarQuery.data?.find((k: any) => String(k.id) === scopeId)
            return k ? `Kamar: ${k.name}` : `Kamar ID: ${scopeId}`
        }
        return `${scopeType}: ${scopeId}`
    }

    return (
        <div className="space-y-4 animate-fade-in pb-6">
            {/* Back */}
            <Link href="/m-users/users"
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Daftar User
            </Link>

            {/* ── Profile header ─────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-2xl overflow-hidden shadow-md">
                            {user.photoUrl ? <img src={user.photoUrl} alt="" className="w-full h-full object-cover" /> : user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <button onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-slate-800 truncate">{user.fullName}</h2>
                        <p className="text-xs text-slate-400 font-mono">@{user.username}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {user.userRoles.map((ur: any) => (
                                <span key={ur.role.id} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{getRoleLabel(ur.role.code)}</span>
                            ))}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${user.isActive && user.isEnabled ? 'bg-emerald-50 text-emerald-700' : user.isActive ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                {user.isActive && user.isEnabled ? '● Aktif' : user.isActive ? '● Belum aktif' : '● Nonaktif'}
                            </span>
                        </div>
                    </div>
                    {user.photoUrl && (
                        <button onClick={() => removePhoto.mutate(user.id)} className="shrink-0 text-xs text-red-400 hover:text-red-600">Hapus foto</button>
                    )}
                </div>
            </div>

            {/* ── Info edit ─────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Informasi</h3>
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Nama Lengkap</label>
                    <input type="text" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                        className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">No. WhatsApp</label>
                    <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="08xxxxxxxxxx"
                        className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => updateUser.mutate({ id: userId, fullName: form.fullName, phone: form.phone || null }, { onSuccess: () => { setSavedInfo(true); setTimeout(() => setSavedInfo(false), 2000) } })}
                        disabled={updateUser.isPending}
                        className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                        {updateUser.isPending ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    {savedInfo && <span className="text-sm text-emerald-600 font-medium">✓ Tersimpan</span>}
                </div>
            </div>

            {/* ── Roles ─────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Role</h3>
                <div className="flex flex-wrap gap-2">
                    {(rolesQuery.data ?? []).map((role: any) => (
                        <button key={role.id} type="button"
                            onClick={() => setSelectedRoleIds(prev => {
                                const ids = prev ?? currentRoleIds
                                return ids.includes(role.id) ? ids.filter(r => r !== role.id) : [...ids, role.id]
                            })}
                            className={`h-8 px-3 rounded-lg border text-xs font-medium transition-all ${displayRoleIds.includes(role.id) ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>
                            {getRoleLabel(role.code)}
                        </button>
                    ))}
                </div>
                {hasRoleChanged && (
                    <div className="flex items-center gap-3">
                        <button onClick={() => updateRoles.mutate({ userId, roleIds: displayRoleIds }, { onSuccess: () => { setSavedRoles(true); setSelectedRoleIds(null); setTimeout(() => setSavedRoles(false), 2000) } })}
                            disabled={updateRoles.isPending || displayRoleIds.length === 0}
                            className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                            {updateRoles.isPending ? 'Menyimpan...' : 'Simpan Role'}
                        </button>
                        <button onClick={() => setSelectedRoleIds(null)} className="text-sm text-slate-400">Batal</button>
                        {savedRoles && <span className="text-sm text-emerald-600 font-medium">✓ Tersimpan</span>}
                    </div>
                )}
            </div>

            {/* ── Scope (wali kelas / pembimbing kamar) ─ */}
            {hasScope && (
                <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-800">Scope Assignment</h3>
                    <p className="text-xs text-slate-400">Kelas/kamar yang menjadi tanggung jawab user ini.</p>

                    {(scopesQuery.data ?? []).map((scope: any) => (
                        <div key={scope.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                            <div className="text-sm text-slate-700">
                                <span className="text-xs font-semibold text-slate-400">{getRoleLabel(scope.roleCode)} → </span>
                                {getScopeLabel(scope.scopeType, scope.scopeId)}
                            </div>
                            <button onClick={() => removeScope.mutate(scope.id)} className="text-xs text-red-500 hover:text-red-700 font-medium ml-2">Hapus</button>
                        </div>
                    ))}

                    <div className="flex flex-wrap gap-2 items-end">
                        <select value={scopeForm.roleCode}
                            onChange={e => setScopeForm(p => ({ ...p, roleCode: e.target.value, scopeType: e.target.value === 'WALI_KELAS' ? 'CLASS_GROUP' : 'DORM_ROOM', scopeId: '' }))}
                            className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
                            <option value="">Pilih role</option>
                            {scopeRoleCodes.map((code: string) => <option key={code} value={code}>{getRoleLabel(code)}</option>)}
                        </select>
                        {scopeForm.roleCode && (
                            <select value={scopeForm.scopeId} onChange={e => setScopeForm(p => ({ ...p, scopeId: e.target.value }))}
                                className="h-10 rounded-xl border border-slate-200 px-3 text-sm flex-1">
                                <option value="">Pilih {scopeForm.roleCode === 'WALI_KELAS' ? 'kelas' : 'kamar'}...</option>
                                {scopeForm.roleCode === 'WALI_KELAS'
                                    ? kelasQuery.data?.map((k: any) => <option key={k.id} value={String(k.id)}>{k.name}</option>)
                                    : kamarQuery.data?.map((k: any) => <option key={k.id} value={String(k.id)}>{k.name}</option>)
                                }
                            </select>
                        )}
                        <button onClick={() => { if (scopeForm.scopeId) { assignScope.mutate({ userId, ...scopeForm, scopeType: scopeForm.scopeType as 'CLASS_GROUP' | 'DORM_ROOM' | 'DORM_BUILDING' | 'DORM_COMPLEX' }); setScopeForm({ roleCode: '', scopeType: '', scopeId: '' }) } }}
                            disabled={!scopeForm.scopeId || assignScope.isPending}
                            className="h-10 px-4 rounded-xl bg-slate-700 text-white text-sm font-semibold disabled:opacity-50">
                            Tambah
                        </button>
                    </div>
                </div>
            )}

            {/* ── Keamanan & Status ─────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Keamanan & Status</h3>

                {/* Status toggles */}
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: 'Akun Aktif', key: 'isActive', value: user.isActive, desc: 'User bisa login' },
                        { label: 'Enabled', key: 'isEnabled', value: user.isEnabled, desc: 'Akun diaktivasi' },
                    ].map(toggle => (
                        <div key={toggle.key} className="bg-slate-50 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-700">{toggle.label}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{toggle.desc}</p>
                                </div>
                                <button onClick={() => updateUser.mutate({ id: userId, [toggle.key]: !toggle.value })}
                                    className={`relative h-6 w-11 rounded-full transition ${toggle.value ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${toggle.value ? 'left-[22px]' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Reset Password */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Reset Password</p>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password baru"
                            className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:outline-none" />
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Konfirmasi"
                            className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:outline-none" />
                    </div>
                    {pwMsg.text && <p className={`text-xs ${pwMsg.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{pwMsg.text}</p>}
                    <button onClick={handleResetPassword} disabled={resetPassword.isPending || !newPassword}
                        className="h-10 px-4 rounded-xl bg-slate-700 text-white text-sm font-semibold disabled:opacity-50">
                        {resetPassword.isPending ? 'Mereset...' : 'Reset Password'}
                    </button>
                </div>

                {/* Delete */}
                <div className="border-t border-slate-100 pt-3">
                    {!showDelete ? (
                        <button onClick={() => setShowDelete(true)}
                            className="h-10 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50">
                            Hapus User
                        </button>
                    ) : (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                            <p className="text-sm text-red-700">Yakin hapus user <strong>{user.fullName}</strong>? Tidak dapat dibatalkan.</p>
                            <div className="flex gap-2">
                                <button onClick={() => deleteUser.mutate(userId)} disabled={deleteUser.isPending}
                                    className="h-10 px-4 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
                                    {deleteUser.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                                </button>
                                <button onClick={() => setShowDelete(false)} className="h-10 px-4 rounded-xl border border-slate-200 text-sm text-slate-600">Batal</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
