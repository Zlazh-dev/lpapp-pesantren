# System Overview

## Ringkasan
Pesantren Management System (ZlazhUp - Beta Version) adalah aplikasi berbasis Next.js App Router dengan Prisma PostgreSQL sebagai single source of truth, tRPC untuk API internal, dan NextAuth Credentials untuk autentikasi.

## Arsitektur Inti
- Frontend:
  - `src/app/(desktop)` untuk backoffice desktop
  - `src/app/(mobile)` untuk operasional mobile
  - `src/app/link/[token]` dan `src/app/register/[token]` untuk portal publik/onboarding
- Backend:
  - tRPC router di `src/server/routers`
  - Guard auth/role/page-group di `src/server/trpc.ts`
  - Scope enforcement data santri di `src/server/rbac/santriScope.ts`
- Data:
  - Prisma schema: `prisma/schema.prisma`
  - Migration terbaru invite/role request: `prisma/migrations/20260225043000_zlazhup_invite_role_schema_update/migration.sql`

## Sidebar Desktop Final
Urutan top-level tetap:
1. Beranda (`/dashboard`)
2. Master Data
3. Keuangan
4. Akademik
5. User Management
6. Pengaturan (`/settings`)

Model sidebar terpusat:
- `src/lib/sidebar-navigation.ts`

Katalog page-group/page terpusat:
- `src/lib/page-groups.ts`

## Struktur Route Desktop Final
- Beranda
  - `/dashboard`
- Master Data
  - `/master-data/santri/manage`
  - `/master-data/kamar/manage`
  - `/master-data/santri`
  - `/master-data/santri/[id]`
- Keuangan
  - `/keuangan` (tab: Billing, Pembayaran, Invoice, Resi)
- Akademik
  - `/akademik/kelas/manage`
  - `/akademik/kelas`
- User Management
  - `/user-management/users`
  - `/user-management/roles`
  - `/user-management/page-access`
  - `/user-management/reset-password`
  - `/user-management/invite-links`
- Pengaturan
  - `/settings`

Route lama tetap ada sebagai redirect kompatibilitas.

## Flow Tambah User Final
1. Admin generate invite link.
2. User register dari invite link.
3. User submit role request.
4. Admin review role request.
5. Saat approved: role di-assign (multi-role), akun di-enable, user baru bisa login.

## QR System
- QR santri operasional: tetap.
- QR receipt/resi: tetap.
- Viewer bukti pembayaran: tetap.
- Halaman `/scan`: tidak digunakan pada desktop final.
- Tidak ada penambahan QR user baru.
