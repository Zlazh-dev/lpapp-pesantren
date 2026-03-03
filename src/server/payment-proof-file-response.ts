import { NextRequest, NextResponse } from 'next/server'

function inferContentTypeFromUrl(fileUrl: string): string {
    const lower = fileUrl.toLowerCase()
    if (lower.startsWith('data:')) {
        const match = lower.match(/^data:([^;,]+)[;,]/)
        if (match?.[1]) return match[1]
    }
    if (lower.includes('.pdf')) return 'application/pdf'
    if (lower.includes('.png')) return 'image/png'
    if (lower.includes('.webp')) return 'image/webp'
    if (lower.includes('.gif')) return 'image/gif'
    return 'image/jpeg'
}

function parseDataUrl(dataUrl: string): { contentType: string; data: Uint8Array } | null {
    const match = dataUrl.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,([\s\S]+)$/i)
    if (!match) return null

    const contentType = match[1] || 'application/octet-stream'
    const isBase64 = Boolean(match[2])
    const payload = match[3] ?? ''

    try {
        const data = isBase64
            ? Uint8Array.from(Buffer.from(payload, 'base64'))
            : new TextEncoder().encode(decodeURIComponent(payload))
        return { contentType, data }
    } catch {
        return null
    }
}

function logDevError(message: string, error: unknown) {
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[payment-proof-file] ${message}`, error)
    }
}

export async function createPaymentProofFileResponse(
    request: NextRequest,
    fileUrl: string
): Promise<NextResponse> {
    const normalizedUrl = fileUrl.trim()
    if (!normalizedUrl) {
        return NextResponse.json({ error: 'Proof file is missing' }, { status: 404 })
    }

    const lowerFileUrl = normalizedUrl.toLowerCase()
    if (lowerFileUrl.startsWith('data:')) {
        const parsed = parseDataUrl(normalizedUrl)
        if (!parsed) {
            return NextResponse.json({ error: 'Invalid proof data URL' }, { status: 400 })
        }
        const binaryBody = parsed.data as unknown as BodyInit
        return new NextResponse(binaryBody, {
            status: 200,
            headers: {
                'Content-Type': parsed.contentType,
                'Cache-Control': 'private, max-age=300',
            },
        })
    }

    let targetUrl = normalizedUrl
    if (normalizedUrl.startsWith('/')) {
        targetUrl = new URL(normalizedUrl, request.nextUrl.origin).toString()
    }

    try {
        const upstream = await fetch(targetUrl, { cache: 'no-store' })
        if (!upstream.ok || !upstream.body) {
            return NextResponse.json({ error: 'Failed to fetch proof file' }, { status: 502 })
        }

        const contentType = upstream.headers.get('content-type') ?? inferContentTypeFromUrl(normalizedUrl)
        return new NextResponse(upstream.body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'private, max-age=300',
            },
        })
    } catch (error) {
        logDevError('Upstream fetch failed', error)
        return NextResponse.json({ error: 'Failed to fetch proof file' }, { status: 502 })
    }
}
