'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
    { num: '01', label: 'Manajemen Santri', desc: 'Data santri terpusat — biodata, wali, kamar, dan riwayat akademik.' },
    { num: '02', label: 'Akademik', desc: 'Kelas, nilai, jadwal, dan laporan dalam satu sistem terstruktur.' },
    { num: '03', label: 'Keuangan', desc: 'Penagihan otomatis, rekap pembayaran, dan laporan transparan.' },
    { num: '04', label: 'Analitik', desc: 'Dashboard statistik santri dan keuangan secara real-time.' },
]
const MARQUEE_TEXT = 'SANTRI · AKADEMIK · KEUANGAN · ANALITIK · KELOLA PESANTREN · LPAPP · '

// ─── Text splitting helpers ──────────────────────────────────────────────────
// Split element text into individual word <span><span> pairs (outer clips, inner slides).
function splitWords(el: HTMLElement) {
    const original = el.innerText.trim()
    el.innerHTML = original
        .split(/\s+/)
        .map(w =>
            `<span style="display:inline-block;overflow:hidden;vertical-align:bottom;line-height:1.1">` +
            `<span class="split-word" style="display:inline-block">${w}</span>` +
            `</span>`
        )
        .join('&nbsp;')
    return Array.from(el.querySelectorAll<HTMLElement>('.split-word'))
}

// Split element text into char <span>s — each char gets the provided inline style.
// The PARENT div should have overflow:hidden so yPercent clip works.
function splitCharsStyled(el: HTMLElement, extraStyle = ''): HTMLElement[] {
    const text = el.innerText.trim()
    el.style.overflow = 'visible'  // parent wrapper clips, not this el
    el.innerHTML = text.split('').map(c => {
        if (c === ' ') return `<span style="display:inline-block;width:0.3em">&nbsp;</span>`
        return `<span class="sc" style="display:inline-block;${extraStyle}">${c}</span>`
    }).join('')
    return Array.from(el.querySelectorAll<HTMLElement>('.sc'))
}

// ─── Desktop Landing ──────────────────────────────────────────────────────────
export default function DesktopLanding() {
    const router = useRouter()
    const wrapperRef = useRef<HTMLDivElement>(null)
    const heroRef = useRef<HTMLDivElement>(null)
    const navRef = useRef<HTMLDivElement>(null)
    const marquee1Ref = useRef<HTMLDivElement>(null)
    const marquee2Ref = useRef<HTMLDivElement>(null)
    const marqueeTickerRef = useRef<(() => void) | null>(null)

    const { data: logoUrl } = trpc.settings.get.useQuery('logo_url')

    // ── Cursor spotlight ────────────────────────────────────────────────────
    useEffect(() => {
        const hero = heroRef.current
        if (!hero) return
        hero.style.setProperty('--cx', '-999px')
        hero.style.setProperty('--cy', '-999px')
        const fn = (e: MouseEvent) => {
            const r = hero.getBoundingClientRect()
            hero.style.setProperty('--cx', `${e.clientX - r.left}px`)
            hero.style.setProperty('--cy', `${e.clientY - r.top}px`)
        }
        hero.addEventListener('mousemove', fn)
        return () => hero.removeEventListener('mousemove', fn)
    }, [])

    // ── Main: GSAP + Lenis + ScrollTrigger scrub ─────────────────────────────
    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)

        // Lenis smooth scroll — feeds into ScrollTrigger
        const lenis = new Lenis({ lerp: 0.07, smoothWheel: true })
        gsap.ticker.add(t => lenis.raf(t * 1000))
        gsap.ticker.lagSmoothing(0)
        lenis.on('scroll', ScrollTrigger.update)

        const ctx = gsap.context(() => {

            // ── NAV: simple fade-in on load ──────────────────────────────────
            gsap.from(navRef.current, {
                y: -18, opacity: 0,
                duration: 0.7, ease: 'power3.out', delay: 0.1,
            })

            // ── HERO: per-char stagger left-to-right, scroll scrub ────────────
            const line1 = document.querySelector<HTMLElement>('.hero-line1')
            const line2 = document.querySelector<HTMLElement>('.hero-line2')
            const line3 = document.querySelector<HTMLElement>('.hero-line3')
            const heroTag = document.querySelector<HTMLElement>('.hero-tag')
            const heroSub = document.querySelector<HTMLElement>('.hero-sub')
            const heroCta = document.querySelector<HTMLElement>('.hero-cta')
            const heroContent = document.querySelector<HTMLElement>('.hero-content')

            if (heroContent) {
                const heroTl = gsap.timeline({
                    scrollTrigger: {
                        trigger: heroContent,
                        start: 'top 90%',   // enters viewport bottom
                        end: 'top -30%',    // generous end for char stagger room
                        scrub: 1.5,
                    }
                })

                // Tag — word split, stagger left-to-right
                if (heroTag) {
                    const words = splitWords(heroTag)
                    gsap.set(words, { yPercent: 110, opacity: 0 })
                    heroTl.to(words, { yPercent: 0, opacity: 1, stagger: 0.05, ease: 'none' }, 0)
                }

                // Line 1 "KELOLA" — white chars, stagger left-to-right
                if (line1) {
                    const chars = splitCharsStyled(line1, 'color:#ffffff;')
                    gsap.set(chars, { yPercent: 110 })
                    heroTl.to(chars, { yPercent: 0, stagger: 0.025, ease: 'none' }, 0.07)
                }

                // Line 2 "PESANTREN" — outline chars, stagger left-to-right
                if (line2) {
                    const chars = splitCharsStyled(line2,
                        '-webkit-text-stroke:2px rgba(255,255,255,0.22);' +
                        '-webkit-text-fill-color:transparent;color:transparent;'
                    )
                    gsap.set(chars, { yPercent: 110 })
                    heroTl.to(chars, { yPercent: 0, stagger: 0.018, ease: 'none' }, 0.17)
                }

                // Line 3 "LEBIH CERDAS." — teal gradient per char, stagger L→R
                if (line3) {
                    const chars = splitCharsStyled(line3,
                        'background:linear-gradient(135deg,#2dd4bf 0%,#34d399 60%,#6ee7b7 100%);' +
                        '-webkit-background-clip:text;background-clip:text;' +
                        '-webkit-text-fill-color:transparent;color:transparent;'
                    )
                    gsap.set(chars, { yPercent: 110 })
                    heroTl.to(chars, { yPercent: 0, stagger: 0.016, ease: 'none' }, 0.28)
                }

                // Sub + CTA
                if (heroSub) {
                    gsap.set(heroSub, { y: 30, opacity: 0 })
                    heroTl.to(heroSub, { y: 0, opacity: 1, ease: 'none' }, 0.48)
                }
                if (heroCta) {
                    gsap.set(heroCta, { y: 20, opacity: 0 })
                    heroTl.to(heroCta, { y: 0, opacity: 1, ease: 'none' }, 0.54)
                }
            }

            // Helper: split words + timeline with ScrollTrigger scrub
            // Words slide up from 120% inside overflow:hidden outer span.
            // Using ease:'none' because scrub driving the timing — not GSAP ease.
            const scrubWords = (
                selector: string,
                scrubVal: number | boolean = 1.5,
                startPos = 'top 92%',
                endPos = 'top 18%'
            ) => {
                const el = document.querySelector<HTMLElement>(selector)
                if (!el) return
                const words = splitWords(el)
                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: el,
                        start: startPos,
                        end: endPos,
                        scrub: scrubVal,
                    }
                })
                tl.from(words, {
                    yPercent: 130,
                    opacity: 0,
                    ease: 'none',
                    stagger: 0.06,
                })
            }

            // Helper: fade+slide with scrub — bigger y travel for more drama
            const scrubFade = (
                selector: string,
                ty = 50,
                scrubVal: number | boolean = 1.5,
                startPos = 'top 92%',
                endPos = 'top 35%'
            ) => {
                const el = document.querySelector<HTMLElement>(selector)
                if (!el) return
                gsap.timeline({
                    scrollTrigger: {
                        trigger: el,
                        start: startPos,
                        end: endPos,
                        scrub: scrubVal,
                    }
                }).from(el, { y: ty, opacity: 0, filter: 'blur(8px)', ease: 'none', clearProps: 'filter' })
            }

            // ── Section divider line ─────────────────────────────────────────
            scrubFade('.feat-divider', 10, 1, 'top 90%', 'top 65%')

            // ── scrubChars: per-char L→R stagger driven by scroll scrub ───────────
            const scrubChars = (
                selector: string,
                charStyle = '',
                startPos = 'top 92%',
                endPos = 'top 20%',
                scrubVal: number | boolean = 1.5
            ) => {
                const el = document.querySelector<HTMLElement>(selector)
                if (!el) return
                const chars = splitCharsStyled(el, charStyle)
                gsap.set(chars, { yPercent: 110, opacity: 0 })
                gsap.timeline({
                    scrollTrigger: { trigger: el, start: startPos, end: endPos, scrub: scrubVal }
                }).to(chars, { yPercent: 0, opacity: 1, stagger: 0.03, ease: 'none' })
            }

            // Feature headlines — char-by-char L→R
            scrubChars('.feat-h1', '', 'top 88%', 'top 22%')
            scrubChars('.feat-h2', '', 'top 85%', 'top 18%')

            // ── Feature rows: each row independently scrubbed with blur ────────────
            document.querySelectorAll<HTMLElement>('.feat-row').forEach((row) => {
                gsap.timeline({
                    scrollTrigger: {
                        trigger: row,
                        start: 'top 92%',
                        end: 'top 45%',
                        scrub: 1.5,
                    }
                }).from(row, { y: 50, opacity: 0, filter: 'blur(8px)', ease: 'none', clearProps: 'filter' })
            })

            // ── Stats: scrub per block ───────────────────────────────────────
            scrubFade('.stats-label', 12, 1, 'top 88%', 'top 60%')
            document.querySelectorAll<HTMLElement>('.stat-block').forEach((el) => {
                gsap.timeline({
                    scrollTrigger: {
                        trigger: el,
                        start: 'top 90%',
                        end: 'top 50%',
                        scrub: 1,
                    }
                }).from(el, { y: 28, opacity: 0, ease: 'none' })
            })

            // ── CTA section — char stagger + scrub, center-based end ──────────
            scrubChars('.cta-h1', '', 'top 95%', 'center 65%', 1.5)
            scrubChars('.cta-h2', '', 'top 92%', 'center 60%', 1.5)
            scrubFade('.cta-btn', 40, 1.5, 'top 92%', 'center 70%')


        }) // end gsap.context

        // ── Scroll-velocity marquee (GSAP ticker + Lenis delta) ──────────────
        const MULT = 0.4, LERP = 0.08
        let tX1 = 0, cX1 = 0, tX2 = 0, cX2 = 0, w1 = 0, w2 = 0, lastY = 0

        const init = () => {
            if (marquee1Ref.current) w1 = marquee1Ref.current.scrollWidth / 2
            if (marquee2Ref.current) w2 = marquee2Ref.current.scrollWidth / 2
            lastY = window.scrollY
        }
        setTimeout(init, 80)

        lenis.on('scroll', (e: { scroll: number }) => {
            const d = e.scroll - lastY; lastY = e.scroll
            tX1 -= d * MULT; tX2 += d * MULT
        })

        const tick = () => {
            cX1 += (tX1 - cX1) * LERP; cX2 += (tX2 - cX2) * LERP
            if (w1 > 0) { cX1 = ((cX1 % w1) - w1) % w1; tX1 = ((tX1 % w1) - w1) % w1 }
            if (w2 > 0) { cX2 = ((cX2 % w2) + w2) % w2; tX2 = ((tX2 % w2) + w2) % w2 }
            if (marquee1Ref.current) gsap.set(marquee1Ref.current, { x: cX1 })
            if (marquee2Ref.current) gsap.set(marquee2Ref.current, { x: cX2 })
        }
        gsap.ticker.add(tick)
        marqueeTickerRef.current = tick

        return () => {
            ctx.revert()
            lenis.destroy()
            ScrollTrigger.getAll().forEach(t => t.kill())
            if (marqueeTickerRef.current) {
                gsap.ticker.remove(marqueeTickerRef.current)
                marqueeTickerRef.current = null
            }
        }
    }, [])

    // ── Page outro ───────────────────────────────────────────────────────────
    const handleEnter = () => {
        gsap.to(wrapperRef.current, {
            y: -28, opacity: 0, scale: 0.97,
            duration: 0.55, ease: 'power3.in',
            onComplete: () => router.push('/login'),
        })
    }

    return (
        <div ref={wrapperRef}
            style={{ background: '#0b0f0e', color: '#f0f0f0', fontFamily: 'var(--font-inter)', overflowX: 'hidden' }}>

            {/* ── Topographic background ──────────────────────────────────── */}
            <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Cpath d='M0 300 Q150 200 300 300 Q450 400 600 300' fill='none' stroke='%232dd4bf' stroke-width='1'/%3E%3Cpath d='M0 350 Q150 250 300 350 Q450 450 600 350' fill='none' stroke='%232dd4bf' stroke-width='1'/%3E%3Cpath d='M0 250 Q150 150 300 250 Q450 350 600 250' fill='none' stroke='%232dd4bf' stroke-width='1'/%3E%3Cpath d='M0 400 Q150 300 300 400 Q450 500 600 400' fill='none' stroke='%232dd4bf' stroke-width='1'/%3E%3Cpath d='M0 200 Q150 100 300 200 Q450 300 600 200' fill='none' stroke='%232dd4bf' stroke-width='1'/%3E%3Cpath d='M0 450 Q150 350 300 450 Q450 550 600 450' fill='none' stroke='%232dd4bf' stroke-width='1'/%3E%3C/svg%3E")`,
                    backgroundSize: '600px 600px',
                }} />

            {/* ── Nav ───────────────────────────────────────────────────────── */}
            <div ref={navRef} className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5"
                style={{ backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2">
                    {logoUrl ? (
                        <Image src={logoUrl} alt="Logo" width={36} height={36}
                            className="w-9 h-9 flex-shrink-0 object-contain brightness-0 invert" />
                    ) : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #14b8a6, #059669)' }}>
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    )}
                    <span className="text-sm font-bold" style={{ color: '#2dd4bf' }}>LpApp.</span>
                </div>
                <span className="absolute left-1/2 -translate-x-1/2 text-xs font-bold tracking-[0.35em] uppercase text-white/30">
                    Pesantren Management
                </span>
                <button onClick={handleEnter}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white/90 border transition-all duration-200 hover:text-white hover:border-teal-400/60 active:scale-95"
                    style={{ borderColor: 'rgba(45,212,191,0.25)', background: 'rgba(45,212,191,0.06)' }}>
                    MASUK →
                </button>
            </div>


            {/* ── Intro spacer: 100vh — this is ALL user sees at scrollY=0 ───── */}
            <div ref={heroRef}
                className="relative z-10 h-screen flex flex-col items-center justify-end pb-10"
                style={{ '--cx': '-999px', '--cy': '-999px' } as React.CSSProperties}>
                {/* Cursor spotlight */}
                <div className="pointer-events-none absolute inset-0" style={{
                    background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(20,184,166,0.10) 0%, transparent 100%)',
                    maskImage: 'radial-gradient(circle 350px at var(--cx) var(--cy), black 0%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(circle 350px at var(--cx) var(--cy), black 0%, transparent 100%)',
                }} />
                {/* Scroll prompt — only visible cue */}
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/20"
                    style={{ animation: 'bounce 2s infinite' }}>Scroll ↓</p>
            </div>

            {/* ── Hero content: below fold, scrubs in as you scroll ─────────── */}
            <section className="hero-content relative z-10 px-10 pb-24">
                <div className="mb-6">
                    <p className="hero-tag text-xs font-bold tracking-[0.3em] uppercase mb-8 text-teal-400/60">
                        — Platform Manajemen Pesantren Modern
                    </p>

                    {/* Line 1: KELOLA */}
                    <div className="mb-1" style={{ lineHeight: '0.92', overflow: 'hidden' }}>
                        <span className="hero-line1 block text-[11vw] font-black uppercase tracking-tighter text-white">
                            KELOLA
                        </span>
                    </div>

                    {/* Line 2: PESANTREN — outline */}
                    <div className="mb-1" style={{ lineHeight: '0.92', overflow: 'hidden' }}>
                        <span className="hero-line2 block text-[11vw] font-black uppercase tracking-tighter"
                            style={{ WebkitTextStroke: '2px rgba(255,255,255,0.22)', WebkitTextFillColor: 'transparent' }}>
                            PESANTREN
                        </span>
                    </div>

                    {/* Line 3: LEBIH CERDAS. — teal gradient */}
                    <div style={{ lineHeight: '0.92', overflow: 'hidden' }}>
                        <span className="hero-line3 block text-[11vw] font-black uppercase tracking-tighter"
                            style={{
                                WebkitTextFillColor: 'transparent',
                                WebkitBackgroundClip: 'text',
                                backgroundImage: 'linear-gradient(135deg, #2dd4bf 0%, #34d399 60%, #6ee7b7 100%)',
                            }}>
                            LEBIH CERDAS.
                        </span>
                    </div>
                </div>

                <div className="flex items-end justify-between mt-4">
                    <p className="hero-sub max-w-xs text-sm leading-relaxed text-white/40" style={{ opacity: 0 }}>
                        Platform terpadu untuk manajemen santri,<br />
                        akademik, keuangan, dan operasional pesantren.
                    </p>
                    <div className="hero-cta flex items-center gap-4" style={{ opacity: 0 }}>
                        <button onClick={handleEnter}
                            className="group relative overflow-hidden px-8 py-4 font-black text-sm uppercase tracking-widest text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                            style={{
                                background: 'linear-gradient(135deg, #14b8a6, #059669)',
                                clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
                                boxShadow: '0 8px 32px rgba(20,184,166,0.4)',
                            }}>
                            <span className="absolute inset-0 translate-x-[-100%] skew-x-[-20deg] bg-white/20 transition-transform duration-500 group-hover:translate-x-[200%]" />
                            <span className="relative">MASUK SEKARANG</span>
                        </button>
                        <a href="#features" className="text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors duration-200">
                            Lebih lanjut ↓
                        </a>
                    </div>
                </div>
            </section>


            {/* ── Marquee 1 ─────────────────────────────────────────────────── */}
            <div className="relative z-10 overflow-hidden py-6 border-y"
                style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                <div ref={marquee1Ref} className="flex items-center flex-shrink-0 will-change-transform">
                    {[0, 1].map(i => (
                        <span key={i} className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/20 whitespace-nowrap px-8">
                            {MARQUEE_TEXT.repeat(6)}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Features ───────────────────────────────────────────────────── */}
            <section id="features" className="relative z-10 px-10 py-24">
                <div className="max-w-7xl mx-auto">

                    {/* Divider */}
                    <div className="feat-divider flex items-center gap-4 mb-16">
                        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/30">Fitur Platform</p>
                        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    </div>

                    {/* Section headline — word split + scrub */}
                    <div className="mb-16">
                        <h2 className="feat-h1 text-[5.5vw] font-black uppercase tracking-tighter leading-[0.93]">
                            Satu Platform.
                        </h2>
                        <h2 className="feat-h2 text-[5.5vw] font-black uppercase tracking-tighter leading-[0.93] opacity-30">
                            Semua Kebutuhan.
                        </h2>
                    </div>

                    {/* Feature rows — each scrubbed */}
                    <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                        {FEATURES.map(feat => (
                            <div key={feat.num}
                                className="feat-row group flex items-center gap-10 py-8 cursor-default transition-all duration-300 hover:pl-3">
                                <span className="text-xs font-bold text-white/20 w-8 flex-shrink-0">{feat.num}</span>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-white group-hover:text-teal-400 transition-colors duration-300 w-64 flex-shrink-0">
                                    {feat.label}
                                </h3>
                                <p className="text-sm text-white/40 leading-relaxed flex-1">{feat.desc}</p>
                                <span className="text-white/15 group-hover:text-teal-400/60 transition-colors duration-300 text-xl">→</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Marquee 2 ─────────────────────────────────────────────────── */}
            <div className="relative z-10 overflow-hidden py-6 border-y"
                style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                <div ref={marquee2Ref} className="flex items-center flex-shrink-0 will-change-transform">
                    {[0, 1].map(i => (
                        <span key={i} className="text-[11px] font-bold uppercase tracking-[0.35em] whitespace-nowrap px-8"
                            style={{ color: 'rgba(45,212,191,0.13)' }}>
                            {MARQUEE_TEXT.repeat(6)}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Stats ──────────────────────────────────────────────────────── */}
            <section className="relative z-10 px-10 py-24">
                <div className="max-w-7xl mx-auto">
                    <p className="stats-label text-[10px] font-bold uppercase tracking-widest text-white/25 mb-10 text-center">
                        Dipercaya pesantren modern
                    </p>
                    <div className="grid grid-cols-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                        {[
                            { v: '500+', l: 'Santri Dikelola', sub: 'Dalam satu sistem' },
                            { v: '12', l: 'Modul Terintegrasi', sub: 'End-to-end' },
                            { v: '99%', l: 'Uptime Sistem', sub: 'Selalu tersedia' },
                            { v: '5×', l: 'Lebih Efisien', sub: 'Vs manual' },
                        ].map((s, i) => (
                            <div key={s.l} className="stat-block flex flex-col justify-between p-10"
                                style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : undefined }}>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-white/25 mb-8">{s.sub}</p>
                                <div>
                                    <p className="text-6xl font-black tracking-tighter leading-none"
                                        style={{
                                            WebkitTextFillColor: 'transparent',
                                            WebkitBackgroundClip: 'text',
                                            backgroundImage: 'linear-gradient(135deg, #2dd4bf, #34d399)',
                                        }}>{s.v}</p>
                                    <p className="mt-3 text-sm font-bold uppercase tracking-wide text-white/60">{s.l}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ──────────────────────────────────────────────────── */}
            <section className="relative z-10 px-10 pb-28">
                <div className="max-w-7xl mx-auto">
                    <div className="relative overflow-hidden p-16"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {/* Corner brackets */}
                        <div className="absolute top-0 left-0 w-16 h-16">
                            <div className="absolute top-0 left-0 w-full h-px bg-teal-400/40" />
                            <div className="absolute top-0 left-0 h-full w-px bg-teal-400/40" />
                        </div>
                        <div className="absolute bottom-0 right-0 w-16 h-16">
                            <div className="absolute bottom-0 right-0 w-full h-px bg-teal-400/40" />
                            <div className="absolute bottom-0 right-0 h-full w-px bg-teal-400/40" />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-teal-400/60 mb-5">Siap Memulai?</p>
                                <h2 className="cta-h1 text-[4vw] font-black uppercase tracking-tighter leading-[0.93]">
                                    Tingkatkan Efisiensi
                                </h2>
                                <h2 className="cta-h2 text-[4vw] font-black uppercase tracking-tighter leading-[0.93] opacity-40">
                                    Pesantren Anda.
                                </h2>
                            </div>
                            <button onClick={handleEnter}
                                className="cta-btn group relative overflow-hidden px-10 py-5 font-black text-sm uppercase tracking-widest text-white flex-shrink-0 transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
                                style={{
                                    background: 'linear-gradient(135deg, #14b8a6, #059669)',
                                    clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
                                    boxShadow: '0 10px 40px rgba(20,184,166,0.4)',
                                }}>
                                <span className="absolute inset-0 translate-x-[-100%] skew-x-[-20deg] bg-white/20 transition-transform duration-500 group-hover:translate-x-[200%]" />
                                <span className="relative">MASUK SEKARANG →</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Bottom scroll spacer — gives CTA animation room to complete ── */}
            <div className="h-[80vh]" />

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <footer className="relative z-10 px-10 py-6 border-t flex items-center justify-between"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-bold text-teal-400">LPAPP.</p>
                <p className="text-[10px] uppercase tracking-widest text-white/20">© 2025 Pesantren Management System</p>
                <p className="text-[10px] uppercase tracking-widest text-white/20">Beta Version</p>
            </footer>
        </div>
    )
}
