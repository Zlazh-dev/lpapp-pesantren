import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'LpApp — Sistem Manajemen Pondok Pesantren',
    description: 'Platform terpadu untuk manajemen santri, akademik, keuangan, dan operasional pesantren modern.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    // Minimal layout — no sidebar, no auth guard
    return <>{children}</>
}
