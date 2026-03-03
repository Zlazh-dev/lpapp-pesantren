import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { globalClients } from '@/lib/sse-clients'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 })
    }

    const encoder = new TextEncoder()
    let write: ((data: string) => void) | null = null

    const stream = new ReadableStream({
        start(controller) {
            write = (data: string) => {
                try { controller.enqueue(encoder.encode(data)) } catch { /* ignore */ }
            }
            globalClients.add(write)
            write(': heartbeat\n\n')
        },
        cancel() {
            if (write) globalClients.delete(write)
        },
    })

    const heartbeatInterval = setInterval(() => {
        if (write) {
            try { write(': heartbeat\n\n') } catch { clearInterval(heartbeatInterval) }
        } else {
            clearInterval(heartbeatInterval)
        }
    }, 25_000)

    req.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        if (write) globalClients.delete(write)
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    })
}
