import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'
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

// ─── Allowed MIME types and extensions ───
const ALLOWED_TYPES: Record<string, { mimes: string[]; magicBytes: number[][] }> = {
    pdf: {
        mimes: ['application/pdf'],
        magicBytes: [[0x25, 0x50, 0x44, 0x46]], // %PDF
    },
    docx: {
        mimes: [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
        ],
        magicBytes: [
            [0x50, 0x4B, 0x03, 0x04], // ZIP (docx is a zip)
            [0xD0, 0xCF, 0x11, 0xE0], // OLE2 (old doc)
        ],
    },
    jpg: {
        mimes: ['image/jpeg'],
        magicBytes: [[0xFF, 0xD8, 0xFF]], // JFIF
    },
    png: {
        mimes: ['image/png'],
        magicBytes: [[0x89, 0x50, 0x4E, 0x47]], // PNG
    },
}

const ALL_MIMES = Object.values(ALLOWED_TYPES).flatMap((t) => t.mimes)
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

// ─── Security helpers ───

function detectTypeByMagicBytes(buf: Buffer): string | null {
    for (const [type, info] of Object.entries(ALLOWED_TYPES)) {
        for (const sig of info.magicBytes) {
            if (buf.length >= sig.length && sig.every((b, i) => buf[i] === b)) return type
        }
    }
    return null
}

function getExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    if (ext === 'doc') return 'docx'
    return ext
}

/** Scan buffer for suspicious patterns commonly found in malicious files */
function scanForThreats(buf: Buffer): string | null {
    const textSlice = buf.toString('latin1').toLowerCase()

    // Check for embedded JavaScript (common in malicious PDFs)
    if (textSlice.includes('/javascript') && textSlice.includes('/js')) {
        return 'File PDF mengandung JavaScript yang mencurigakan'
    }

    // Check for /OpenAction /AA (auto-action triggers in PDF)
    if (textSlice.includes('/openaction') && textSlice.includes('/js')) {
        return 'File PDF mengandung auto-action yang mencurigakan'
    }

    // Check for embedded executables
    const exeHeader = Buffer.from([0x4D, 0x5A]) // MZ header (exe/dll)
    for (let i = 0; i < buf.length - 2; i++) {
        if (buf[i] === exeHeader[0] && buf[i + 1] === exeHeader[1]) {
            // Check for PE header nearby
            if (i + 64 < buf.length) {
                const peOffset = buf.readUInt32LE(i + 60)
                if (i + peOffset + 4 < buf.length) {
                    const pe = buf.slice(i + peOffset, i + peOffset + 4).toString('latin1')
                    if (pe === 'PE\0\0') return 'File mengandung executable yang tersembunyi'
                }
            }
        }
    }

    // Check for VBA macros in Word docs (OLE2)
    if (buf[0] === 0xD0 && buf[1] === 0xCF) {
        if (textSlice.includes('vba') || textSlice.includes('macro')) {
            return 'File Word mengandung macro yang berpotensi berbahaya'
        }
    }

    // Check for suspicious XML/HTML in docx
    if (buf[0] === 0x50 && buf[1] === 0x4B) {
        if (textSlice.includes('<script') || textSlice.includes('javascript:')) {
            return 'File mengandung script yang mencurigakan'
        }
    }

    return null
}

function uploadToCloudinary(
    buffer: Buffer,
    options: { folder: string; resource_type: string; format?: string }
): Promise<{ secure_url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: options.folder,
                resource_type: options.resource_type as 'raw' | 'image' | 'auto',
                ...(options.format && { format: options.format }),
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

// ─── API Route ───

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        // 1. Auth check
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Parse form data
        const formData = await req.formData()
        const file = formData.get('file') as File
        if (!file) {
            return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
        }

        // 3. Size check
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `Ukuran file melebihi batas (maks ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
                { status: 400 }
            )
        }

        // 4. MIME type check
        if (!ALL_MIMES.includes(file.type)) {
            return NextResponse.json(
                { error: `Tipe file tidak didukung: ${file.type}. Hanya PDF, Word, JPG, PNG.` },
                { status: 400 }
            )
        }

        // 5. Extension check
        const ext = getExtension(file.name)
        if (!['pdf', 'docx', 'doc', 'jpg', 'jpeg', 'png'].includes(ext)) {
            return NextResponse.json(
                { error: `Ekstensi file tidak didukung: .${ext}` },
                { status: 400 }
            )
        }

        // 6. Read buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 7. Magic bytes validation (content matches claimed type)
        const detectedType = detectTypeByMagicBytes(buffer)
        if (!detectedType) {
            return NextResponse.json(
                { error: 'Isi file tidak sesuai dengan tipe yang diizinkan. File mungkin rusak atau disamarkan.' },
                { status: 400 }
            )
        }

        // Cross-check: detected type should match the extension
        const extNormalized = ext === 'jpeg' ? 'jpg' : ext === 'doc' ? 'docx' : ext
        if (detectedType !== extNormalized) {
            return NextResponse.json(
                { error: `Isi file (${detectedType}) tidak sesuai dengan ekstensi (.${ext}). File mungkin disamarkan.` },
                { status: 400 }
            )
        }

        // 8. Threat scan
        const threat = scanForThreats(buffer)
        if (threat) {
            return NextResponse.json(
                { error: `File ditolak: ${threat}` },
                { status: 400 }
            )
        }

        // 9. Upload: try Cloudinary first, then local filesystem
        const isImage = ['jpg', 'png'].includes(detectedType)

        if (hasCloudinary) {
            try {
                const result = await uploadToCloudinary(buffer, {
                    folder: 'pesantren/kk-documents',
                    resource_type: isImage ? 'image' : 'raw',
                    format: isImage ? detectedType : undefined,
                })

                return NextResponse.json({
                    url: result.secure_url,
                    public_id: result.public_id,
                    detectedType,
                    fileName: file.name,
                })
            } catch (cloudErr) {
                console.warn('Cloudinary upload failed, falling back to local storage:', cloudErr)
            }
        }

        // Fallback: save to local filesystem
        const { url, filename } = await saveFileLocally(buffer, 'kk', detectedType)
        return NextResponse.json({
            url,
            public_id: 'local_' + filename,
            detectedType,
            fileName: file.name,
        })
    } catch (error) {
        console.error('KK upload error:', error)
        return NextResponse.json(
            { error: 'Terjadi kesalahan saat memproses file.' },
            { status: 500 }
        )
    }
}
