export type BillingPeriodDisplayMode = 'GREGORIAN' | 'HIJRI'

export type BillingPeriodLike = {
    periodDisplayMode?: BillingPeriodDisplayMode | null
    periodYear?: number | null
    periodMonth?: number | null
    hijriYear?: number | null
    hijriMonth?: number | null
    periodKey?: string | null
}

const GREGORIAN_MONTH_NAMES_ID = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
] as const

const HIJRI_MONTH_NAMES_ID = [
    'Muharram',
    'Safar',
    'Rabiulawal',
    'Rabiulakhir',
    'Jumadilawal',
    'Jumadilakhir',
    'Rajab',
    'Syakban',
    'Ramadan',
    'Syawal',
    'Zulkaidah',
    'Dzulhijjah',
] as const

export function monthNameId(monthNumber: number): string {
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) return '-'
    return GREGORIAN_MONTH_NAMES_ID[monthNumber - 1]
}

export function hijriMonthNameId(hijriMonthNumber: number): string {
    if (!Number.isInteger(hijriMonthNumber) || hijriMonthNumber < 1 || hijriMonthNumber > 12) return '-'
    return HIJRI_MONTH_NAMES_ID[hijriMonthNumber - 1]
}

export function parseGregorianPeriodKey(periodKey: string | null | undefined): {
    periodYear: number | null
    periodMonth: number | null
} {
    if (!periodKey) return { periodYear: null, periodMonth: null }

    const monthly = periodKey.match(/^(\d{4})-(\d{2})$/)
    if (monthly) {
        const periodYear = Number(monthly[1])
        const periodMonth = Number(monthly[2])
        if (periodMonth >= 1 && periodMonth <= 12) {
            return { periodYear, periodMonth }
        }
    }

    const yearly = periodKey.match(/^(\d{4})$/)
    if (yearly) {
        return { periodYear: Number(yearly[1]), periodMonth: null }
    }

    return { periodYear: null, periodMonth: null }
}

export function formatBillingPeriod(invoice: BillingPeriodLike, locale = 'id-ID'): string {
    void locale

    const mode = invoice.periodDisplayMode ?? 'GREGORIAN'

    if (mode === 'HIJRI') {
        if (invoice.hijriMonth && invoice.hijriYear) {
            return `${hijriMonthNameId(invoice.hijriMonth)} ${invoice.hijriYear} H`
        }
    }

    const periodYear = invoice.periodYear ?? parseGregorianPeriodKey(invoice.periodKey).periodYear
    const periodMonth = invoice.periodMonth ?? parseGregorianPeriodKey(invoice.periodKey).periodMonth

    if (periodMonth && periodYear) {
        return `${monthNameId(periodMonth)} ${periodYear}`
    }
    if (periodYear) {
        return String(periodYear)
    }

    if (invoice.periodKey) {
        return invoice.periodKey
    }

    return '-'
}
