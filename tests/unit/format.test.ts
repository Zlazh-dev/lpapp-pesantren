import { describe, it, expect } from 'vitest'
import { formatRupiah, getGenderLabel, getBillStatusLabel } from '../../src/utils/format'
import { BillStatus } from '@prisma/client'

describe('Format Utils', () => {
    it('formats rupiah correctly', () => {
        expect(formatRupiah(150000)).toBe('Rp\xa0150.000')
        expect(formatRupiah(0)).toBe('Rp\xa00')
    })

    it('returns correct gender label', () => {
        expect(getGenderLabel('L')).toBe('Laki-laki')
        expect(getGenderLabel('P')).toBe('Perempuan')
    })

    it('returns correct bill status label', () => {
        expect(getBillStatusLabel(BillStatus.PAID)).toBe('Lunas')
        expect(getBillStatusLabel(BillStatus.PENDING)).toBe('Belum Lunas')
        expect(getBillStatusLabel(BillStatus.PARTIAL)).toBe('Sebagian')
    })
})
