import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/kk-preview?path=/uploads/kk/xxx.pdf
 * Serves the KK file with Content-Disposition: inline so the browser
 * previews it rather than downloading it.
 */
export async function GET(req: NextRequest) {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
        return new NextResponse('Missing path', { status: 400 })
    }

    // Only allow paths under /uploads/kk/
    if (!filePath.startsWith('/uploads/kk/')) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    // Prevent path traversal
    const relativePath = filePath.replace(/^\//, '')
    const absolutePath = path.resolve(path.join(process.cwd(), 'public', relativePath))
    const uploadRoot = path.resolve(path.join(process.cwd(), 'public', 'uploads', 'kk'))
    if (!absolutePath.startsWith(uploadRoot)) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    try {
        const buffer = await readFile(absolutePath)

        // Determine content type from extension
        const ext = absolutePath.split('.').pop()?.toLowerCase() ?? ''
        const contentTypeMap: Record<string, string> = {
            pdf: 'application/pdf',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
        }
        const contentType = contentTypeMap[ext] ?? 'application/octet-stream'

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': 'inline',
                'Cache-Control': 'private, max-age=3600',
                'X-Content-Type-Options': 'nosniff',
            },
        })
    } catch {
        return new NextResponse('File not found', { status: 404 })
    }
}
