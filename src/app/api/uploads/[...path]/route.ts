import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'

// Must match the UPLOAD_ROOT in src/lib/upload.ts
// If UPLOAD_DIR is set (production), files are stored there (outside app dir, survives rebuilds).
// Otherwise fall back to public/uploads (local dev).
const UPLOAD_ROOT = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(path.join(process.cwd(), 'public', 'uploads'))

const CONTENT_TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
}

/**
 * GET /api/uploads/photo/xxx.jpg
 * GET /api/uploads/logo/xxx.png
 * GET /api/uploads/kk/xxx.pdf
 *
 * Serves locally stored upload files.
 * Only serves files under the UPLOAD_ROOT for security.
 * No auth required (URLs are non-guessable UUIDs).
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
    const { path: segments } = await params
    if (!segments || segments.length === 0) {
        return new NextResponse('Not found', { status: 404 })
    }

    // Reconstruct the relative path and resolve to absolute
    const relativePath = segments.join('/')
    const absolutePath = path.resolve(path.join(UPLOAD_ROOT, relativePath))

    // Security: ensure resolved path is still under UPLOAD_ROOT (prevent path traversal)
    if (!absolutePath.startsWith(UPLOAD_ROOT)) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    try {
        const buffer = await readFile(absolutePath)
        const ext = absolutePath.split('.').pop()?.toLowerCase() ?? ''
        const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream'

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
                'X-Content-Type-Options': 'nosniff',
            },
        })
    } catch {
        return new NextResponse('File not found', { status: 404 })
    }
}
