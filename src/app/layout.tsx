import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { TRPCProvider } from '@/components/providers/TRPCProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import UnauthorizedModal from '@/components/UnauthorizedModal'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Pesantren Management System',
  description: 'Sistem Manajemen Pondok Pesantren - Master Data, Keuangan, Akademik, User Management',
  keywords: ['pesantren', 'management', 'santri', 'billing', 'akademik', 'user management'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        <AuthProvider>
          <TRPCProvider>
            <UnauthorizedModal />
            {children}
          </TRPCProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
