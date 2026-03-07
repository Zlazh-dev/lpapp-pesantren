import { z } from 'zod'
import { router, protectedProcedure, hasRole } from '../trpc'
import { TRPCError } from '@trpc/server'

const uploadProcedure = protectedProcedure.use(({ ctx, next }) => {
    const allowed = hasRole(ctx, 'ADMIN') || hasRole(ctx, 'STAF_PENDATAAN')
    if (!allowed) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Akses ditolak. Hanya Admin dan Staf Pendataan yang bisa upload data santri.',
        })
    }
    return next({ ctx })
})

/**
 * Parse date string supporting DD/MM/YYYY (Indonesia) and YYYY-MM-DD (ISO).
 * Uses local Date constructor at noon to avoid timezone shifting the date.
 */
function parseDate(val: string | undefined | null): Date | null {
    if (!val || val.trim() === '') return null
    const s = val.trim()

    // DD/MM/YYYY or DD-MM-YYYY — Indonesian format
    const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (dmyMatch) {
        const [, dd, mm, yyyy] = dmyMatch
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0)
        return isNaN(d.getTime()) ? null : d
    }

    // YYYY-MM-DD or YYYY/MM/DD — ISO format (set noon to avoid TZ shift)
    const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
    if (isoMatch) {
        const [, yyyy, mm, dd] = isoMatch
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0)
        return isNaN(d.getTime()) ? null : d
    }

    return null
}

/** Pad RT/RW number to 3 digits: "5" → "005", "05" → "005" */
function padRtRw(val: string): string {
    return val.replace(/\d+/g, n => n.padStart(3, '0'))
}

/**
 * Build address JSON object.
 * Priority: explicit RT/ RW/ Dusun columns.
 * Fallback: parse from legacy combined rt_rw string (e.g. "RT 005 / RW 003").
 * Supports variatif Indonesian inputs: "RT05RW08", "RT:005 RW:008 Dusun Krajan", etc.
 */
function buildAddress(row: {
    provinsi?: string; kota?: string; kecamatan?: string; kelurahan?: string
    jalan?: string; rt?: string; rw?: string; dusun?: string; rt_rw?: string
}): Record<string, string> | null {
    const addr: Record<string, string> = {}

    if (row.provinsi) addr.provinsi = row.provinsi.trim()
    if (row.kota) addr.kota = row.kota.trim()
    if (row.kecamatan) addr.kecamatan = row.kecamatan.trim()
    if (row.kelurahan) addr.kelurahan = row.kelurahan.trim()
    if (row.jalan) addr.jalan = row.jalan.trim()
    if (row.dusun) addr.dusun = row.dusun.trim()

    // Priority 1: explicit RT / RW columns
    if (row.rt || row.rw) {
        if (row.rt) addr.rt = padRtRw(row.rt.trim())
        if (row.rw) addr.rw = padRtRw(row.rw.trim())
    } else if (row.rt_rw) {
        // Priority 2: parse from combined RT/RW string
        const s = row.rt_rw.trim()
        const rtMatch = s.match(/RT\s*[:\/\-]?\s*0*(\d{1,3})/i)
        const rwMatch = s.match(/RW\s*[:\/\-]?\s*0*(\d{1,3})/i)
        const dusunMatch = s.match(/(?:DUSUN|DSN|KAMPUNG|KP|LINGKUNGAN|LK)\s*[:\/\-]?\s*([\w\s]+?)(?:\s+(?:RT|RW|$))/i)

        if (rtMatch) addr.rt = rtMatch[1].padStart(3, '0')
        if (rwMatch) addr.rw = rwMatch[1].padStart(3, '0')
        if (dusunMatch && !addr.dusun) addr.dusun = dusunMatch[1].trim()

        // If no RT/RW found but string exists, store as raw fallback
        if (!rtMatch && !rwMatch) addr.rt_rw = s
    }

    return Object.keys(addr).length > 0 ? addr : null
}

const rowSchema = z.object({
    nis: z.string().min(1),
    fullName: z.string().min(1),
    gender: z.string().optional(),
    birthDate: z.string().optional(),
    birthPlace: z.string().optional(),
    phone: z.string().optional(),
    nik: z.string().optional(),
    noKK: z.string().optional(),
    enrollmentDate: z.string().optional(),
    deactivatedAt: z.string().optional(),   // Tanggal Keluar → alumni otomatis
    educationLevel: z.string().optional(),
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
    fatherPhone: z.string().optional(),
    motherPhone: z.string().optional(),
    waliName: z.string().optional(),
    waliPhone: z.string().optional(),
    description: z.string().optional(),
    // Address fields — separate columns (priority)
    provinsi: z.string().optional(),
    kota: z.string().optional(),
    kecamatan: z.string().optional(),
    kelurahan: z.string().optional(),
    jalan: z.string().optional(),
    rt: z.string().optional(),       // separate RT column (new)
    rw: z.string().optional(),       // separate RW column (new)
    dusun: z.string().optional(),    // separate Dusun column (new)
    rt_rw: z.string().optional(),    // legacy combined column (backward compat)
})

export const santriUploadRouter = router({
    uploadViaNis: uploadProcedure
        .input(z.object({
            rows: z.array(rowSchema).min(1).max(1000),
        }))
        .mutation(async ({ ctx, input }) => {
            let created = 0
            let updated = 0
            const errors: { row: number; nis: string; message: string }[] = []

            for (let i = 0; i < input.rows.length; i++) {
                const row = input.rows[i]
                try {
                    const data: Record<string, any> = {
                        fullName: row.fullName.trim(),
                    }

                    if (row.gender && (row.gender === 'L' || row.gender === 'P')) {
                        data.gender = row.gender
                    }

                    const birthDate = parseDate(row.birthDate)
                    if (birthDate) {
                        data.birthDate = birthDate
                    } else if (row.birthDate?.trim()) {
                        throw new Error(`Format tanggal lahir tidak valid: "${row.birthDate}". Gunakan DD/MM/YYYY`)
                    }

                    if (row.birthPlace) data.birthPlace = row.birthPlace.trim()
                    if (row.phone) data.phone = row.phone.trim()
                    if (row.nik) data.nik = row.nik.trim()
                    if (row.noKK) data.noKK = row.noKK.trim()

                    const enrollmentDate = parseDate(row.enrollmentDate)
                    if (enrollmentDate) {
                        data.enrollmentDate = enrollmentDate
                    } else if (row.enrollmentDate?.trim()) {
                        throw new Error(`Format tanggal masuk tidak valid: "${row.enrollmentDate}". Gunakan DD/MM/YYYY`)
                    }

                    // Tanggal Keluar → alumni otomatis (isActive: false)
                    const deactivatedAt = parseDate(row.deactivatedAt)
                    if (deactivatedAt) {
                        data.deactivatedAt = deactivatedAt
                        data.isActive = false
                    } else if (row.deactivatedAt?.trim()) {
                        throw new Error(`Format tanggal keluar tidak valid: "${row.deactivatedAt}". Gunakan DD/MM/YYYY`)
                    }

                    if (row.educationLevel) data.educationLevel = row.educationLevel.trim()
                    if (row.fatherName) data.fatherName = row.fatherName.trim()
                    if (row.motherName) data.motherName = row.motherName.trim()
                    if (row.fatherPhone) data.fatherPhone = row.fatherPhone.trim()
                    if (row.motherPhone) data.motherPhone = row.motherPhone.trim()
                    if (row.waliName) data.waliName = row.waliName.trim()
                    if (row.waliPhone) data.waliPhone = row.waliPhone.trim()
                    if (row.description) data.description = row.description.trim()

                    // Build address JSON (handles separate RT/RW columns + legacy combined string)
                    const addr = buildAddress(row)
                    if (addr) data.address = addr

                    const existing = await ctx.prisma.santri.findUnique({
                        where: { nis: row.nis.trim() },
                        select: { id: true },
                    })

                    if (existing) {
                        await ctx.prisma.santri.update({
                            where: { id: existing.id },
                            data,
                        })
                        updated++
                    } else {
                        await ctx.prisma.santri.create({
                            data: {
                                nis: row.nis.trim(),
                                fullName: data.fullName,
                                ...data,
                            },
                        })
                        created++
                    }
                } catch (e: any) {
                    errors.push({
                        row: i + 2,
                        nis: row.nis,
                        message: e.message?.substring(0, 150) || 'Unknown error',
                    })
                }
            }

            return { created, updated, errors, total: input.rows.length }
        }),
})
