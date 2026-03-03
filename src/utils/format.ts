/**
 * Format Rupiah currency
 */
export function formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

/**
 * Format date to Indonesian locale
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...options,
    }).format(d)
}

/**
 * Format short date (DD/MM/YYYY)
 */
export function formatShortDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(d)
}

/**
 * Bill status label mapping
 */
export function getBillStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        PENDING: 'Belum Lunas',
        PAID: 'Lunas',
        PARTIAL: 'Sebagian',
    }
    return labels[status] ?? status
}

/**
 * Bill status color mapping
 */
export function getBillStatusColor(status: string): string {
    const colors: Record<string, string> = {
        PENDING: 'text-red-600 bg-red-50',
        PAID: 'text-emerald-600 bg-emerald-50',
        PARTIAL: 'text-amber-600 bg-amber-50',
    }
    return colors[status] ?? 'text-gray-600 bg-gray-50'
}

/**
 * Role display name mapping
 */
export function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
        ADMIN: 'Administrator',
        STAF_PENDATAAN: 'Staf Pendataan',
        STAF_MADRASAH: 'Staf Madrasah',
        WALI_KELAS: 'Wali Kelas',
        PEMBIMBING_KAMAR: 'Pembimbing Kamar',
    }
    return labels[role] ?? role
}

/**
 * Attendance status label
 */
export function getAttendanceLabel(status: string): string {
    const labels: Record<string, string> = {
        HADIR: 'Hadir',
        SAKIT: 'Sakit',
        IZIN: 'Izin',
        ALPHA: 'Alpha',
    }
    return labels[status] ?? status
}

/**
 * Attendance status color
 */
export function getAttendanceColor(status: string): string {
    const colors: Record<string, string> = {
        HADIR: 'text-emerald-600 bg-emerald-50',
        SAKIT: 'text-blue-600 bg-blue-50',
        IZIN: 'text-amber-600 bg-amber-50',
        ALPHA: 'text-red-600 bg-red-50',
    }
    return colors[status] ?? 'text-gray-600 bg-gray-50'
}

/**
 * Gender label
 */
export function getGenderLabel(gender: string): string {
    return gender === 'L' ? 'Laki-laki' : 'Perempuan'
}
