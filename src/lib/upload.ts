import { randomUUID } from 'crypto'
import { mkdir, unlink, access } from 'fs/promises'
import path from 'path'

// ── Directories ──
const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads')

const SUBFOLDERS = {
    photo: 'photo',
    kk: 'kk',
    logo: 'logo',
} as const

export type UploadSubfolder = keyof typeof SUBFOLDERS

/**
 * Save a buffer to the local filesystem under `public/uploads/{subfolder}/{uuid}.{ext}`.
 * Returns the public URL path, e.g. `/uploads/photo/abc123.jpg`.
 */
export async function saveFileLocally(
    buffer: Buffer,
    subfolder: UploadSubfolder,
    ext: string
): Promise<{ url: string; filename: string }> {
    const dir = path.join(UPLOAD_ROOT, SUBFOLDERS[subfolder])
    await mkdir(dir, { recursive: true })

    const filename = `${randomUUID()}.${ext.replace(/^\./, '')}`
    const filePath = path.join(dir, filename)

    const { writeFile } = await import('fs/promises')
    await writeFile(filePath, buffer)

    const url = `/uploads/${SUBFOLDERS[subfolder]}/${filename}`
    return { url, filename }
}

/**
 * Delete a locally-stored upload by its URL path.
 * Only deletes files under `/uploads/` to prevent path traversal.
 * Silently ignores missing files or non-local URLs.
 */
export async function deleteLocalFile(urlOrPath: string | null | undefined): Promise<boolean> {
    if (!urlOrPath) return false

    // Only handle local uploads
    if (!isLocalUpload(urlOrPath)) return false

    // Sanitize: strip leading slash, resolve to absolute path
    const relativePath = urlOrPath.replace(/^\//, '')
    const absolutePath = path.join(process.cwd(), 'public', relativePath)

    // Security: ensure resolved path is still under UPLOAD_ROOT
    const resolved = path.resolve(absolutePath)
    if (!resolved.startsWith(path.resolve(UPLOAD_ROOT))) {
        console.warn('[upload] Blocked path traversal attempt:', urlOrPath)
        return false
    }

    try {
        await access(resolved)
        await unlink(resolved)
        return true
    } catch {
        // File doesn't exist or can't be deleted — that's OK
        return false
    }
}

/**
 * Check if a URL points to a locally-stored upload.
 */
export function isLocalUpload(url: string | null | undefined): boolean {
    if (!url) return false
    return url.startsWith('/uploads/')
}
