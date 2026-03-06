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

// Minimal SVG placeholder shown when a logo file is missing (avoids broken image icon)
const FALLBACK_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="12" fill="#e5e7eb"/>
  <text x="60" y="50" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#9ca3af">Logo</text>
  <text x="60" y="68" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#9ca3af">Belum</text>
  <text x="60" y="86" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#9ca3af">Diupload</text>
</svg>`

/**
 * GET /api/uploads/photo/xxx.jpg
 * GET /api/uploads/logo/xxx.png
 * GET /api/uploads/kk/xxx.pdf
 *
 * Serves locally stored upload files from UPLOAD_DIR.
 * - Path traversal protected (resolvedPath must start with UPLOAD_ROOT)
 * - Logo files: returns SVG placeholder instead of 404 (prevents broken image)
 * - Non-logo files: returns 404 normally
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
    if (!absolutePath.startsWith(UPLOAD_ROOT + path.sep) && absolutePath !== UPLOAD_ROOT) {
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
    } catch (err: unknown) {
        const isNotFound = err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT'

        // For logo files: return SVG placeholder to avoid broken image icon in UI
        const isLogoRequest = segments[0] === 'logo'
        if (isLogoRequest && isNotFound) {
            console.warn(`[uploads] Logo file missing: ${absolutePath} — returning placeholder`)
            return new NextResponse(FALLBACK_LOGO_SVG, {
                status: 200,
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'no-store', // don't cache placeholder
                    'X-Content-Type-Options': 'nosniff',
                },
            })
        }

        // For other files (photo, kk): log and return 404
        if (isNotFound) {
            console.warn(`[uploads] File not found: ${absolutePath}`)
        } else {
            console.error(`[uploads] Error reading file: ${absolutePath}`, err)
        }
        return new NextResponse('File not found', { status: 404 })
    }
}
