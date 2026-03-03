'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/utils/trpc'

export default function UserManagementInviteLinksPage() {
    const utils = trpc.useUtils()
    const inviteQuery = trpc.invite.listInviteLinks.useQuery()
    const createInvite = trpc.invite.createInviteLink.useMutation({
        onSuccess: () => utils.invite.listInviteLinks.invalidate(),
    })
    const revokeInvite = trpc.invite.revokeInviteLink.useMutation({
        onSuccess: () => utils.invite.listInviteLinks.invalidate(),
    })

    const [expiryDate, setExpiryDate] = useState(() => {
        const date = new Date()
        date.setDate(date.getDate() + 7)
        return date.toISOString().slice(0, 10)
    })
    const [useLimit, setUseLimit] = useState('')

    const createdLinkUrl = useMemo(() => createInvite.data?.url ?? '', [createInvite.data?.url])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Generate Link Untuk Pendaftaran User</h1>
                <p className="mt-1 text-sm text-slate-500">Buat, lihat, dan cabut link invite pendaftaran user baru.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <input
                        type="date"
                        value={expiryDate}
                        onChange={(event) => setExpiryDate(event.target.value)}
                        className="rounded border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                        type="number"
                        min={1}
                        value={useLimit}
                        onChange={(event) => setUseLimit(event.target.value)}
                        placeholder="Use limit (opsional)"
                        className="rounded border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button
                        type="button"
                        onClick={() =>
                            createInvite.mutate({
                                expiry: new Date(`${expiryDate}T23:59:59`),
                                useLimit: useLimit ? Number(useLimit) : null,
                            })
                        }
                        disabled={createInvite.isPending}
                        className="rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        Generate
                    </button>
                </div>

                {createdLinkUrl && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                        <p className="break-all text-slate-700">{createdLinkUrl}</p>
                        <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(createdLinkUrl)}
                            className="mt-2 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                        >
                            Salin URL
                        </button>
                    </div>
                )}

                {inviteQuery.isLoading && <p className="text-sm text-slate-500">Memuat data link invite...</p>}
                {inviteQuery.error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{inviteQuery.error.message}</p>}
                {!inviteQuery.isLoading && !inviteQuery.error && (inviteQuery.data?.length ?? 0) === 0 && (
                    <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">Belum ada invite link.</p>
                )}

                {!inviteQuery.isLoading && !inviteQuery.error && (inviteQuery.data?.length ?? 0) > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px]">
                            <thead className="border-b border-slate-200">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Dibuat Oleh</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Expiry</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Use Limit</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Used</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {inviteQuery.data?.map((invite) => (
                                    <tr key={invite.id}>
                                        <td className="px-3 py-3 text-sm text-slate-700">{invite.createdBy.fullName}</td>
                                        <td className="px-3 py-3 text-sm text-slate-700">{new Date(invite.expiry).toLocaleString('id-ID')}</td>
                                        <td className="px-3 py-3 text-sm text-slate-700">{invite.useLimit ?? 'Tanpa batas'}</td>
                                        <td className="px-3 py-3 text-sm text-slate-700">{invite.usedCount}</td>
                                        <td className="px-3 py-3 text-sm text-slate-700">
                                            {invite.isRevoked
                                                ? 'Dicabut'
                                                : invite.isExpired
                                                    ? 'Kedaluwarsa'
                                                    : invite.isLimitReached
                                                        ? 'Batas tercapai'
                                                        : 'Aktif'}
                                        </td>
                                        <td className="px-3 py-3 text-sm">
                                            <button
                                                type="button"
                                                onClick={() => revokeInvite.mutate({ id: invite.id })}
                                                disabled={invite.isRevoked}
                                                className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 disabled:opacity-50"
                                            >
                                                Revoke
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
