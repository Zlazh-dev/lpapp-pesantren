'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { trpc } from '@/utils/trpc'

export default function RegisterRequestRolePage() {
    const searchParams = useSearchParams()
    const requestToken = useMemo(() => searchParams.get('k') ?? '', [searchParams])

    const [selectedRoles, setSelectedRoles] = useState<string[]>([])
    const [note, setNote] = useState('')
    const [submitMessage, setSubmitMessage] = useState('')

    const formContext = trpc.roleRequest.getPublicFormContext.useQuery(
        { requestToken },
        { enabled: requestToken.length > 0, retry: false }
    )
    const publicContext = formContext.data?.valid ? formContext.data : null
    const publicUser = publicContext?.user
    const pendingRequest = publicContext?.pendingRequest ?? null

    const createRequest = trpc.roleRequest.submitRoleRequestByToken.useMutation({
        onSuccess: () => {
            setSubmitMessage('Permintaan role dikirim. Tunggu persetujuan admin sebelum login.')
        },
    })

    const toggleRole = (code: string) => {
        setSelectedRoles((current) =>
            current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
        )
    }

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        setSubmitMessage('')
        createRequest.mutate({
            requestToken,
            requestedRoleCodes: selectedRoles,
            note: note.trim() || undefined,
        })
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-bold text-slate-900">Permintaan Role</h1>
                <p className="mt-2 text-sm text-slate-500">
                    Pilih role yang dibutuhkan. Akun baru bisa login setelah disetujui admin.
                </p>

                {!requestToken && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Token permintaan role tidak ditemukan.
                    </div>
                )}

                {requestToken && formContext.isLoading && (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        Memuat data permintaan role...
                    </div>
                )}

                {requestToken && !formContext.isLoading && formContext.data?.valid === false && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-medium text-red-700">
                            {formContext.data.reason ?? 'Gagal memuat data permintaan role.'}
                        </p>
                        <div className="mt-3">
                            <button
                                type="button"
                                onClick={() => formContext.refetch()}
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                            >
                                Muat ulang
                            </button>
                        </div>
                    </div>
                )}

                {requestToken && publicContext && publicUser && (
                    <>
                        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                            <p><span className="font-medium">Nama:</span> {publicUser.fullName}</p>
                            <p className="mt-1"><span className="font-medium">Username:</span> {publicUser.username}</p>
                        </div>

                        {publicUser.isEnabled && (
                            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                                Akun sudah aktif. Silakan lanjut login.
                            </div>
                        )}

                        {!publicUser.isEnabled && pendingRequest && (
                            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                                Permintaan role sudah dikirim pada {new Date(pendingRequest.createdAt).toLocaleString('id-ID')}.
                                Tunggu persetujuan admin.
                            </div>
                        )}

                        {!publicUser.isEnabled && !pendingRequest && !submitMessage && (
                            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                <div>
                                    <p className="mb-2 text-sm font-medium text-slate-700">Pilih role</p>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {publicContext.roles.map((role) => (
                                            <label
                                                key={role.code}
                                                className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRoles.includes(role.code)}
                                                    onChange={() => toggleRole(role.code)}
                                                    className="mt-0.5"
                                                />
                                                <span>
                                                    <span className="font-medium text-slate-800">{role.name}</span>
                                                    <span className="block text-xs text-slate-500">{role.code}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="note" className="mb-1 block text-sm font-medium text-slate-700">
                                        Catatan (opsional)
                                    </label>
                                    <textarea
                                        id="note"
                                        value={note}
                                        onChange={(event) => setNote(event.target.value)}
                                        rows={3}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        placeholder="Tuliskan unit atau tugas utama Anda"
                                    />
                                </div>

                                {createRequest.error?.message && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                        {createRequest.error.message}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={createRequest.isPending || selectedRoles.length === 0}
                                    className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {createRequest.isPending ? 'Mengirim...' : 'Kirim Permintaan Role'}
                                </button>
                            </form>
                        )}

                        {submitMessage && (
                            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                                {submitMessage}
                            </div>
                        )}
                    </>
                )}

                <p className="mt-6 text-sm text-slate-500">
                    Kembali ke{' '}
                    <Link href="/login" className="font-medium text-teal-700 hover:underline">
                        halaman login
                    </Link>
                    .
                </p>
            </div>
        </main>
    )
}
