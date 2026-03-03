'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const MOBILE_BREAKPOINT = 720

/**
 * Prefix-based route mapping between desktop and mobile.
 * Order matters — more specific prefixes first.
 */
const ROUTE_PREFIXES: { desktop: string; mobile: string }[] = [
    { desktop: '/dashboard', mobile: '/m-dashboard' },
    { desktop: '/master-data', mobile: '/m-master-data' },
    { desktop: '/keuangan', mobile: '/m-keuangan' },
    { desktop: '/akademik', mobile: '/m-akademik' },
    { desktop: '/user-management', mobile: '/m-users' },
    { desktop: '/settings', mobile: '/m-settings' },
]

function toMobileRoute(desktopPath: string): string | null {
    for (const { desktop, mobile } of ROUTE_PREFIXES) {
        if (desktopPath === desktop) return mobile
        if (desktopPath.startsWith(desktop + '/')) {
            return mobile + desktopPath.slice(desktop.length)
        }
    }
    return null
}

function toDesktopRoute(mobilePath: string): string | null {
    for (const { desktop, mobile } of ROUTE_PREFIXES) {
        if (mobilePath === mobile) return desktop
        if (mobilePath.startsWith(mobile + '/')) {
            return desktop + mobilePath.slice(mobile.length)
        }
    }
    return null
}

/**
 * Detects screen width and redirects between desktop/mobile layouts.
 * Uses prefix-based mapping to preserve the full sub-path.
 *
 * - `mode: 'desktop'` → if width < 720px, redirect to mobile equivalent
 * - `mode: 'mobile'`  → if width >= 720px, redirect to desktop equivalent
 */
export function useResponsiveRedirect(mode: 'desktop' | 'mobile') {
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        if (typeof window === 'undefined') return

        const check = () => {
            const width = window.innerWidth

            if (mode === 'desktop' && width < MOBILE_BREAKPOINT) {
                const target = toMobileRoute(pathname)
                if (target) router.replace(target)
            } else if (mode === 'mobile' && width >= MOBILE_BREAKPOINT) {
                const target = toDesktopRoute(pathname)
                if (target) router.replace(target)
            }
        }

        check()

        const handleResize = () => check()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [mode, pathname, router])
}
