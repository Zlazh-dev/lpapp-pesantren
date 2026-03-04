import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'
import sharp from 'sharp'
import { saveFileLocally } from '@/lib/upload'

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

function uploadToCloudinary(
    buffer: Buffer,
    folder: string
): Promise<{ secure_url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image' },
            (error, result) => {
                if (error) return reject(error)
                resolve({ secure_url: result?.secure_url ?? '', public_id: result?.public_id ?? '' })
            }
        )
        uploadStream.end(buffer)
    })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // ?type=sidebar (default) or ?type=document
        const logoType = (req.nextUrl.searchParams.get('type') || 'sidebar') as 'sidebar' | 'document'

        const formData = await req.formData()
        const file = formData.get('file') as File
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
        if (!file.type || !allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Hanya file gambar yang diperbolehkan' }, { status: 400 })
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'Ukuran file maks 5MB' }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        let buffer = Buffer.from(new Uint8Array(arrayBuffer))

        // For non-SVG images, process with sharp
        if (file.type !== 'image/svg+xml') {
            buffer = Buffer.from(await sharp(buffer)
                .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
                .png({ quality: 90 })
                .toBuffer())
        }

        const cloudinaryFolder = logoType === 'document'
            ? 'pesantren/settings/document'
            : 'pesantren/settings/sidebar'

        // Try Cloudinary first
        if (hasCloudinary) {
            try {
                const result = await uploadToCloudinary(buffer, cloudinaryFolder)
                return NextResponse.json({ url: result.secure_url, public_id: result.public_id, type: logoType })
            } catch (cloudErr) {
                console.warn('Cloudinary logo upload failed, falling back to local:', cloudErr)
            }
        }

        // Fallback: local storage
        const ext = file.type === 'image/svg+xml' ? 'svg' : 'png'
        const { url, filename } = await saveFileLocally(buffer, 'logo', ext)
        return NextResponse.json({ url, public_id: 'local_' + filename, type: logoType })
    } catch (error) {
        console.error('Logo upload error:', error)
        return NextResponse.json({ error: 'Gagal upload logo' }, { status: 500 })
    }
}
