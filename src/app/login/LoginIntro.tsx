'use client'

// ─── LoginIntro ───────────────────────────────────────────────────────────────
// Full-screen intro loading animation that plays on the login page.
//
// Sequence (total ~2.4s):
//   0.0s  Dark panel covers the screen
//   0.2s  Logo mark scales + fades in
//   0.5s  "LpApp." word-reveal (character clip)
//   0.7s  Tagline fades in
//   0.9s  Progress bar begins filling (duration ~1.0s)
//   1.1s  Counter ticks 0 → 100 in sync with bar
//   2.0s  Panel slides UP (translateY -100vh) → login form revealed
//
// Props:
//   onDone  — callback fired when exit animation completes (parent unmounts this)

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { trpc } from '@/utils/trpc'
import gsap from 'gsap'

interface Props {
    onDone: () => void
}

export default function LoginIntro({ onDone }: Props) {
    const panelRef = useRef<HTMLDivElement>(null)
    const logoBoxRef = useRef<HTMLDivElement>(null)
    const logotextRef = useRef<HTMLParagraphElement>(null)
    const taglineRef = useRef<HTMLParagraphElement>(null)
    const barRef = useRef<HTMLDivElement>(null)
    const barFillRef = useRef<HTMLDivElement>(null)
    const counterRef = useRef<HTMLSpanElement>(null)
    const [counter, setCounter] = useState(0)

    // Fetch logo — same source as the sidebar
    const { data: logoUrl } = trpc.settings.get.useQuery('logo_url')

    const runExit = useCallback(() => {
        if (!panelRef.current) return
        // Slide the entire panel up — like a curtain rising
        gsap.to(panelRef.current, {
            yPercent: -105,
            duration: 0.9,
            ease: 'power4.inOut',
            onComplete: onDone,
        })
    }, [onDone])

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline()

            // 1. Logo box: scale from 0.6 + fade in
            tl.fromTo(logoBoxRef.current,
                { scale: 0.6, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.4)' },
                0.18
            )

            // 2. Logo text: clip reveal from left
            tl.fromTo(logotextRef.current,
                { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
                { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'power3.out' },
                0.55
            )

            // 3. Tagline fade in
            tl.fromTo(taglineRef.current,
                { y: 10, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' },
                0.78
            )

            // 4. Progress bar fill: 0 → 100%
            tl.fromTo(barFillRef.current,
                { scaleX: 0 },
                {
                    scaleX: 1,
                    duration: 1.05,
                    ease: 'power1.inOut',
                    transformOrigin: 'left center',
                },
                0.9
            )

            // 5. Counter: 0 → 100 in sync with bar
            tl.to({ val: 0 }, {
                val: 100,
                duration: 1.05,
                ease: 'power1.inOut',
                onUpdate: function () {
                    setCounter(Math.round(this.targets()[0].val))
                },
            }, 0.9)

            // 6. Brief pause, then exit
            tl.call(runExit, [], 2.05)
        })

        return () => ctx.revert()
    }, [runExit])

    return (
        <div
            ref={panelRef}
            className="fixed inset-0 z-[9998] flex flex-col items-center justify-center"
            style={{ background: '#08090e' }}
        >
            {/* ── Subtle grid lines background ─────────────────────────────── */}
            <div className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(45,212,191,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(45,212,191,0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                }}
            />

            {/* ── Center content ────────────────────────────────────────────── */}
            <div className="relative z-10 flex flex-col items-center">

                {/* Logo mark — same as sidebar: custom image if uploaded, else icon */}
                <div ref={logoBoxRef}
                    className="mb-8 opacity-0"
                    style={{ filter: logoUrl ? undefined : 'drop-shadow(0 0 30px rgba(20,184,166,0.5))' }}>
                    {logoUrl ? (
                        <Image
                            src={logoUrl}
                            alt="Logo Pesantren"
                            width={96}
                            height={96}
                            className="w-24 h-24 object-contain"
                        />
                    ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl"
                            style={{
                                background: 'linear-gradient(135deg, #14b8a6 0%, #059669 100%)',
                                boxShadow: '0 0 60px rgba(20,184,166,0.35), 0 0 120px rgba(20,184,166,0.12)',
                            }}>
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* "LpApp." — clip reveal */}
                <p ref={logotextRef}
                    className="mb-2 text-4xl font-black tracking-tighter"
                    style={{ color: '#2dd4bf', clipPath: 'inset(0 100% 0 0)' }}>
                    LpApp.
                </p>

                {/* Tagline */}
                <p ref={taglineRef}
                    className="text-[11px] font-bold uppercase tracking-[0.35em] opacity-0"
                    style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Sistem Manajemen Pesantren
                </p>
            </div>

            {/* ── Bottom: progress bar + counter ───────────────────────────── */}
            <div className="absolute bottom-0 left-0 right-0 z-10">
                {/* Counter top-right of bar */}
                <div className="flex items-center justify-between px-10 pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: 'rgba(255,255,255,0.15)' }}>
                        Loading
                    </span>
                    <span ref={counterRef}
                        className="text-[10px] font-black tabular-nums"
                        style={{ color: 'rgba(45,212,191,0.7)' }}>
                        {counter}%
                    </span>
                </div>

                {/* Progress bar track */}
                <div ref={barRef} className="relative h-px w-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {/* Fill */}
                    <div ref={barFillRef} className="absolute inset-0 origin-left scale-x-0"
                        style={{
                            background: 'linear-gradient(90deg, #14b8a6 0%, #2dd4bf 60%, #6ee7b7 100%)',
                            boxShadow: '0 0 12px rgba(20,184,166,0.8)',
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
