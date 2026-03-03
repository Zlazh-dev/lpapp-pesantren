import { useEffect, useCallback, useRef } from 'react'

interface GlobalEvent {
    type: 'new_request' | 'request_updated'
    requestId?: string
}

interface UseGlobalStreamOptions {
    onEvent: (event: GlobalEvent) => void
    enabled?: boolean
}

/**
 * Subscribes to global real-time events (new request, request updated)
 * via Server-Sent Events. Used by admin to auto-refresh the request list.
 */
export function useGlobalStream({ onEvent, enabled = true }: UseGlobalStreamOptions) {
    const onEventRef = useRef(onEvent)
    onEventRef.current = onEvent

    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const retriesRef = useRef(0)

    const connect = useCallback(() => {
        if (!enabled) return

        const es = new EventSource('/api/chat-stream/global')

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as GlobalEvent
                onEventRef.current(data)
                retriesRef.current = 0
            } catch {
                // Heartbeat/comment — ignore
            }
        }

        es.onerror = () => {
            es.close()
            const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30_000)
            retriesRef.current += 1
            reconnectTimerRef.current = setTimeout(connect, delay)
        }

        return es
    }, [enabled])

    useEffect(() => {
        if (!enabled) return

        retriesRef.current = 0
        const es = connect()

        return () => {
            es?.close()
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        }
    }, [enabled, connect])
}
