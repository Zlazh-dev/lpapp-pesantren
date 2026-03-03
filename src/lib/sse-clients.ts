/**
 * In-memory SSE client stores for real-time chat push notifications.
 * Kept in a separate module so they can be imported by both the route handlers
 * and the tRPC router without triggering Next.js route-export validation errors.
 */

// Per-request SSE clients: requestId → Set of push functions
const chatClients = new Map<string, Set<(data: string) => void>>()

// Global SSE clients (for list refresh events)
const globalClients = new Set<(data: string) => void>()

export function notifyChatClients(requestId: string, message: any) {
    const writers = chatClients.get(requestId)
    if (!writers || writers.size === 0) return
    const payload = `data: ${JSON.stringify(message)}\n\n`
    writers.forEach(write => {
        try { write(payload) } catch { /* client disconnected */ }
    })
}

export function notifyReadReceipt(requestId: string) {
    const writers = chatClients.get(requestId)
    if (!writers || writers.size === 0) return
    const payload = `data: ${JSON.stringify({ __type: 'messages_read', requestId })}\n\n`
    writers.forEach(write => {
        try { write(payload) } catch { /* client disconnected */ }
    })
}

export function notifyGlobalClients(event: { type: 'new_request' | 'request_updated'; requestId?: string }) {
    if (globalClients.size === 0) return
    const payload = `data: ${JSON.stringify(event)}\n\n`
    globalClients.forEach(write => {
        try { write(payload) } catch { /* ignore */ }
    })
}

export { chatClients, globalClients }
