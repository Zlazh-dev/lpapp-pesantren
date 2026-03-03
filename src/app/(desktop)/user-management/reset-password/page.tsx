'use client'

import { useState } from 'react'
import { trpc } from '@/utils/trpc'

export default function UserManagementResetPasswordPage() {
    const usersQuery = trpc.user.list.useQuery()
    const resetPassword = trpc.user.resetPassword.useMutation()

    const [passwordDraft, setPasswordDraft] = useState<Record<string, string>>({})

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Reset Password</h1>
                <p className="mt-1 text-sm text-slate-500">Reset password user oleh admin.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                {usersQuery.isLoading && <p className="text-sm text-slate-500">Memuat user...</p>}
                {usersQuery.error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{usersQuery.error.message}</p>}
                {!usersQuery.isLoading && !usersQuery.error && (usersQuery.data?.length ?? 0) === 0 && (
                    <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">Belum ada user.</p>
                )}

                {!usersQuery.isLoading && !usersQuery.error && (usersQuery.data?.length ?? 0) > 0 && (
                    <div className="space-y-3">
                        {usersQuery.data?.map((user) => (
                            <div key={user.id} className="rounded-lg border border-slate-200 p-3">
                                <p className="text-sm font-semibold text-slate-800">{user.fullName}</p>
                                <p className="text-xs text-slate-500">{user.username}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <input
                                        type="password"
                                        minLength={6}
                                        value={passwordDraft[user.id] ?? ''}
                                        onChange={(event) =>
                                            setPasswordDraft((state) => ({
                                                ...state,
                                                [user.id]: event.target.value,
                                            }))
                                        }
                                        placeholder="Password baru"
                                        className="rounded border border-slate-200 px-3 py-2 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            resetPassword.mutate({
                                                id: user.id,
                                                newPassword: passwordDraft[user.id] ?? '',
                                            })
                                        }
                                        disabled={(passwordDraft[user.id] ?? '').length < 6 || resetPassword.isPending}
                                        className="rounded bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
