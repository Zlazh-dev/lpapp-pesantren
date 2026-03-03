import { useEffect, useCallback, useRef } from 'react'

interface ChatMessage {
    id: string
    requestId: string
    senderId: string
    message: string
    readAt?: string | Date | null
    createdAt: string | Date
    sender?: { id: string; fullName: string; role: string }
    __type?: never
}

interface ReadEvent {
    __type: 'messages_read'
    requestId: string
}

interface UseChatStreamOptions {
    requestId: string | null
    onMessage: (msg: ChatMessage) => void
    onRead?: () => void   // called when recipient marks messages as read
    enabled?: boolean
}

/**
 * Subscribes to real-time chat messages via Server-Sent Events.
 * Falls back gracefully if the connection drops.
 */
export function useChatStream({ requestId, onMessage, onRead, enabled = true }: UseChatStreamOptions) {
    const onMessageRef = useRef(onMessage)
    onMessageRef.current = onMessage
    const onReadRef = useRef(onRead)
    onReadRef.current = onRead

    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const retriesRef = useRef(0)

    const connect = useCallback(() => {
        if (!requestId || !enabled) return

        const es = new EventSource(`/api/chat-stream/${requestId}`)

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as ChatMessage | ReadEvent
                if (data.__type === 'messages_read') {
                    onReadRef.current?.()
                } else {
                    onMessageRef.current(data as ChatMessage)
                }
                retriesRef.current = 0
            } catch {
                // Comment data or invalid JSON — ignore
            }
        }

        es.onerror = () => {
            es.close()
            // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
            const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30_000)
            retriesRef.current += 1
            reconnectTimerRef.current = setTimeout(connect, delay)
        }

        return es
    }, [requestId, enabled])

    useEffect(() => {
        if (!requestId || !enabled) return

        retriesRef.current = 0
        const es = connect()

        return () => {
            es?.close()
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        }
    }, [requestId, enabled, connect])
}
