import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isMobile(userAgent: string): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow static files, Next.js internals, and public pages
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

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
