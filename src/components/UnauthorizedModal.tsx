'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import gsap from 'gsap'
import { TAB_SESSION_KEY } from '@/components/TabSessionGuard'

// ─── UnauthorizedModal ───────────────────────────────────────────────────────
// Listens for the 'app:401' custom event fired by the tRPC httpBatchLink
// custom fetch wrapper whenever any API call returns 401 Unauthorized.
//
// On trigger:
//   1. Shows a dark overlay modal
//   2. Counts down 3 → 2 → 1
//   3. GSAP-animates the modal out
//   4. Navigates to / (landing page)
//
// Mount this once in the root layout so it covers both desktop and mobile.

const REDIRECT_SECONDS = 3

export default function UnauthorizedModal() {
    const router = useRouter()
    const [visible, setVisible] = useState(false)
    const [count, setCount] = useState(REDIRECT_SECONDS)
    const overlayRef = useRef<HTMLDivElement>(null)
    const cardRef = useRef<HTMLDivElement>(null)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const activeRef = useRef(false) // prevents duplicate triggers

    const dismiss = (navigate = true) => {
        if (!overlayRef.current || !cardRef.current) return
        if (timerRef.current) clearInterval(timerRef.current)

        // Animate out: card falls + fades, overlay fades
        gsap.to(cardRef.current, { y: 20, opacity: 0, duration: 0.35, ease: 'power2.in' })
        gsap.to(overlayRef.current, {
            opacity: 0, duration: 0.35, delay: 0.1, ease: 'power2.in',
            onComplete: () => void (async () => {
                setVisible(false)
                setCount(REDIRECT_SECONDS)
                activeRef.current = false
                if (navigate) {
                    // Sign out (clear session cookie) and remove the tab marker
                    // so TabSessionGuard doesn't race us back to /login.
                    sessionStorage.removeItem(TAB_SESSION_KEY)
                    await signOut({ redirect: false })
                    router.push('/landing')   // → landing page
                }
            })()
        })
    }

    // Listen for the global 401 event dispatched by the custom fetch wrapper
    useEffect(() => {
        const handler = () => {
            // Debounce: ignore if modal is already active
            if (activeRef.current) return
            activeRef.current = true
            setVisible(true)
            setCount(REDIRECT_SECONDS)
        }
        window.addEventListener('app:401', handler)
        return () => window.removeEventListener('app:401', handler)
    }, [])

    // Countdown timer + entrance animation when modal becomes visible
    useEffect(() => {
        if (!visible) return

        // GSAP entrance: overlay fades in, card rises
        gsap.fromTo(overlayRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: 'power2.out' }
        )
        gsap.fromTo(cardRef.current,
            { y: -24, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' }
        )

        // Countdown
        let remaining = REDIRECT_SECONDS
        timerRef.current = setInterval(() => {
            remaining -= 1
            setCount(remaining)
            if (remaining <= 0) {
                clearInterval(timerRef.current!)
                dismiss(true)
            }
        }, 1000)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible])

    if (!visible) return null

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
            style={{ background: 'rgba(5,7,14,0.85)', backdropFilter: 'blur(12px)' }}
        >
            <div
                ref={cardRef}
                className="w-full max-w-sm rounded-3xl p-8 text-center"
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    backdropFilter: 'blur(24px)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                }}
            >
                {/* Icon */}
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>

                {/* Text */}
                <h2 className="mb-2 text-xl font-bold text-white">Sesi Tidak Valid</h2>
                <p className="mb-6 text-sm leading-relaxed text-slate-400">
                    Anda tidak memiliki akses atau sesi telah berakhir.
                    <br />
                    Anda akan diarahkan ke halaman awal.
                </p>

                {/* Countdown ring */}
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
                    style={{
                        background: 'conic-gradient(#14b8a6 0%, rgba(20,184,166,0.15) 0%)',
                        border: '2px solid rgba(20,184,166,0.25)',
                    }}>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full"
                        style={{ background: '#08090e' }}>
                        <span className="text-4xl font-black text-teal-400">{count}</span>
                    </div>
                </div>

                <p className="mb-6 text-xs text-slate-500">
                    Dialihkan ke halaman awal dalam <span className="text-teal-400 font-semibold">{count}</span> detik…
                </p>

                {/* Manual dismiss button */}
                <button
                    onClick={() => dismiss(true)}
                    className="w-full h-11 rounded-xl text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #059669)' }}>
                    Ke Halaman Awal Sekarang
                </button>
            </div>
        </div>
    )
}
