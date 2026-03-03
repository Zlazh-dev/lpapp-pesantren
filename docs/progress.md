# Progress Terbaru

Tanggal update: 2026-02-25

## Revisi Wajib Permission Model (Page-Level)
- Otorisasi utama dipindahkan ke relasi **role -> page (route)** melalui tabel pivot baru `role_pages`.
- `role_page_group_access` dipertahankan sebagai legacy data, tetapi **tidak lagi dipakai untuk access check**.
- Sidebar tetap memakai group sebagai kategori UI, namun visibility item ditentukan dari `allowedPagePaths` (page-level).
- Halaman **Page Permissions** diubah menjadi accordion kategori dengan checkbox per halaman (tanpa checkbox group sebagai entitas izin).

### Perubahan Backend
- Prisma:
  - Model baru: `RolePage` (`@@map("role_pages")`) sebagai relasi many-to-many role↔page.
  - Migration baru: `prisma/migrations/20260226033000_page_level_role_pages/migration.sql`.
- Migrasi data legacy:
  - Salin explicit legacy `role_page_access` ke `role_pages`.
  - Expand legacy `role_page_group_access` ke seluruh pages dalam group jika role tersebut tidak punya explicit page pick di group itu.
- Snapshot permission (`computePermissionSnapshot`):
  - Non-admin: baca langsung dari `role_pages`.
  - Admin: auto mendapat semua page aktif.
- Guard tRPC:
  - Tambah `pageProtectedProcedure`, `hasPageAccess`, `hasAnyPageAccess`, `requirePageAccess`.
  - Router yang sebelumnya `groupProtectedProcedure` dipindahkan ke page-level path guard.

### Perubahan UI
- `Page Permissions`:
  - Accordion per kategori: Beranda, Master Data, Keuangan, Akademik, User Management, Pengaturan.
  - Checkbox per halaman.
  - Opsi "Pilih semua kategori ini" bersifat convenience UI (bukan entitas permission).
  - Role `ADMIN` ditandai auto-access semua halaman, tanpa perlu simpan checklist.
- Payload simpan akses role:
  - Dari `groupIds + pageIdsByGroup` menjadi `pageIds[]` langsung.

### Group UI vs Permission Halaman
- Group (`page_groups`) sekarang diposisikan sebagai:
  - kategori navigasi sidebar
  - kategori accordion di halaman Page Permissions
- Permission efektif user:
  - ditentukan oleh daftar path halaman pada `allowedPagePaths`
  - bukan oleh akses group.

## Ringkasan Implementasi ZlazhUp - Beta Version
- Revisi skema Prisma untuk kontrak onboarding user:
  - `UserInviteLink.expiry`
  - `UserInviteLink.isRevoked`
  - `UserInviteLink.useLimit`
  - `RoleRequest.reviewerUserId`
- Tambah migration:
  - `prisma/migrations/20260225043000_zlazhup_invite_role_schema_update/migration.sql`
- Refactor tRPC API final:
  - `invite.createInviteLink`, `invite.revokeInviteLink`, `invite.listInviteLinks`, `invite.validateInviteToken`
  - `auth.registerFromInvite`
  - `roleRequest.submitRoleRequest`, `roleRequest.listRoleRequests`, `roleRequest.reviewRoleRequest`
- Login gate NextAuth ditegakkan:
  - user `isEnabled=false` ditolak login dengan pesan `Akun belum diaktifkan admin`
- Refactor page-group + permission catalog ke struktur final sidebar:
  - `DASHBOARD`, `MASTER_DATA`, `KEUANGAN`, `AKADEMIK`, `USER_MANAGEMENT`, `SETTINGS`
- Sidebar desktop dipindah ke model data terpusat:
  - `src/lib/sidebar-navigation.ts`
- Tambah route App Router baru sesuai struktur final:
  - `/master-data/*`, `/keuangan`, `/akademik/kelas/*`, `/user-management/*`, `/settings`
- Route lama utama dipertahankan sebagai redirect kompatibilitas.
- Halaman `/scan` tidak dipakai pada desktop final.
- Admin default access diberikan ke seluruh page-group sesuai revisi ZlazhUp - Beta Version.
- Bugfix sidebar: matching path sekarang mendukung exact/prefix dan canonicalisasi path legacy ke routing baru.
- Pemisahan route santri final:
  - `/master-data/santri/manage` memakai `santri.listCentralized` (ADMIN-only, tanpa scope filtering).
  - `/master-data/santri` memakai `santri.listScoped` (scope-based di backend, union scope kamar/kelas).
- Login redirect rule final:
  - ADMIN diarahkan ke `/dashboard`.
  - Non-admin diarahkan ke first accessible route berdasarkan prioritas: `/dashboard`, `/master-data/santri`, `/keuangan`, `/akademik/kelas`, `/settings`.
  - Saat membuka route tanpa akses, aplikasi redirect ke first accessible route yang sama.

## File Kunci yang Diubah
- `prisma/schema.prisma`
- `prisma/migrations/20260225043000_zlazhup_invite_role_schema_update/migration.sql`
- `src/lib/auth.ts`
- `src/lib/page-groups.ts`
- `src/lib/sidebar-navigation.ts`
- `src/server/routers/invite.ts`
- `src/server/routers/auth.ts`
- `src/server/routers/role-request.ts`
- `src/server/routers/user.ts`
- `src/server/routers/permissions.ts`
- `src/server/routers/santri.ts`
- `src/server/routers/billing.ts`
- `src/server/routers/billing-model.ts`
- `src/server/routers/invoice.ts`
- `src/server/routers/payment.ts`
- `src/server/routers/payment-proof.ts`
- `src/server/routers/dorm.ts`
- `src/app/(desktop)/layout.tsx`
- `src/app/(desktop)/dashboard/page.tsx`
- `src/app/(desktop)/keuangan/page.tsx`
- `src/app/(desktop)/master-data/**`
- `src/app/(desktop)/akademik/kelas/**`
- `src/app/(desktop)/user-management/**`
- `src/app/(desktop)/settings/page.tsx`

## Validasi
- `npx prisma validate`: berhasil
- `npm run build`: berhasil

## Catatan
- `npm run db:generate` sempat terkendala lock file engine, kemudian berhasil generate client dengan `npx prisma generate --no-engine` untuk validasi tipe.
- Warning Next.js terkait deprecasi `middleware` ke `proxy` masih ada dan tidak terkait revisi ini.

## Manual Checklist Sidebar Admin
- Login sebagai admin dengan `isEnabled=true`.
- Buka `/dashboard` lalu cek console log `[SIDEBAR_DEBUG][client]` (ada `allowedPagePaths`, `menuItems`, `filterDecisions`).
- Pastikan top-level sidebar tampil lengkap: Beranda, Master Data, Keuangan, Akademik, User Management, Pengaturan.
- Uji route `/master-data/santri`, `/keuangan`, `/akademik/kelas`, `/user-management/users`, `/settings` untuk pastikan tidak redirect salah.

## Manual Checklist Routing Scope Santri
- Admin: buka `/master-data/santri/manage`, pastikan semua santri tampil (tanpa pembatasan scope).
- User non-admin dengan scope kamar/kelas: buka `/master-data/santri`, pastikan hanya santri dalam scope assignment yang tampil.
- User non-admin tanpa scope relevan: buka `/master-data/santri`, pastikan empty state jelas muncul dan tidak menampilkan data santri.
- Login non-admin: setelah login sukses, pastikan diarahkan ke first accessible route (bukan dipaksa ke `/dashboard` jika tidak punya akses).

## Refactor Modul Keuangan (2026-02-26)

### Ringkasan
Konsolidasi seluruh route `/billing/*` ke `/keuangan` dengan sistem tab berbasis query parameter.

### Route Mapping
| Route Lama | Redirect Tujuan |
|---|---|
| `/billing` | `/keuangan` |
| `/billing/models` | `/keuangan?tab=pengaturan-tagihan` |
| `/billing/rekap` | `/keuangan?tab=rekap` |

### Tab Parameter
- `tab=pengaturan-tagihan` - CRUD model tagihan + generate invoice
- `tab=pembayaran` - Validasi bukti pembayaran transfer (approve/reject)
- `tab=invoice` - Daftar invoice dengan filter periode & status
- `tab=resi` - Daftar pembayaran terverifikasi + resi
- `tab=rekap` - Ringkasan keuangan per periode
  - `sub=rekap-invoice` - Statistik invoice (lunas/pending/partial)
  - `sub=rekap-pembayaran` - Statistik pembayaran (terverifikasi/pending)

### Period Filter (Tab Rekap)
- Mode kalender: `GREGORIAN` atau `HIJRI`
- Gregorian: filter `periodYear` + `periodMonth`
- Hijriah: filter `hijriYear` + `hijriMonth`
- Menggunakan `formatBillingPeriod()` untuk display (tidak ada hardcode MM/YYYY)

### File yang Dibuat
- `src/app/(desktop)/keuangan/_components/PengaturanTagihanTab.tsx`
- `src/app/(desktop)/keuangan/_components/PembayaranTab.tsx`
- `src/app/(desktop)/keuangan/_components/InvoiceTab.tsx`
- `src/app/(desktop)/keuangan/_components/ResiTab.tsx`
- `src/app/(desktop)/keuangan/_components/RekapTab.tsx`

### File yang Dimodifikasi
- `src/app/(desktop)/keuangan/page.tsx` - Ditulis ulang sebagai tab container query-param
- `src/app/(desktop)/billing/models/page.tsx` - Redirect ke `/keuangan?tab=pengaturan-tagihan`
- `src/app/(desktop)/billing/rekap/page.tsx` - Redirect ke `/keuangan?tab=rekap`
- `src/server/routers/invoice.ts` - Tambah endpoint `rekapPembayaran`

### Validasi
- `npm run build`: berhasil

### Manual Checklist Keuangan
1. Buka `/billing/models` - harus redirect ke `/keuangan?tab=pengaturan-tagihan`
2. Buka `/billing/rekap` - harus redirect ke `/keuangan?tab=rekap`
3. Buka `/keuangan` - harus tampil tab bar dengan 5 tab
4. Klik setiap tab - konten harus loaded dengan state loading/empty
5. Tab Rekap - test sub-tab Invoice vs Pembayaran dan filter Gregorian/Hijri
6. Tab Invoice - test filter periode dan search santri
7. Tab Pembayaran - verifikasi list bukti pembayaran tampil
8. Tab Pengaturan Tagihan - test CRUD model dan generate invoice
9. Tab Resi - verifikasi list pembayaran dan modal resi

## Manual Checklist Revisi Permission Page-Level
1. Role pembimbing kamar hanya diberi page `/master-data/santri`:
- Sidebar hanya menampilkan group `Master Data` dengan submenu `Data Santri`.
- Submenu/route lain (`/master-data/santri/manage`, `/master-data/kamar/manage`, dst) tidak tampil dan tidak bisa diakses.

2. Role `ADMIN`:
- Seluruh sidebar tampil.
- Seluruh route page catalog dapat diakses tanpa perlu checklist manual di Page Permissions.

3. Role bendahara hanya diberi page `/keuangan`:
- Sidebar hanya menampilkan group `Keuangan`.
- Route non-keuangan tidak tampil dan tidak bisa diakses.

