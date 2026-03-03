import ExcelJS from 'exceljs'

// ── Normalize helpers ──

export function normalizeHeader(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, '_')
}

export function normalizeNis(raw: string | number | undefined | null): string {
    if (raw == null) return ''
    return String(raw).trim().replace(/\s+/g, '')
}

export function parseDateStrict(raw: string | undefined | null): Date | null {
    if (!raw) return null
    const str = String(raw).trim()
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) return null
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`)
    if (isNaN(d.getTime())) return null
    return d
}

// ── Template generation ──

export async function generateSantriTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('santri')

    ws.columns = [
        { header: 'nis', key: 'nis', width: 15 },
        { header: 'full_name', key: 'full_name', width: 30 },
        { header: 'gender', key: 'gender', width: 8 },
        { header: 'birth_date', key: 'birth_date', width: 15 },
        { header: 'phone', key: 'phone', width: 18 },
        { header: 'address', key: 'address', width: 40 },
        { header: 'guardian_name', key: 'guardian_name', width: 25 },
        { header: 'guardian_phone', key: 'guardian_phone', width: 18 },
        { header: 'enrollment_date', key: 'enrollment_date', width: 15 },
        { header: 'education_level', key: 'education_level', width: 18 },
    ]

    // Style header row
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2F1' } }

    // Sample rows
    ws.addRow({ nis: '10001', full_name: 'Ahmad Fauzi', gender: 'L', birth_date: '2010-01-15', phone: '081234567890', address: 'Jl. Pesantren No. 1', guardian_name: 'Bapak Fauzi', guardian_phone: '081234567891', enrollment_date: '2024-07-15', education_level: "Ma'had Aly" })
    ws.addRow({ nis: '10002', full_name: 'Siti Aisyah', gender: 'P', birth_date: '2011-05-02', phone: '081234567892', address: 'Jl. Pesantren No. 2', guardian_name: 'Ibu Aisyah', guardian_phone: '081234567893', enrollment_date: '2024-07-15', education_level: 'Tahfidz' })

    const buf = await wb.xlsx.writeBuffer()
    return Buffer.from(buf)
}

// ── Parse uploaded file ──

type ParsedRow = {
    rowNumber: number
    nis: string
    full_name: string
    gender: string
    birth_date?: string
    phone?: string
    address?: string
    guardian_name?: string
    guardian_phone?: string
}

type ValidRow = { rowNumber: number; data: ParsedRow }
type InvalidRow = { rowNumber: number; errors: string[] }

export async function parseSantriXlsx(base64: string): Promise<{ totalRows: number; validRows: ValidRow[]; invalidRows: InvalidRow[] }> {
    const buf = Buffer.from(base64, 'base64')
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf as any)

    const ws = wb.getWorksheet('santri') ?? wb.worksheets[0]
    if (!ws) throw new Error('Tidak ada sheet ditemukan dalam file')

    // Get headers from row 1
    const headerRow = ws.getRow(1)
    const colMap: Record<string, number> = {}
    headerRow.eachCell((cell, colNumber) => {
        const raw = cell.value?.toString() ?? ''
        colMap[normalizeHeader(raw)] = colNumber
    })

    const requiredCols = ['nis', 'full_name', 'gender']
    for (const col of requiredCols) {
        if (!colMap[col]) throw new Error(`Kolom "${col}" tidak ditemukan di header`)
    }

    const validRows: ValidRow[] = []
    const invalidRows: InvalidRow[] = []
    const seenNis = new Map<string, number>() // nis -> first row number

    const getCell = (row: ExcelJS.Row, key: string): string => {
        const colIdx = colMap[key]
        if (!colIdx) return ''
        const v = row.getCell(colIdx).value
        if (v == null) return ''
        if (v instanceof Date) {
            return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`
        }
        return String(v).trim()
    }

    ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // skip header

        const errors: string[] = []
        const nis = normalizeNis(getCell(row, 'nis'))
        const full_name = getCell(row, 'full_name')
        const gender = getCell(row, 'gender').toUpperCase()
        const birth_date = getCell(row, 'birth_date') || undefined
        const phone = getCell(row, 'phone') || undefined
        const address = getCell(row, 'address') || undefined
        const guardian_name = getCell(row, 'guardian_name') || undefined
        const guardian_phone = getCell(row, 'guardian_phone') || undefined

        // Validation
        if (!nis) errors.push('NIS wajib diisi')
        if (!full_name) errors.push('Nama lengkap wajib diisi')
        if (!['L', 'P'].includes(gender)) errors.push('Gender harus L atau P')
        if (birth_date) {
            const d = parseDateStrict(birth_date)
            if (!d) errors.push(`Format tanggal lahir tidak valid: "${birth_date}" (gunakan YYYY-MM-DD)`)
        }

        // Duplicate NIS in file
        if (nis && seenNis.has(nis)) {
            errors.push(`NIS duplikat di file (sama dengan baris ${seenNis.get(nis)})`)
        } else if (nis) {
            seenNis.set(nis, rowNumber)
        }

        if (errors.length > 0) {
            invalidRows.push({ rowNumber, errors })
        } else {
            validRows.push({
                rowNumber,
                data: { rowNumber, nis, full_name, gender, birth_date, phone, address, guardian_name, guardian_phone },
            })
        }
    })

    return { totalRows: validRows.length + invalidRows.length, validRows, invalidRows }
}
