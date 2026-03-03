'use client'

import { useState } from 'react'
import { Icon } from '@/components/icons'
import { trpc } from '@/utils/trpc'

type Props = {
    userId: string
    userName: string
    currentRoleIds: string[]
    onClose: () => void
    onSaved: () => void
}

export default function UserRoleEditorModal({ userId, userName, currentRoleIds, onClose, onSaved }: Props) {
    const { data: roles } = trpc.user.roles.list.useQuery()
    const [selected, setSelected] = useState<string[]>(currentRoleIds)
    const updateMut = trpc.user.updateRoles.useMutation({
        onSuccess: () => { onSaved(); onClose() },
    })

    const toggle = (roleId: string) => {
        setSelected(prev =>
            prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
        )
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">Edit Role: {userName}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="close" size={20} className="text-current" /></button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {roles?.map(role => (
                        <label key={role.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selected.includes(role.id) ? 'border-teal-400 bg-teal-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                            <input
                                type="checkbox"
                                checked={selected.includes(role.id)}
                                onChange={() => toggle(role.id)}
                                className="rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                            />
                            <div>
                                <p className="text-sm font-medium text-slate-700">{role.name}</p>
                                <p className="text-xs text-slate-400 font-mono">{role.code}</p>
                            </div>
                            <span className="ml-auto text-xs text-slate-400">{role._count.userRoles} user</span>
                        </label>
                    ))}
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200">Batal</button>
                    <button
                        onClick={() => updateMut.mutate({ userId, roleIds: selected })}
                        disabled={updateMut.isPending || selected.length === 0}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-teal-500 text-white font-semibold text-sm hover:bg-teal-600 disabled:opacity-50"
                    >
                        {updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>
        </div>
    )
}
