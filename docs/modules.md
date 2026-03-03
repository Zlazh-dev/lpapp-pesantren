# Modules

## Tujuan
Memetakan modul fitur aplikasi, entry point route, komponen utama, router backend, dan model data terkait.

## Cakupan
- Peta modul berdasarkan route.
- Fungsi utama per modul.
- Entry point file untuk pemeliharaan.

## Referensi File dan Folder
- `src/app`
- `src/components`
- `src/server/routers`
- `prisma/schema.prisma`

## Ringkasan Peta Modul

| Modul | Route Utama | Entry UI | Router tRPC | Model Utama |
| --- | --- | --- | --- | --- |
| Dashboard | `/dashboard`, `/m-dashboard` | `src/app/(desktop)/dashboard/page.tsx`, `src/app/(mobile)/m-dashboard/page.tsx` | `billing`, `santri` | `Santri`, `Bill`, `Invoice`, `Payment` |
| Santri | `/santri`, `/santri/[id]`, `/m-santri` | `src/app/(desktop)/santri/*`, `src/app/(mobile)/m-santri/*` | `santri`, `billing`, `dorm`, `link` | `Santri`, `ClassGroup`, `DormRoom`, `SharedLink` |
| Akademik and Rombel | `/akademik`, `/kelas`, `/kelas/[classGroupId]` | `src/app/(desktop)/akademik/page.tsx`, `src/app/(desktop)/kelas/*` | `academic` | `AcademicLevel`, `Grade`, `SchoolYear`, `ClassGroup` |
| Asrama and Kamar | `/kamar`, `/kamar/[roomId]` | `src/app/(desktop)/kamar/*` | `dorm`, `kamar` (legacy) | `DormComplex`, `DormBuilding`, `DormFloor`, `DormRoom`, `DormAssignment`, `Kamar` |
| Billing and Invoice | `/billing`, `/billing/models`, `/billing/rekap`, `/m-billing` | `src/app/(desktop)/billing/*`, `src/app/(mobile)/m-billing/page.tsx` | `billingModel`, `invoice`, `billing`, `payment` | `BillingModel`, `Invoice`, `InvoiceItem`, `Payment`, `Receipt`, `PaymentProof` |
| Bukti Pembayaran | `/billing/rekap/proofs/[proofId]`, `/billing/rekap/payments/[paymentId]/proof` | proof pages + `PaymentProofViewer` | `billing`, `payment`, file API routes | `PaymentProof`, `Payment` |
| Portal Wali Santri | `/link/[token]` | `src/app/link/[token]/_components/GuardianPortalClient.tsx` | `link`, `payment`, `paymentProof` (legacy) | `SharedLink`, `Santri`, `Invoice`, `PaymentProof` |
| QR Operasional | `/m-scan` (desktop `/scan` non-aktif sementara) | `src/app/(mobile)/m-scan/page.tsx` | `santri`, `kamar`, `kelas` | `Santri`, `Kamar`, `Kelas` |
| User and Permission | `/admin/users`, `/admin/permissions` | admin pages and modals | `user`, `permissions` | `User`, `RoleEntry`, `UserRole`, `RoleScope`, `PageGroup`, `Page` |

## Detail Modul

## 1) Santri
- Fungsi:
  - Listing dan pencarian.
  - Detail profil, assignment kelas/kamar.
  - Soft delete (`isActive`).
  - Bulk assign rombel dan dorm room.
- Scope:
  - Query list dan detail memakai `buildSantriScopeWhere`.
  - Wali Kelas dan Pembimbing Kamar hanya melihat data scoped.

## 2) Rombel and Kelas
- Fungsi:
  - Kelola jenjang, tingkat, rombel, tahun ajaran.
  - Bulk create rombel per suffix.
- Catatan:
  - Tersedia struktur akademik baru (`ClassGroup`) dan struktur legacy (`Kelas`).

## 3) Kamar and Asrama
- Fungsi:
  - Kelola hierarki kompleks -> gedung -> lantai -> kamar.
  - Assignment aktif santri ke kamar (`DormAssignment`).
- Catatan:
  - Struktur dorm baru berjalan berdampingan dengan tabel legacy `Kamar`.

## 4) Admin Users
- Fungsi:
  - CRUD user.
  - Multi-role assignment.
  - Role scope assignment untuk akses scoped.
- UI utama:
  - `UsersPageClient`, `UserRoleEditorModal`, `RoleScopeEditorModal`.

## 5) Permission Matrix
- Fungsi:
  - Kelola page group dan page catalog.
  - Atur akses role ke group dan halaman spesifik.
- Pola:
  - Empty explicit page list di suatu group berarti all pages in group.

## 6) Billing and Invoice
- Fungsi:
  - Kelola billing model (item dan scope target).
  - Generate invoice massal dari model.
  - Rekap invoice, pembayaran, dan bukti.
- Periode invoice:
  - Mendukung display mode Gregorian/Hijri via formatter terpusat.

## 7) Payments and Proofs
- Fungsi:
  - Catat pembayaran.
  - Verifikasi pembayaran dan bukti.
  - Viewer bukti dengan fallback loading/error/not-found.
- Keamanan:
  - Viewer file bukti dibatasi untuk role `ADMIN` atau `BENDAHARA`.

## 8) Portal Wali Santri
- Fungsi:
  - Menampilkan profil santri, ringkasan keuangan, item invoice, timeline.
  - Upload bukti pembayaran (satu-satunya aksi tulis dari portal).
  - Lihat resi setelah pembayaran terverifikasi.
- Batasan:
  - Tidak ada edit data santri oleh wali.

## 9) Receipt and Export
- Fungsi:
  - Render receipt komponen tunggal.
  - Print layout.
  - Export PNG/JPG.
- Implementasi:
  - `ReceiptView` + `exportReceiptImage`.

## 10) QR
- Fungsi:
  - Scan QR di mobile untuk assignment kamar/kelas.
  - QR pada resi untuk verifikasi URL.
