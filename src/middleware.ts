import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── Bot detection ─────────────────────────────────────────
// Known bad-bot User-Agent patterns that should be blocked
const BAD_BOT_PATTERNS = [
    /python-requests/i,
    /scrapy/i,
    /curl\//i,
    /wget\//i,
    /go-http-client/i,
    /java\//i,
    /libwww-perl/i,
    /PhantomJS/i,
    /HeadlessChrome/i,
    /SemrushBot/i,
    /AhrefsBot/i,
    /MJ12bot/i,
    /DotBot/i,
    /BLEXBot/i,
    /DataForSeoBot/i,
]

function isBadBot(userAgent: string): boolean {
    return BAD_BOT_PATTERNS.some((pattern) => pattern.test(userAgent))
}

// ─── Simple in-memory rate limiter (Edge-compatible) ───────
// Counts requests per IP within a sliding window.
// Note: resets on cold starts. For multi-instance deployments,
// use an external store (e.g., Redis via Upstash).
interface RateLimitEntry {
    count: number
    resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically to avoid memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // every 5 minutes
let lastCleanup = Date.now()

function checkRateLimit(ip: string, windowMs: number, maxRequests: number): boolean {
    const now = Date.now()

    // Periodic cleanup of expired keys
    if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
        for (const [key, entry] of rateLimitStore.entries()) {
            if (now > entry.resetAt) rateLimitStore.delete(key)
        }
        lastCleanup = now
    }

    const entry = rateLimitStore.get(ip)

    if (!entry || now > entry.resetAt) {
        // New window
        rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
        return true // allowed
    }

    if (entry.count >= maxRequests) {
        return false // blocked
    }

    entry.count++
    return true // allowed
}

// ─── Mobile device detection ───────────────────────────────
function isMobile(userAgent: string): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
}

// ─── Middleware ─────────────────────────────────────────────
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const userAgent = request.headers.get('user-agent') ?? ''
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip') ??
        '127.0.0.1'

    // ── 1. Block bad bots ──────────────────────────────────
    // Don't block on static assets or internal Next.js paths
    const isStaticOrInternal =
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')

    if (!isStaticOrInternal && isBadBot(userAgent)) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    // ── 2. Rate limit authentication endpoints ─────────────
    // Protects against brute-force login attacks.
    // Limit: 10 requests per 60 seconds per IP on any /api/auth route.
    if (pathname.startsWith('/api/auth')) {
        const allowed = checkRateLimit(`auth:${ip}`, 60_000, 10)
        if (!allowed) {
            return new NextResponse(
                JSON.stringify({ error: 'Too many requests. Coba lagi dalam 1 menit.' }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': '60',
                    },
                }
            )
        }
    }

    // ── 3. General API rate limit ──────────────────────────
    // Protects public-facing API routes from flooding.
    // Limit: 120 requests per 60 seconds per IP.
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
        const allowed = checkRateLimit(`api:${ip}`, 60_000, 120)
        if (!allowed) {
            return new NextResponse(
                JSON.stringify({ error: 'Too many requests.' }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': '60',
                    },
                }
            )
        }
    }

    // ── 4. Mobile/desktop routing (existing logic) ─────────
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/landing') ||
        pathname.startsWith('/link') ||
        pathname.includes('.')
    ) {
        return NextResponse.next()
    }

    void isMobile(userAgent) // kept for future mobile routing use

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

