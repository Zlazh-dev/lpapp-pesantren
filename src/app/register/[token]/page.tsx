'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'

export default function RegisterFromInvitePage() {
    const params = useParams<{ token: string }>()
    const router = useRouter()
    const token = useMemo(() => (typeof params?.token === 'string' ? params.token : ''), [params?.token])

    const [fullName, setFullName] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const validateToken = trpc.invite.validateInviteToken.useQuery(
        { token },
        { enabled: token.length > 0, retry: false }
    )

    const registerMutation = trpc.auth.registerFromInvite.useMutation({
        onSuccess: (result) => {
            router.push(`/register/${token}/request-role?k=${encodeURIComponent(result.requestToken)}`)
        },
        onError: (error) => {
            setErrorMessage(error.message)
        },
    })

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        setErrorMessage('')

        if (password !== confirmPassword) {
            setErrorMessage('Konfirmasi password tidak sama.')
            return
        }

        registerMutation.mutate({
            token,
            userData: {
                fullName,
                username,
                password,
            },
        })
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-bold text-slate-900">Registrasi Pengguna</h1>
                <p className="mt-2 text-sm text-slate-500">
                    Isi data akun dari link undangan admin.
                </p>

                {validateToken.isLoading && (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        Memuat validasi link undangan...
                    </div>
                )}

                {!validateToken.isLoading && validateToken.data?.valid === false && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-medium text-red-700">{validateToken.data.reason ?? 'Link tidak valid.'}</p>
                        <div className="mt-3">
                            <button
                                type="button"
                                onClick={() => validateToken.refetch()}
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                            >
                                Muat ulang
                            </button>
                        </div>
                    </div>
                )}

                {!validateToken.isLoading && validateToken.data?.valid && (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
                                Nama lengkap
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                required
                                value={fullName}
                                onChange={(event) => setFullName(event.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                placeholder="Contoh: Ahmad Fulan"
                            />
                        </div>

                        <div>
                            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                required
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                placeholder="minimal 3 karakter"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                placeholder="minimal 6 karakter"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
                                Konfirmasi password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                placeholder="ulangi password"
                            />
                        </div>

                        {errorMessage && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={registerMutation.isPending}
                            className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {registerMutation.isPending ? 'Memproses...' : 'Lanjutkan'}
                        </button>
                    </form>
                )}

                <p className="mt-6 text-sm text-slate-500">
                    Sudah punya akun?{' '}
                    <Link href="/login" className="font-medium text-teal-700 hover:underline">
                        Masuk
                    </Link>
                </p>
            </div>
        </main>
    )
}
