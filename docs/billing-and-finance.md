# Billing and Finance

## Tujuan
Mendokumentasikan domain keuangan: billing model, invoice, pembayaran, bukti pembayaran, receipt/resi, serta periode invoice Gregorian/Hijri.

## Cakupan
- Struktur data keuangan.
- Alur bisnis invoice sampai receipt.
- Periode display mode.
- Filter rekap.
- Validasi dan status.

## Referensi File dan Folder
- `prisma/schema.prisma`
- `prisma/migrations/20260224183000_invoice_period_display_mode/migration.sql`
- `scripts/backfill-invoice-period-fields.ts`
- `src/lib/billing/period.ts`
- `src/server/routers/billing-model.ts`
- `src/server/routers/invoice.ts`
- `src/server/routers/payment.ts`
- `src/server/routers/billing.ts`
- `src/server/routers/link.ts`
- `src/components/receipt/ReceiptView.tsx`
- `src/components/receipt/exportReceiptImage.ts`
- `src/app/(desktop)/billing/rekap/page.tsx`
- `src/app/api/receipt/[paymentId]/route.ts`

## Model Data Keuangan

Model utama (normalized flow):
- `BillingModel`
- `BillingModelItem`
- `BillingModelScope`
- `Invoice`
- `InvoiceItem`
- `Payment`
- `PaymentProof` (invoice-based staging proof)
- `Receipt`

Model legacy (masih ada untuk kompatibilitas):
- `Bill`
- `PaymentProof` dengan `billId`

## Status dan Aturan Dasar
- Status invoice:
  - `PENDING`
  - `PARTIAL`
  - `PAID`
  - `VOID`
- Payment terhitung sebagai terbayar hanya jika `verifiedAt` tidak null.
- Metode `CASH` dari admin dapat auto-verify.
- Payment proof dari wali masuk status `PENDING` dan memerlukan verifikasi admin/bendahara.

## Alur Bisnis Utama

## 1) Generate Invoice
`invoice.generateFromModel`:
- Memilih `BillingModel`.
- Menentukan `periodKey` dan metadata periode display.
- Menentukan target santri berdasarkan scope model.
- Membuat invoice + invoice items.
- Mendukung dry-run untuk estimasi create/skip.

## 2) Guardian Upload Proof
`link.uploadPaymentProof`:
- Token portal di-resolve ke `santriId`.
- Validasi `invoiceId` wajib milik santri terkait.
- Menyimpan `PaymentProof` status `PENDING`.

## 3) Admin Verify Proof
`billing.verifyPaymentProof`:
- `APPROVE`:
  - Buat `Payment` terverifikasi.
  - Hitung ulang status invoice.
  - Ubah proof jadi `APPROVED`.
  - Buat `Receipt` jika belum ada.
- `REJECT`:
  - Ubah proof jadi `REJECTED`.

## 4) Receipt/Resi
Sumber data receipt:
- Invoice terverifikasi + payment terverifikasi.
- Bukan dari proof pending.

`payment.generateReceipt`:
- Membuat nomor receipt unik (`RCPT-YYYYMM-XXXX`).
- Menyimpan snapshot data transaksi.

## Periode Invoice Display Mode (Gregorian/Hijri)

Field di `Invoice`:
- `periodDisplayMode` (`GREGORIAN` | `HIJRI`)
- `periodYear`
- `periodMonth`
- `hijriYear`
- `hijriMonth`
- `hijriVariant`

Formatter terpusat:
- `formatBillingPeriod(invoice)` di `src/lib/billing/period.ts`.

Aturan output:
- Mode `GREGORIAN`: contoh `Februari 2026`.
- Mode `HIJRI` + field lengkap: contoh `Syawal 1446 H`.

Aturan filter rekap:
- Gregorian: filter `periodYear` + `periodMonth`.
- Hijri: filter `hijriYear` + `hijriMonth`.

## Migration and Backfill
Migration:
- Menambah kolom metadata periode display.
- Menambah index kombinasi display mode dan period fields.
- Backfill dasar `periodYear`/`periodMonth` dari `periodKey` atau `issuedAt`.

Script backfill lanjutan:
- `scripts/backfill-invoice-period-fields.ts`

Perintah:
```bash
npm run db:migrate
npx tsx scripts/backfill-invoice-period-fields.ts
```

## Export, Print, dan Resi
`ReceiptView` mendukung:
- print CSS untuk output rapi.
- export PNG/JPG via util `exportReceiptImage`.
- fallback render untuk kasus CSS CORS pada proses export image.

