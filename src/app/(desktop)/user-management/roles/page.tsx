'use client'

import { useState } from 'react'
import { trpc } from '@/utils/trpc'

export default function UserManagementRolesPage() {
    const utils = trpc.useUtils()
    const rolesQuery = trpc.user.roles.list.useQuery()
    const createRole = trpc.user.roles.create.useMutation({ onSuccess: () => utils.user.roles.list.invalidate() })
    const deleteRole = trpc.user.roles.delete.useMutation({ onSuccess: () => utils.user.roles.list.invalidate() })

    const [code, setCode] = useState('')
    const [name, setName] = useState('')

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Manajemen Role</h1>
                <p className="mt-1 text-sm text-slate-500">Tambah dan hapus role dinamis sistem.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="rounded border border-slate-200 px-3 py-2 text-sm" />
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama role" className="rounded border border-slate-200 px-3 py-2 text-sm" />
                    <button
                        type="button"
                        onClick={() => createRole.mutate({ code, name })}
                        disabled={!code || !name || createRole.isPending}
                        className="rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        Tambah
                    </button>
                </div>

                {rolesQuery.isLoading && <p className="text-sm text-slate-500">Memuat role...</p>}
                {rolesQuery.error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{rolesQuery.error.message}</p>}
                {!rolesQuery.isLoading && !rolesQuery.error && (rolesQuery.data?.length ?? 0) === 0 && (
                    <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">Belum ada role.</p>
                )}

                {!rolesQuery.isLoading && !rolesQuery.error && (rolesQuery.data?.length ?? 0) > 0 && (
                    <div className="space-y-2">
                        {rolesQuery.data?.map((role) => (
                            <div key={role.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{role.code}</p>
                                    <p className="text-xs text-slate-500">{role.name}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => deleteRole.mutate(role.id)}
                                    disabled={role._count.userRoles > 0}
                                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 disabled:opacity-50"
                                >
                                    Hapus
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
