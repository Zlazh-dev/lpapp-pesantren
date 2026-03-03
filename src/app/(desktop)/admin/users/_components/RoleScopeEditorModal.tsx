'use client'

import { useState } from 'react'
import { Icon } from '@/components/icons'
import { trpc } from '@/utils/trpc'

type ScopeEntry = { id: string; roleCode: string; scopeType: string; scopeId: string }

type Props = {
    userId: string
    userName: string
    userRoleCodes: string[]
    currentScopes: ScopeEntry[]
    onClose: () => void
    onSaved: () => void
}

const SCOPE_CONFIG: Record<string, { scopeType: string; label: string; targetLabel: string }> = {
    WALI_KELAS: { scopeType: 'CLASS_GROUP', label: 'Wali Kelas', targetLabel: 'Rombel' },
    PEMBIMBING_KAMAR: { scopeType: 'DORM_ROOM', label: 'Pembimbing Kamar', targetLabel: 'Kamar' },
}

export default function RoleScopeEditorModal({ userId, userName, userRoleCodes, currentScopes, onClose, onSaved }: Props) {
    const [selectedRole, setSelectedRole] = useState(
        userRoleCodes.find(r => SCOPE_CONFIG[r]) ?? ''
    )
    const [selectedScopeId, setSelectedScopeId] = useState('')

    const config = SCOPE_CONFIG[selectedRole]

    // Fetch targets based on selected role
    const { data: classGroups } = trpc.academic.classes.listAll.useQuery(undefined, {
        enabled: config?.scopeType === 'CLASS_GROUP',
    })
    const { data: dormRooms } = trpc.dorm.room.list.useQuery(undefined, {
        enabled: config?.scopeType === 'DORM_ROOM',
    })

    const assignMut = trpc.user.scope.assign.useMutation({ onSuccess: onSaved })
    const removeMut = trpc.user.scope.remove.useMutation({ onSuccess: onSaved })

    const scopeableRoles = userRoleCodes.filter(r => SCOPE_CONFIG[r])
    const filteredScopes = currentScopes.filter(s => !selectedRole || s.roleCode === selectedRole)

    const getTargetLabel = (scope: ScopeEntry) => {
        if (scope.scopeType === 'CLASS_GROUP') {
            const cg = classGroups?.find((c: any) => c.id === scope.scopeId)
            return cg ? `${cg.grade?.level?.name ?? ''} ${cg.grade?.number ?? ''}-${cg.suffix}` : scope.scopeId.slice(0, 8)
        }
        if (scope.scopeType === 'DORM_ROOM') {
            const room = dormRooms?.find((r: any) => r.id === parseInt(scope.scopeId))
            return room ? room.name : scope.scopeId
        }
        return scope.scopeId.slice(0, 8)
    }

    const handleAssign = () => {
        if (!config || !selectedScopeId) return
        assignMut.mutate({
            userId,
            roleCode: selectedRole,
            scopeType: config.scopeType as 'CLASS_GROUP' | 'DORM_ROOM' | 'DORM_BUILDING',
            scopeId: selectedScopeId,
        })
        setSelectedScopeId('')
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">Scope Assignment: {userName}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="close" size={20} className="text-current" /></button>
                </div>

                {scopeableRoles.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <p className="font-medium">Tidak ada role yang mendukung scope</p>
                        <p className="text-sm mt-1">Assign role WALI_KELAS atau PEMBIMBING_KAMAR terlebih dahulu</p>
                    </div>
                ) : (
                    <>
                        {/* Role selector */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Role</label>
                            <div className="flex gap-2 flex-wrap">
                                {scopeableRoles.map(code => (
                                    <button
                                        key={code}
                                        onClick={() => { setSelectedRole(code); setSelectedScopeId('') }}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${selectedRole === code ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {SCOPE_CONFIG[code]?.label ?? code}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Existing scopes */}
                        {filteredScopes.length > 0 && (
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Scope Aktif</label>
                                <div className="flex flex-wrap gap-2">
                                    {filteredScopes.map(s => (
                                        <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium">
                                            {SCOPE_CONFIG[s.roleCode]?.label}: {getTargetLabel(s)}
                                            <button
                                                onClick={() => removeMut.mutate(s.id)}
                                                disabled={removeMut.isPending}
                                                className="text-teal-400 hover:text-red-500 font-bold ml-1 disabled:opacity-50"
                                            >
                                                <Icon name="close" size={14} className="text-current" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add new scope */}
                        {config && (
                            <div className="flex items-end gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
                                        Tambah {config.targetLabel}
                                    </label>
                                    <select
                                        value={selectedScopeId}
                                        onChange={e => setSelectedScopeId(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                                    >
                                        <option value="">Pilih {config.targetLabel}...</option>
                                        {config.scopeType === 'CLASS_GROUP' && classGroups?.map((cg: any) => (
                                            <option key={cg.id} value={cg.id}>
                                                {cg.grade?.level?.name ?? ''} {cg.grade?.number ?? ''}-{cg.suffix}
                                            </option>
                                        ))}
                                        {config.scopeType === 'DORM_ROOM' && dormRooms?.map((r: any) => (
                                            <option key={r.id} value={String(r.id)}>
                                                {r.name} ({r.floor?.building?.name ?? ''})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={handleAssign}
                                    disabled={!selectedScopeId || assignMut.isPending}
                                    className="px-4 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 disabled:opacity-50 shrink-0"
                                >
                                    {assignMut.isPending ? '...' : '+ Assign'}
                                </button>
                            </div>
                        )}
                    </>
                )}

                <div className="pt-2 border-t border-slate-100">
                    <button onClick={onClose} className="w-full px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    )
}
