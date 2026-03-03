// Force all pages in this route group to be dynamically rendered (not statically prerendered)
// This is required because all pages use tRPC and next-auth session at runtime.
export const dynamic = 'force-dynamic'

export default function SantriNewLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
