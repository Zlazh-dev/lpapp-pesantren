# QR and Receipt

## Tujuan
Mendokumentasikan seluruh modul QR dan receipt/resi yang ada di sistem, termasuk payload, alur scan, validasi backend, dan batasan perubahan.

## Cakupan
- QR generator desktop.
- QR scan mobile.
- QR pada resi.
- Viewer bukti pembayaran.
- Batasan agar QR resi/scan/lihat bukti tidak berubah behavior.

## Referensi File dan Folder
- `src/app/(mobile)/m-scan/page.tsx`
- `src/app/(desktop)/santri/[id]/_components/SantriDetailClient.tsx`
- `src/components/receipt/ReceiptView.tsx`
- `src/app/(desktop)/billing/rekap/proofs/[proofId]/page.tsx`
- `src/app/(desktop)/billing/rekap/payments/[paymentId]/proof/page.tsx`
- `src/app/api/receipt/[paymentId]/route.ts`
- `src/lib/payment-proof.ts`

## Inventaris Jenis QR

## 1) QR Operasional Desktop
Status:
- Route `/scan` dinonaktifkan sementara.
- Alur onboarding user baru saat ini memakai invite link (bukan QR).

## 2) QR pada Detail Santri
Path:
- `/santri/[id]`

Kegunaan:
- Menampilkan QR santri untuk proses scan absensi/identifikasi operasional.

Payload:
```json
{ "id": "<santriId>", "nis": "<nis>", "name": "<fullName>" }
```

## 3) QR Scanner Mobile
Path:
- `/m-scan`

Kegunaan:
- Scan QR payload JSON.
- Ambil `parsedData.id`.
- Ambil data santri (`trpc.santri.getById`).
- Simpan assignment kamar/kelas (`trpc.santri.update`).

Validasi backend:
- `santri.getById` memakai scope filter.
- `santri.update` dibatasi role (`STAF_PENDATAAN`/`ADMIN`).
- Dengan demikian payload QR saja tidak cukup untuk bypass permission.

## 4) QR pada Receipt/Resi
Komponen:
- `src/components/receipt/ReceiptView.tsx`

Payload QR resi:
- Prioritas `verificationUrl` (contoh endpoint receipt).
- Fallback `receipt:<invoiceCode>`.

Kegunaan:
- Memudahkan verifikasi referensi resi.

## Modul Non-QR Terkait Bukti Bayar
Viewer bukti pembayaran:
- `/billing/rekap/proofs/[proofId]`
- `/billing/rekap/payments/[paymentId]/proof`

Catatan:
- Modul ini menampilkan image/pdf bukti.
- Bukan modul QR, tetapi terkait alur scan/validasi dokumen pembayaran.

## Batasan Perubahan yang Dijaga
- QR scanner dan QR receipt didokumentasikan apa adanya.
- Behavior QR pada resi, scan, dan lihat bukti tidak diubah dalam pekerjaan dokumentasi ini.
- Dokumen ini hanya mendeskripsikan implementasi yang ada saat ini.

## Receipt and Export
`ReceiptView` menyediakan:
- Print (`window.print` + print CSS).
- Unduh PNG/JPG.
- Render QR verifikasi.

Data receipt API:
- `/api/receipt/[paymentId]`
- Mengembalikan data pembayaran terverifikasi beserta metadata invoice periode.
