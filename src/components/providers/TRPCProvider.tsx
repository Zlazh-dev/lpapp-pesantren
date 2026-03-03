'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import { trpc } from '@/utils/trpc'

function getBaseUrl() {
    if (typeof window !== 'undefined') return ''
    return `http://localhost:${process.env.PORT ?? 3000}`
}

// Custom fetch wrapper: intercepts 401 responses from any tRPC call and
// fires a 'app:401' CustomEvent so UnauthorizedModal can react globally.
// We still return the original response so tRPC can handle error formatting.
async function fetchWith401Intercept(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const res = await fetch(input, init)
    if (res.status === 401 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:401'))
    }
    return res
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 1000,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    )

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: `${getBaseUrl()}/api/trpc`,
                    transformer: superjson,
                    fetch: fetchWith401Intercept as any, // ← intercept 401 globally
                }),
            ],
        })
    )

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </trpc.Provider>
    )
}
