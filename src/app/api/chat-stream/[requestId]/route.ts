import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { chatClients } from '@/lib/sse-clients'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ requestId: string }> }
) {
    const { requestId } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 })
    }

    const changeReq = await prisma.santriChangeRequest.findUnique({
        where: { id: requestId },
        select: { id: true, requestedBy: true, status: true },
    })
    if (!changeReq) {
        return new Response('Not found', { status: 404 })
    }

    const encoder = new TextEncoder()
    let write: ((data: string) => void) | null = null

    const stream = new ReadableStream({
        start(controller) {
            write = (data: string) => {
                try { controller.enqueue(encoder.encode(data)) } catch { /* ignore */ }
            }
            if (!chatClients.has(requestId)) chatClients.set(requestId, new Set())
            chatClients.get(requestId)!.add(write)
            write(': heartbeat\n\n')
        },
        cancel() {
            if (write && chatClients.has(requestId)) {
                chatClients.get(requestId)!.delete(write)
                if (chatClients.get(requestId)!.size === 0) chatClients.delete(requestId)
            }
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
        if (write && chatClients.has(requestId)) {
            chatClients.get(requestId)!.delete(write)
            if (chatClients.get(requestId)!.size === 0) chatClients.delete(requestId)
        }
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
