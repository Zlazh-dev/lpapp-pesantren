# Audit dan Rencana Implementasi Periode Hijriah

## Tujuan
Dokumen ini mengaudit seluruh penggunaan periode/tanggal pada domain keuangan (billing, invoice, payment, receipt, portal wali) dan menyajikan rencana migrasi ke periode Hijriah tanpa mengubah Prisma sebagai source of truth transaksi.

## Ringkasan Audit
Kondisi saat ini:
- Sistem menggunakan Gregorian untuk penyimpanan tanggal (`issuedAt`, `dueAt`, `paidAt`, `createdAt`, `updatedAt`).
- Periode invoice disimpan sebagai string `periodKey` (contoh `2025-04`).
- UI filtering periode menggunakan input Gregorian (`type="month"`).
- Label periode pada UI/receipt masih berbasis `periodKey` Gregorian.
- Terdapat dua alur data: alur baru `Invoice/Payment` dan alur legacy `Bill`.

Dampak utama:
- Belum ada field/indeks Hijriah untuk filtering dan rekap cepat.
- Belum ada util konversi Hijriah terpusat.
- Periode laporan di beberapa halaman masih legacy `Bill.period`.

## Area Terdampak (Paths)

### Prisma dan Migration
- `prisma/schema.prisma`
- `prisma/migrations/20260224014832_page_group_access_control/migration.sql`
- `prisma/migrations/20260224143440_guardian_invoice_payment_proof_flow/migration.sql`
- `prisma/seed.ts`

### tRPC Router (Backend)
- `src/server/routers/invoice.ts`
- `src/server/routers/payment.ts`
- `src/server/routers/billing.ts`
- `src/server/routers/link.ts`
- `src/server/routers/payment-proof.ts` (legacy proof via `Bill`)
- `src/app/api/receipt/[paymentId]/route.ts`

### UI Desktop
- `src/app/(desktop)/billing/models/page.tsx`
- `src/app/(desktop)/billing/rekap/page.tsx`
- `src/app/(desktop)/billing/page.tsx` (legacy bill dashboard)
- `src/app/(desktop)/dashboard/page.tsx`
- `src/app/(desktop)/santri/[id]/_components/SantriDetailClient.tsx`
- `src/app/(desktop)/billing/rekap/proofs/[proofId]/page.tsx`
- `src/app/(desktop)/billing/rekap/payments/[paymentId]/proof/page.tsx`

### UI Public Guardian
- `src/app/link/[token]/_components/GuardianPortalClient.tsx`
- `src/app/link/[token]/upload-proof/page.tsx` (legacy bill flow)

### UI Mobile
- `src/app/(mobile)/m-billing/page.tsx` (legacy bill dashboard)
- `src/app/(mobile)/m-santri/[id]/page.tsx` (legacy `bill.period`)

### Komponen Shared dan Util
- `src/components/receipt/ReceiptView.tsx`
- `src/components/receipt/exportReceiptImage.ts`
- `src/utils/format.ts`
- `src/server/utils/xlsx.ts` (date parsing util, perlu konsistensi timezone)

## Temuan Detail

### Model Data
- `Invoice.periodKey` adalah string Gregorian dan menjadi kunci unik dengan `santriId + billingModelId`.
- `Invoice` belum memiliki field Hijriah terindeks.
- `Payment.paidAt` dan `Receipt.generatedAt` tetap perlu Gregorian untuk audit transaksi.
- Legacy `Bill.period` masih dipakai di beberapa layar.

### Filtering dan Rekap
- `invoice.list` memfilter exact `periodKey`.
- `invoice.stats` memfilter optional `periodKey`.
- `billing.dashboard` masih memfilter `Bill.period` (legacy).
- `billing/rekap` UI menggunakan input `month` Gregorian.

### Label/Display Periode
- Portal wali `link.ts` menggunakan `toPeriodLabel` dari `periodKey`.
- Receipt menampilkan `periodLabel` dari `periodKey`.
- Halaman detail bukti pembayaran menampilkan `invoice.periodKey`.

### Export/Print
- Receipt print/export sudah ada, tetapi periode masih Gregorian.
- Tidak ada modul export finansial berbasis Hijriah saat ini.

## Klasifikasi Opsi Implementasi

### Opsi A: Display-only Hijriah
- Simpan data tetap Gregorian, konversi Hijriah hanya saat render UI.
- Pro: perubahan schema minimal.
- Kontra: filter/laporan Hijriah lambat dan tidak deterministik lintas versi library/timezone.

### Opsi B: Dual-calendar (Direkomendasikan)
- Simpan timestamp transaksi Gregorian, tambah field periode Hijriah ter-derive di `Invoice`.
- Pro: query cepat, deterministik, aman untuk rekap dan indexing.
- Kontra: perlu migrasi + backfill.

### Opsi C: Hijriah sebagai primary period
- Periode invoice utama pakai Hijriah (`year+month`), tanggal transaksi tetap Gregorian.
- Pro: model domain paling natural untuk bendahara.
- Kontra: migrasi paling besar, menyentuh unique key + seluruh alur generate/filter.

## Rekomendasi
Gunakan **Opsi B (Dual-calendar dengan field Hijriah di Invoice)**.

Alasan:
- Menjaga timestamp transaksi tetap Gregorian untuk audit.
- Mendukung filter/report Hijriah dengan indeks database.
- Perubahan terkontrol, tidak memutus alur eksisting.
- Memungkinkan transisi bertahap ke Opsi C di masa depan bila dibutuhkan.

## Standar Kalender dan Timezone
- Source of truth varian Hijriah: `umm_al_qura`.
- Timezone bisnis: `Asia/Jakarta` (`UTC+07:00`).
- Semua konversi Gregorian ke Hijriah harus dilakukan dengan timezone bisnis yang sama.

Catatan:
- Varian `indonesia` atau `moon_sighting` disimpan sebagai metadata (`hijriCalendarVariant`) untuk kebutuhan kebijakan ke depan.

## Library Konversi Hijriah
Rekomendasi:
- `moment-hijri` untuk konversi Hijriah.
- `moment-timezone` untuk konsistensi timezone `Asia/Jakarta`.

Abstraksi wajib:
- File baru: `src/lib/calendar/hijri.ts`
- API minimal:
  - `toHijri(date: Date, opts?: { timezone?: string; variant?: string })`
  - `hijriPeriodFromDate(date: Date, opts?: { timezone?: string; variant?: string })`
  - `formatHijriDate(date: Date, locale?: string, opts?: { timezone?: string; variant?: string })`
  - `parseHijriPeriod(input: string)` (mis. `1447-10`)

## Draft Perubahan Prisma (Opsi B)

Tambahan field pada `Invoice`:

```prisma
model Invoice {
  // existing fields...
  periodKey             String        @map("period_key")
  issuedAt              DateTime      @default(now()) @map("issued_at")
  dueAt                 DateTime?     @map("due_at")

  hijriYear             Int?          @map("hijri_year")
  hijriMonth            Int?          @map("hijri_month") // 1..12
  hijriMonthName        String?       @map("hijri_month_name")
  hijriPeriodKey        String?       @map("hijri_period_key") // e.g. "1447-10"
  hijriCalendarVariant  String?       @map("hijri_calendar_variant") // e.g. "umm_al_qura"

  @@index([hijriYear, hijriMonth])
  @@index([hijriPeriodKey])
}
```

SQL outline migration:

```sql
ALTER TABLE invoices
  ADD COLUMN hijri_year INTEGER,
  ADD COLUMN hijri_month INTEGER,
  ADD COLUMN hijri_month_name TEXT,
  ADD COLUMN hijri_period_key TEXT,
  ADD COLUMN hijri_calendar_variant TEXT;

CREATE INDEX invoices_hijri_year_hijri_month_idx ON invoices (hijri_year, hijri_month);
CREATE INDEX invoices_hijri_period_key_idx ON invoices (hijri_period_key);
```

## Alternatif Model Period Table (Opsional Lanjutan)

Jika perlu kalender multi-variant dan kontrol rentang tanggal formal, gunakan tabel `Period`:

```prisma
model Period {
  id                  String   @id @default(cuid())
  kind                String   // "HIJRI"
  year                Int
  month               Int
  label               String
  calendarVariant     String   @map("calendar_variant")
  startDateGregorian  DateTime @map("start_date_gregorian")
  endDateGregorian    DateTime @map("end_date_gregorian")

  @@unique([kind, year, month, calendarVariant])
}
```

Untuk fase sekarang, direct fields di `Invoice` lebih cepat dieksekusi.

## Rencana Migrasi Bertahap

### Step 1: Display-only foundation
- Tambah util `src/lib/calendar/hijri.ts`.
- Tambah formatter baru di `src/utils/format.ts`:
  - `formatDateHijri`
  - `formatDualDate` (opsional: Hijriah + Gregorian kecil).
- Mulai pakai di UI non-filter dulu (label periode, detail invoice, receipt).

### Step 2: Schema + backfill
- Tambah field Hijriah di `Invoice` (nullable dulu).
- Buat script backfill (mis. `scripts/backfill-invoice-hijri.ts`) berbasis Prisma cursor.
- Aturan backfill:
  - Jika `periodKey` format `YYYY-MM`, gunakan tanggal tengah bulan (`YYYY-MM-15`) di `Asia/Jakarta`.
  - Jika tidak valid, fallback ke `dueAt`, lalu `issuedAt`.
  - Simpan `hijriYear`, `hijriMonth`, `hijriMonthName`, `hijriPeriodKey`, `hijriCalendarVariant='umm_al_qura'`.
- Verifikasi hasil backfill (jumlah null, anomali parse).

### Step 3: Query dan rekap
- Update filter backend:
  - `invoice.list`: tambah input `hijriYear`, `hijriMonth`, `hijriPeriodKey`.
  - `invoice.stats`: dukung filter Hijriah.
  - `link.listInvoicesByToken` dan `resolveToken`: return label Hijriah.
- Pertahankan backward compatibility `periodKey` selama fase transisi.

### Step 4: UI filter Hijriah
- Ubah filter periode di:
  - `billing/rekap/page.tsx`
  - `billing/models/page.tsx` (generate invoice period picker)
- Ganti `type="month"` dengan:
  - dropdown bulan Hijriah (Muharram ... Dzul Hijjah)
  - input tahun Hijriah.

### Step 5: Export/print konsisten
- `ReceiptView` tampilkan periode Hijriah sebagai label utama.
- Endpoint `api/receipt/[paymentId]` kirim field Hijriah dari `Invoice`.
- Pastikan semua resi/modal/print/export menggunakan label yang sama.

## Risiko dan Mitigasi

1. Perbedaan awal bulan Hijriah antar varian.
- Mitigasi: tetapkan `umm_al_qura` sebagai varian resmi bendahara; simpan varian di data.

2. Timezone mempengaruhi hasil konversi.
- Mitigasi: paksa konversi dengan `Asia/Jakarta` di semua util/script.

3. Data lama tidak seragam (`periodKey` bebas string).
- Mitigasi: fallback `dueAt/issuedAt` + laporan anomali backfill.

4. Dual flow legacy (`Bill`) vs normalized (`Invoice`).
- Mitigasi: fase ini fokus invoice/payment sebagai basis rekap; legacy page ditandai untuk harmonisasi bertahap.

5. Performa query setelah penambahan filter Hijriah.
- Mitigasi: indeks `hijriYear,hijriMonth` dan `hijriPeriodKey`.

## Checklist Implementasi tRPC
- `invoice.generateFromModel`: hitung dan simpan field Hijriah saat create invoice.
- `invoice.list`: tambah filter Hijriah dan return field Hijriah.
- `invoice.stats`: tambah filter Hijriah.
- `payment.listRecent`: expose field Hijriah invoice untuk table rekap.
- `billing.verifyPaymentProof`: simpan snapshot receipt dengan periode Hijriah.
- `payment.generateReceipt`: snapshot mencakup periode Hijriah.
- `link.resolveToken` dan `listInvoicesByToken`: gunakan label Hijriah.

## Checklist Implementasi UI
- `billing/models/page.tsx`: picker periode Hijriah untuk generate.
- `billing/rekap/page.tsx`: filter dan kolom periode pakai Hijriah.
- `billing/rekap/proofs/[proofId]/page.tsx`: tampilkan periode Hijriah.
- `billing/rekap/payments/[paymentId]/proof/page.tsx`: tampilkan periode Hijriah.
- `link/[token]/_components/GuardianPortalClient.tsx`: periode invoice + receipt Hijriah.
- `santri/[id]/_components/SantriDetailClient.tsx`: periode invoice Hijriah.
- `components/receipt/ReceiptView.tsx`: label periode Hijriah konsisten.

## Checklist Export dan Print
- `api/receipt/[paymentId]/route.ts` menambahkan field:
  - `invoice.hijriYear`
  - `invoice.hijriMonth`
  - `invoice.hijriMonthName`
  - `invoice.hijriPeriodKey`
  - `invoice.hijriCalendarVariant`
- `ReceiptView` gunakan satu sumber `periodLabel` dari helper Hijriah.
- Uji print preview dan unduh PNG/JPG agar label periode sama dengan tabel rekap.

## Keputusan Implementasi yang Disarankan
- Jalankan Opsi B sekarang.
- Jadikan `Invoice` sebagai basis resmi rekap keuangan.
- Gunakan `umm_al_qura` + timezone `Asia/Jakarta` sebagai aturan konversi tunggal.
- Simpan hasil konversi di DB agar rekap/filter deterministik dan cepat.
