'use client'

import { useSession, signOut } from 'next-auth/react'
import { getRoleLabel } from '@/utils/format'

export default function MobileProfilePage() {
    const { data: session } = useSession()

    return (
        <div className="space-y-4 animate-fade-in">
            <h1 className="text-xl font-bold text-slate-800">Profil</h1>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-3xl font-bold text-white mb-4">
                    {session?.user?.fullName?.charAt(0) ?? '?'}
                </div>
                <h2 className="text-xl font-bold text-slate-800">{session?.user?.fullName}</h2>
                <p className="text-sm text-slate-500 mt-1">{getRoleLabel(session?.user?.role ?? '')}</p>
                <p className="text-xs text-slate-400 mt-1">@{session?.user?.username}</p>
            </div>
            <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors"
            >
                Keluar dari Aplikasi
            </button>
        </div>
    )
}
