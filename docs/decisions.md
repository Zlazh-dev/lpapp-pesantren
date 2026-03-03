# Keputusan Arsitektur

## Periode Invoice Gregorian vs Hijri

Tanggal keputusan: 2026-02-24

### Keputusan

Sistem menggunakan metadata periode display pada `Invoice` untuk mendukung dua mode tampilan periode:

- `GREGORIAN` untuk tampilan nama bulan Masehi.
- `HIJRI` untuk tampilan nama bulan Hijriah.

Field yang dipakai:

- `periodDisplayMode`
- `periodYear`
- `periodMonth`
- `hijriYear`
- `hijriMonth`
- `hijriVariant`

### Yang Berubah

- Periode invoice tidak lagi ditampilkan langsung dari format string hardcode seperti `MM/YYYY`.
- Semua tampilan periode invoice memakai formatter terpusat `formatBillingPeriod(invoice)`.
- Filtering rekap periode mengikuti mode kalender:
  - Gregorian: `periodYear` + `periodMonth`
  - Hijri: `hijriYear` + `hijriMonth`

### Yang Tidak Berubah

- Timestamp transaksi tetap Gregorian.
- Prisma tetap source of truth.
- Data transaksi pembayaran tidak diubah menjadi kalender Hijri; hanya label periode invoice yang mendukung mode Hijri.

### Alasan

- Menjaga kompatibilitas data transaksi existing.
- Menyatukan format tampilan periode di seluruh UI dengan satu formatter.
- Memungkinkan filter periode yang konsisten dan cepat dengan dukungan index database.
