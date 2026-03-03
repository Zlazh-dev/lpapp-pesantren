import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'
import sharp from 'sharp'
import { resolveActiveGuardianLink } from '@/server/guardian-link'
import { prisma } from '@/lib/prisma'
import { saveFileLocally } from '@/lib/upload'

// Try configuring Cloudinary, but don't fail immediately if env vars are missing
const hasCloudinary = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
)

if (hasCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    })
}

// Allowed image MIME types
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
])

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif',
])

// Magic bytes signatures for common image formats
const IMAGE_SIGNATURES: { bytes: number[]; offset?: number }[] = [
    { bytes: [0xFF, 0xD8, 0xFF] },                          // JPEG
    { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A] },       // PNG
    { bytes: [0x52, 0x49, 0x46, 0x46] },                    // WEBP (RIFF header)
    { bytes: [0x47, 0x49, 0x46, 0x38] },                    // GIF (GIF87a / GIF89a)
    { bytes: [0x42, 0x4D] },                                 // BMP
    { bytes: [0x49, 0x49, 0x2A, 0x00] },                    // TIFF (little-endian)
    { bytes: [0x4D, 0x4D, 0x00, 0x2A] },                    // TIFF (big-endian)
]

function isImageByMagicBytes(buffer: Buffer): boolean {
    if (buffer.length < 8) return false
    return IMAGE_SIGNATURES.some(sig => {
        const offset = sig.offset ?? 0
        return sig.bytes.every((byte, i) => buffer[offset + i] === byte)
    })
}

function getFileExtension(filename: string): string {
    const idx = filename.lastIndexOf('.')
    return idx >= 0 ? filename.slice(idx).toLowerCase() : ''
}

function uploadToCloudinary(buffer: Buffer): Promise<{ secure_url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'pesantren/santri',
                resource_type: 'image',
            },
            (error, result) => {
                if (error) return reject(error)
                resolve({
                    secure_url: result?.secure_url ?? '',
                    public_id: result?.public_id ?? '',
                })
            }
        )
        uploadStream.end(buffer)
    })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions)
        const formData = await req.formData()
        const token = formData.get('token')
        const guardianToken = typeof token === 'string' ? token : null

        // Allow either authenticated staff or a valid guardian token.
        if (!session?.user) {
            if (!guardianToken) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            try {
                await resolveActiveGuardianLink(prisma, guardianToken)
            } catch {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }

        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // ── Validation 1: Check MIME type ──
        if (!file.type || !ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json(
                { error: 'Hanya file gambar yang diperbolehkan (JPG, PNG, WebP). Tipe file terdeteksi: ' + (file.type || 'tidak diketahui') },
                { status: 400 }
            )
        }

        // ── Validation 2: Check file extension ──
        const ext = getFileExtension(file.name ?? '')
        if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
            return NextResponse.json(
                { error: 'Ekstensi file tidak diperbolehkan: ' + ext + '. Hanya JPG, PNG, WebP, GIF yang diperbolehkan.' },
                { status: 400 }
            )
        }

        // ── Validation 3: Check file size (max 10MB) ──
        const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'Ukuran file terlalu besar. Maksimal 10MB.' },
                { status: 400 }
            )
        }

        // Convert the File to a Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // ── Validation 4: Check magic bytes (actual file content) ──
        if (!isImageByMagicBytes(buffer)) {
            return NextResponse.json(
                { error: 'File bukan gambar yang valid. Pastikan file adalah gambar asli (JPG, PNG, WebP).' },
                { status: 400 }
            )
        }

        // Process image with Sharp
        // Resize to 400x600 (3:4 aspect ratio)
        // Add blue background for transparent images
        // Output as JPEG to ensure background is applied
        const processedBuffer = await sharp(buffer)
            .resize(400, 600, {
                fit: 'cover',
                position: 'top',
            })
            // #0a4f9b is a common standard blue color for ID photos
            .flatten({ background: '#0a4f9b' })
            .jpeg({ quality: 90 })
            .toBuffer()

        // Try Cloudinary first, then fallback to local filesystem
        if (hasCloudinary) {
            try {
                const result = await uploadToCloudinary(processedBuffer)
                return NextResponse.json({
                    url: result.secure_url,
                    public_id: result.public_id,
                })
            } catch (cloudErr) {
                console.warn('Cloudinary upload failed, falling back to local storage:', cloudErr)
            }
        }

        // Fallback: save to local filesystem
        const { url, filename } = await saveFileLocally(processedBuffer, 'photo', 'jpg')
        return NextResponse.json({
            url,
            public_id: 'local_' + filename,
        })

    } catch (error) {
        console.error('File upload error:', error)
        return NextResponse.json(
            { error: 'Gagal memproses gambar. Pastikan file adalah gambar yang valid.' },
            { status: 500 }
        )
    }
}
