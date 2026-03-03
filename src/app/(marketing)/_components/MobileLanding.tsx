'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

// ─── Feature data ─────────────────────────────────────────────────────────────
const FEATURES = [
    {
        icon: '👥',
        label: 'Santri',
        desc: 'Data santri terpusat: biodata, wali, kamar, dan riwayat akademik.',
        accent: '#14b8a6',
    },
    {
        icon: '📚',
        label: 'Akademik',
        desc: 'Kelola kelas, nilai, dan jadwal dengan struktur yang rapi.',
        accent: '#8b5cf6',
    },
    {
        icon: '💰',
        label: 'Keuangan',
        desc: 'Penagihan otomatis dan laporan keuangan transparan.',
        accent: '#f59e0b',
    },
    {
        icon: '📊',
        label: 'Analitik',
        desc: 'Dashboard statistik dan laporan real-time untuk pengambilan keputusan.',
        accent: '#0ea5e9',
    },
]

// ─── Mobile Landing ───────────────────────────────────────────────────────────
// Mobile version: No cursor effects, no card tilt.
// Animations: simple fade + slide-up via GSAP, Lenis for smooth scroll.
// Touch targets: min-height 48px on interactive elements.
export default function MobileLanding() {
    const router = useRouter()

    // Refs
    const wrapperRef = useRef<HTMLDivElement>(null)
    const logoRef = useRef<HTMLDivElement>(null)
    const heroTagRef = useRef<HTMLParagraphElement>(null)
    const heroH1Ref = useRef<HTMLHeadingElement>(null)
    const heroSubRef = useRef<HTMLParagraphElement>(null)
    const heroCTARef = useRef<HTMLDivElement>(null)
    const orbRef = useRef<HTMLDivElement>(null)
    const featSectionRef = useRef<HTMLElement>(null)
    const ctaSectionRef = useRef<HTMLElement>(null)

    // Fetch logo — same source as sidebar
    const { data: logoUrl } = trpc.settings.get.useQuery('logo_url')

    // ── GSAP + Lenis setup ────────────────────────────────────────────────────
    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)

        // Lenis smooth scroll, slightly faster lerp for mobile feel
        const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
        gsap.ticker.add((time) => lenis.raf(time * 1000))
        gsap.ticker.lagSmoothing(0)
        lenis.on('scroll', ScrollTrigger.update)

        const ctx = gsap.context(() => {
            // Ambient orb subtle breathing (scale pulse, no translation on mobile)
            gsap.to(orbRef.current, {
                scale: 1.2, duration: 8, repeat: -1, yoyo: true, ease: 'sine.inOut'
            })

            // ── Hero entrance stagger ─────────────────────────────────────────
            // Shorter travel distances on mobile (y: 18-24px vs 40px desktop)
            // Duration slightly faster for snappier mobile UX
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
            tl.fromTo(logoRef.current,
                { y: -16, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.65 }
            )
                .fromTo(heroTagRef.current,
                    { y: 16, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.6 },
                    '-=0.35'
                )
                .fromTo(heroH1Ref.current,
                    { y: 24, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.75 },
                    '-=0.4'
                )
                .fromTo(heroSubRef.current,
                    { y: 16, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.6 },
                    '-=0.45'
                )
                .fromTo(heroCTARef.current,
                    { y: 14, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.55 },
                    '-=0.4'
                )

            // ── Feature cards: scroll-triggered stagger ───────────────────────
            const cards = featSectionRef.current?.querySelectorAll('.m-feat-card')
            if (cards) {
                gsap.fromTo(cards,
                    { y: 30, opacity: 0 },
                    {
                        y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out',
                        scrollTrigger: {
                            trigger: featSectionRef.current,
                            start: 'top 85%',
                            toggleActions: 'play none none none',
                        }
                    }
                )
            }

            // ── CTA section: scroll-triggered ─────────────────────────────────
            gsap.fromTo(ctaSectionRef.current,
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1, duration: 0.65, ease: 'power3.out',
                    scrollTrigger: {
                        trigger: ctaSectionRef.current,
                        start: 'top 88%',
                        toggleActions: 'play none none none',
                    }
                }
            )
        })

        return () => {
            ctx.revert()
            lenis.destroy()
            gsap.ticker.remove((time) => lenis.raf(time * 1000))
            ScrollTrigger.getAll().forEach(t => t.kill())
        }
    }, [])

    // ── Page outro: fade + push to /login ────────────────────────────────────
    const handleEnter = () => {
        gsap.to(wrapperRef.current, {
            y: -20, opacity: 0, duration: 0.45, ease: 'power3.in',
            onComplete: () => router.push('/login'),
        })
    }

    return (
        <div
            ref={wrapperRef}
            className="min-h-screen overflow-x-hidden pb-16"
            style={{ background: '#08090e', color: '#f8fafc', fontFamily: 'var(--font-inter)' }}
        >
            {/* ── Ambient orb ──────────────────────────────────────────────── */}
            <div ref={orbRef} className="pointer-events-none fixed top-[-20vh] left-[-20vw] w-[80vw] h-[80vw] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)', zIndex: 0 }} />

            {/* ── Nav ──────────────────────────────────────────────────────── */}
            <div ref={logoRef} className="relative z-10 flex items-center justify-between px-5 pt-6 pb-4">
                <div className="flex items-center gap-2">
                    {logoUrl ? (
                        <Image
                            src={logoUrl}
                            alt="Logo"
                            width={32}
                            height={32}
                            className="w-8 h-8 flex-shrink-0 object-contain"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #14b8a6, #059669)' }}>
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-bold text-emerald-400 leading-none">LpApp.</p>
                        <p className="text-[9px] text-white/30 leading-none mt-0.5">Beta Version</p>
                    </div>
                </div>

                <button onClick={handleEnter}
                    className="h-9 rounded-xl px-4 text-xs font-semibold text-white active:opacity-75 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #059669)' }}>
                    Masuk →
                </button>
            </div>

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-12 pb-16 text-center min-h-[80vh]">
                <p ref={heroTagRef} className="mb-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-teal-400/70">
                    Sistem Manajemen Pesantren
                </p>

                <h1 ref={heroH1Ref} className="text-[2.75rem] font-black leading-[1.05] tracking-tight">
                    <span className="block text-white">Kelola</span>
                    <span className="block text-white">Pesantren</span>
                    <span className="block mt-1" style={{
                        WebkitTextFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        backgroundImage: 'linear-gradient(135deg, #2dd4bf 0%, #34d399 100%)',
                    }}>
                        Lebih Cerdas.
                    </span>
                </h1>

                <p ref={heroSubRef} className="mx-auto mt-5 max-w-xs text-[15px] leading-relaxed text-slate-400">
                    Platform terpadu untuk manajemen santri, akademik, keuangan, dan operasional pesantren.
                </p>

                <div ref={heroCTARef} className="mt-8 flex flex-col gap-3 w-full max-w-xs">
                    <button onClick={handleEnter}
                        className="relative overflow-hidden h-14 w-full rounded-2xl font-bold text-white active:scale-[0.97] transition-transform"
                        style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #059669 100%)', boxShadow: '0 8px 32px rgba(20,184,166,0.35)' }}>
                        <span className="relative">Masuk ke Sistem →</span>
                    </button>
                    <a href="#features"
                        className="h-12 w-full flex items-center justify-center rounded-2xl border text-sm font-medium text-slate-300 active:opacity-70"
                        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                        Pelajari Lebih
                    </a>
                </div>
            </section>

            {/* ── Features Section ──────────────────────────────────────────── */}
            <section id="features" ref={featSectionRef} className="relative z-10 px-5 pb-16">
                <div className="mb-8 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-400/60 mb-2">Fitur</p>
                    <h2 className="text-2xl font-bold text-white">Satu Platform,<br />
                        <span className="text-slate-400 font-normal">Semua Kebutuhan.</span>
                    </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {FEATURES.map((feat) => (
                        <div key={feat.label}
                            className="m-feat-card relative overflow-hidden rounded-2xl p-4"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                            }}>
                            <div className="mb-3 text-2xl">{feat.icon}</div>
                            <p className="mb-1 text-sm font-bold text-white">{feat.label}</p>
                            <p className="text-[12px] leading-relaxed text-slate-500">{feat.desc}</p>

                            {/* Corner accent */}
                            <div className="pointer-events-none absolute bottom-0 right-0 w-16 h-16 rounded-full"
                                style={{ background: `radial-gradient(circle at 100% 100%, ${feat.accent}20 0%, transparent 70%)` }} />
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Stats row ────────────────────────────────────────────────── */}
            <div className="relative z-10 mx-5 mb-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                {[
                    { v: '500+', l: 'Santri' },
                    { v: '12', l: 'Modul' },
                    { v: '99%', l: 'Uptime' },
                    { v: '5×', l: 'Lebih Efisien' },
                ].map((s, i) => (
                    <div key={s.l} className="flex flex-col items-center py-6"
                        style={{ background: 'rgba(255,255,255,0.02)', borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.07)' : undefined, borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.07)' : undefined }}>
                        <p className="text-3xl font-black" style={{
                            WebkitTextFillColor: 'transparent',
                            WebkitBackgroundClip: 'text',
                            backgroundImage: 'linear-gradient(135deg, #2dd4bf, #34d399)',
                        }}>{s.v}</p>
                        <p className="mt-1 text-[11px] text-slate-500 font-medium">{s.l}</p>
                    </div>
                ))}
            </div>

            {/* ── Final CTA ────────────────────────────────────────────────── */}
            <section ref={ctaSectionRef} className="relative z-10 mx-5">
                <div className="relative overflow-hidden rounded-3xl p-8 text-center"
                    style={{
                        background: 'linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(5,150,105,0.07) 100%)',
                        border: '1px solid rgba(20,184,166,0.22)',
                    }}>
                    <div className="pointer-events-none absolute inset-0 rounded-3xl"
                        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(20,184,166,0.15) 0%, transparent 100%)' }} />
                    <div className="relative z-10">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-teal-400/70">Siap Mulai?</p>
                        <h2 className="mb-3 text-2xl font-black text-white">Tingkatkan Efisiensi<br />Pesantren Anda.</h2>
                        <p className="mb-7 text-sm text-slate-400">Kelola pesantren lebih modern dan efisien.</p>
                        <button onClick={handleEnter}
                            className="h-14 w-full rounded-2xl font-bold text-white active:scale-[0.97] transition-transform"
                            style={{ background: 'linear-gradient(135deg, #14b8a6, #059669)', boxShadow: '0 8px 32px rgba(20,184,166,0.35)' }}>
                            Masuk Sekarang →
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <div className="mt-10 pb-4 text-center">
                <p className="text-xs text-slate-700">© 2025 LpApp. Pesantren Management System</p>
            </div>
        </div>
    )
}
