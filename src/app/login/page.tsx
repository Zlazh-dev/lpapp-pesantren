'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { getSession, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { hasPathAccess, resolveFirstAccessibleRoute } from '@/lib/access-routing'
import { trpc } from '@/utils/trpc'
import gsap from 'gsap'
import { Icon } from '@/components/icons'
import { TAB_SESSION_KEY } from '@/components/TabSessionGuard'
import LoginIntro from './LoginIntro'

// ─── Cursor spotlight hook ───────────────────────────────────────────────────
// Tracks mouse position relative to the card and updates a CSS custom property
// to drive a radial-gradient "spotlight". Effect is intentionally very subtle
// (opacity 8%) — the goal is texture, not theatrics.
function useSpotlight(cardRef: React.RefObject<HTMLDivElement | null>) {
    useEffect(() => {
        const card = cardRef.current
        if (!card) return
        const move = (e: MouseEvent) => {
            const rect = card.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            card.style.setProperty('--spotlight-x', `${x}px`)
            card.style.setProperty('--spotlight-y', `${y}px`)
        }
        card.addEventListener('mousemove', move)
        return () => card.removeEventListener('mousemove', move)
    }, [cardRef])
}

// ─── Card tilt hook ──────────────────────────────────────────────────────────
// Uses GSAP to lerp the card rotation toward the cursor offset.
// Max tilt is ±7 degrees. Disabled on touch devices.
function useCardTilt(cardRef: React.RefObject<HTMLDivElement | null>) {
    useEffect(() => {
        const card = cardRef.current
        if (!card || window.matchMedia('(hover: none)').matches) return

        let animating = true
        let targetX = 0, targetY = 0, currentX = 0, currentY = 0

        const onMove = (e: MouseEvent) => {
            const rect = card.getBoundingClientRect()
            const cx = rect.left + rect.width / 2
            const cy = rect.top + rect.height / 2
            // Normalize to [-1, 1] range then scale to degrees
            targetX = ((e.clientY - cy) / (rect.height / 2)) * 7
            targetY = -((e.clientX - cx) / (rect.width / 2)) * 7
        }

        const onLeave = () => { targetX = 0; targetY = 0 }

        // RAF loop for smooth interpolation — frame-safe GSAP alternative
        const raf = () => {
            if (!animating) return
            currentX += (targetX - currentX) * 0.08
            currentY += (targetY - currentY) * 0.08
            card.style.transform = `perspective(1200px) rotateX(${currentX}deg) rotateY(${currentY}deg)`
            requestAnimationFrame(raf)
        }

        card.addEventListener('mousemove', onMove)
        card.addEventListener('mouseleave', onLeave)
        raf()

        return () => {
            animating = false
            card.removeEventListener('mousemove', onMove)
            card.removeEventListener('mouseleave', onLeave)
            card.style.transform = ''
        }
    }, [cardRef])
}

// ─── Eye icon ───────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
    return open ? (
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
        </svg>
    ) : (
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    )
}

// ─── Form component ──────────────────────────────────────────────────────────
function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl')

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Refs for animation targets
    const cardRef = useRef<HTMLDivElement>(null)
    const headingRef = useRef<HTMLDivElement>(null)
    const inputsRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const errorRef = useRef<HTMLDivElement>(null)
    const bgOrb1Ref = useRef<HTMLDivElement>(null)
    const bgOrb2Ref = useRef<HTMLDivElement>(null)
    const leftPanelRef = useRef<HTMLDivElement>(null)

    // Fetch logo — same source as the sidebar (trpc.settings.get 'logo_url')
    const { data: logoUrl } = trpc.settings.get.useQuery('logo_url')

    // Attach interactive hooks
    useSpotlight(cardRef)
    useCardTilt(cardRef)

    // ── Entrance animation (GSAP) ─────────────────────────────────────────────
    // Timeline: orbs drift in → left panel slides in → card fades+rises → heading → form fields stagger
    // Duration kept between 0.6–1s. power3.out for calm deceleration.
    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

            // Slow ambient orb drift — barely noticeable but adds life
            gsap.to(bgOrb1Ref.current, { x: 30, y: -20, duration: 12, repeat: -1, yoyo: true, ease: 'sine.inOut' })
            gsap.to(bgOrb2Ref.current, { x: -25, y: 15, duration: 14, repeat: -1, yoyo: true, ease: 'sine.inOut' })

            // Left panel slides in from left
            tl.fromTo(leftPanelRef.current,
                { x: -40, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.8 }
            )

            // Card rises + fades in
            tl.fromTo(cardRef.current,
                { y: 28, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.75 },
                '-=0.4'
            )

            // Heading slides up
            tl.fromTo(headingRef.current,
                { y: 12, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.55 },
                '-=0.3'
            )

            // Form elements stagger in
            if (inputsRef.current) {
                tl.fromTo(
                    inputsRef.current.children,
                    { y: 10, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.45, stagger: 0.08 },
                    '-=0.2'
                )
            }
        })

        return () => ctx.revert() // GSAP cleanup on unmount
    }, [])

    // ── Submit handler ────────────────────────────────────────────────────────
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (loading) return
        setError('')
        setLoading(true)

        // Subtle card press — scale 0.99 on click start
        gsap.to(cardRef.current, { scale: 0.99, duration: 0.15, ease: 'power2.in' })

        try {
            const result = await signIn('credentials', { username, password, redirect: false })

            if (result?.error) {
                setError(result.error)
                setLoading(false)

                // Restore card scale
                gsap.to(cardRef.current, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' })

                // Very subtle shake on error — short travel, rapid
                gsap.fromTo(cardRef.current,
                    { x: 0 },
                    { x: 6, duration: 0.05, repeat: 5, yoyo: true, ease: 'power1.inOut', onComplete: () => { gsap.set(cardRef.current, { x: 0 }) } }
                )

                // Error message slides in
                if (errorRef.current) {
                    gsap.fromTo(errorRef.current,
                        { y: -6, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }
                    )
                }
            } else {
                // Mark this tab as having an active session.
                // TabSessionGuard in the layouts checks for this marker —
                // if missing (tab was closed), it signs the user out.
                sessionStorage.setItem(TAB_SESSION_KEY, '1')

                // Success: card fades + lifts away, then navigate
                gsap.to(cardRef.current, {
                    y: -20, opacity: 0, duration: 0.5, ease: 'power3.in',
                    onComplete: () => void (async () => {
                        const session = await getSession()
                        const roleCodes = session?.user?.roleCodes ?? session?.user?.roles ?? (session?.user?.role ? [session.user.role] : [])
                        const allowedPagePaths = session?.user?.allowedPagePaths ?? []
                        const preferredRoute = resolveFirstAccessibleRoute({ roleCodes, allowedPagePaths })
                        const safeCallback = callbackUrl?.startsWith('/') ? callbackUrl : null
                        const targetRoute = safeCallback && hasPathAccess(safeCallback, allowedPagePaths) ? safeCallback : preferredRoute
                        router.push(targetRoute)
                        router.refresh()
                    })()
                })
            }
        } catch {
            setError('Terjadi kesalahan. Silakan coba lagi.')
            setLoading(false)
            gsap.to(cardRef.current, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' })
        }
    }, [username, password, loading, callbackUrl, router])


    return (
        <div className="min-h-screen flex bg-[#0a0a0f] overflow-hidden relative">
            {/* ── Ambient background orbs ───────────────────────────────── */}
            {/* Slow-moving soft blurs that give the dark background depth */}
            <div ref={bgOrb1Ref} className="pointer-events-none absolute top-[-15%] left-[-5%] w-[55%] h-[55%] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 72%)' }} />
            <div ref={bgOrb2Ref} className="pointer-events-none absolute bottom-[-15%] right-[-5%] w-[50%] h-[50%] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(6,78,59,0.14) 0%, transparent 72%)' }} />

            {/* ── Left branding panel ───────────────────────────────────── */}
            <div ref={leftPanelRef} className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12"
                style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Subtle vertical gradient line accent */}
                <div className="absolute right-0 top-1/4 h-1/2 w-px"
                    style={{ background: 'linear-gradient(to bottom, transparent, rgba(20,184,166,0.4), transparent)' }} />

                {/* Logo mark — same conditional as sidebar */}
                <div>
                    <div className="flex items-center gap-3">
                        {logoUrl ? (
                            <Image src={logoUrl} alt="Logo" width={36} height={36} className="w-9 h-9 object-contain flex-shrink-0" />
                        ) : (
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                                style={{ background: 'linear-gradient(135deg, #14b8a6, #059669)' }}>
                                <Icon name="akademik" size={20} className="text-white" />
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-bold text-emerald-400">LpApp.</p>
                            <p className="text-[10px] text-white/40">Beta Version</p>
                        </div>
                    </div>
                </div>

                {/* Main headline */}
                <div className="space-y-6">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.25em] text-teal-400/80 uppercase mb-4">Sistem Manajemen</p>
                        <h1 className="text-4xl font-bold text-white leading-tight">
                            Lp<br />
                            <span style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text', backgroundImage: 'linear-gradient(135deg, #2dd4bf, #34d399)' }}>
                                App.
                            </span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-4 leading-relaxed max-w-xs">
                            Platform terpadu untuk manajemen santri, akademik, keuangan, dan operasional pesantren.
                        </p>
                    </div>

                    {/* Feature highlights */}
                    <div className="space-y-3">
                        {['Manajemen Santri & Akademik', 'Perbendaharaan & Keuangan', 'Laporan & Analitik Real-time'].map(feat => (
                            <div key={feat} className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-teal-400/70" />
                                <span className="text-sm text-slate-400">{feat}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-xs text-slate-600">© 2025 LPApp · Pesantren Management System</p>
            </div>

            {/* ── Right: Login card ─────────────────────────────────────── */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
                <div
                    ref={cardRef}
                    /* Spotlight uses CSS custom props set by the hook */
                    style={{
                        background: 'radial-gradient(circle 280px at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(20,184,166,0.08) 0%, transparent 72%), rgba(255,255,255,0.035)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        transformStyle: 'preserve-3d',
                        willChange: 'transform',
                    }}
                    className="w-full max-w-md rounded-3xl p-8 lg:p-10 shadow-2xl"
                >
                    {/* Mobile logo (visible only < lg) — same logic as sidebar */}
                    <div className="lg:hidden flex items-center gap-2.5 mb-8">
                        {logoUrl ? (
                            <Image src={logoUrl} alt="Logo" width={32} height={32} className="w-8 h-8 object-contain flex-shrink-0" />
                        ) : (
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                                style={{ background: 'linear-gradient(135deg, #14b8a6, #059669)' }}>
                                <Icon name="akademik" size={18} className="text-white" />
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-bold text-emerald-400">LpApp.</p>
                            <p className="text-[10px] text-white/40">Beta Version</p>
                        </div>
                    </div>

                    {/* Heading */}
                    <div ref={headingRef} className="mb-8">
                        <h2 className="text-2xl font-bold text-white">Selamat Datang</h2>
                        <p className="text-slate-400 text-sm mt-1.5">Masuk ke Sistem LpApp.</p>
                    </div>

                    {/* Error message — animated in via GSAP on error */}
                    {error && (
                        <div ref={errorRef}
                            className="mb-6 px-4 py-3 rounded-xl text-sm text-red-300 flex items-center gap-2.5"
                            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div ref={inputsRef} className="space-y-5">
                            {/* Username */}
                            <div className="group">
                                <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide uppercase">Username</label>
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors duration-200">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="username"
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="Masukkan username"
                                        required
                                        autoComplete="username"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                        }}
                                        onFocus={e => { e.currentTarget.style.border = '1px solid rgba(20,184,166,0.5)'; e.currentTarget.style.background = 'rgba(20,184,166,0.06)' }}
                                        onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="group">
                                <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide uppercase">Password</label>
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors duration-200">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Masukkan password"
                                        required
                                        autoComplete="current-password"
                                        className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                        }}
                                        onFocus={e => { e.currentTarget.style.border = '1px solid rgba(20,184,166,0.5)'; e.currentTarget.style.background = 'rgba(20,184,166,0.06)' }}
                                        onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-150">
                                        <EyeIcon open={showPassword} />
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                ref={buttonRef}
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-opacity duration-200 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #059669 100%)', boxShadow: '0 8px 32px rgba(20,184,166,0.25)' }}
                            >
                                {/* Inner shine overlay on hover */}
                                <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%)' }} />
                                <span className="relative flex items-center justify-center gap-2">
                                    {loading ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Memproses...
                                        </>
                                    ) : 'Masuk'}
                                </span>
                            </button>
                        </div>
                    </form>

                    {/* Subtle divider */}
                    <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-center text-xs text-slate-600">
                            LpApp. &copy; 2025
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    const [showIntro, setShowIntro] = useState(true)

    return (
        <>
            {/* Intro loader — unmounted after slide-up exit animation completes */}
            {showIntro && <LoginIntro onDone={() => setShowIntro(false)} />}

            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                    <div className="w-6 h-6 rounded-full border-2 border-teal-500/40 border-t-teal-400 animate-spin" />
                </div>
            }>
                <LoginForm />
            </Suspense>
        </>
    )
}
