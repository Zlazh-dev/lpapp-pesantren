'use client'

import { useEffect, useState } from 'react'
import DesktopLanding from './_components/DesktopLanding'
import MobileLanding from './_components/MobileLanding'

// Viewport breakpoint: < 768px = mobile, >= 768px = desktop
// Uses window.innerWidth on the client — no SSR flicker (loading state shown instead)
export default function LandingPage() {
    const [isMobile, setIsMobile] = useState<boolean | null>(null)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    // Prevent flash — show dark background while detecting
    if (isMobile === null) {
        return <div className="min-h-screen bg-[#08090e]" />
    }

    return isMobile ? <MobileLanding /> : <DesktopLanding />
}
