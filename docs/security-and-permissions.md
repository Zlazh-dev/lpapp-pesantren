# Security and Permissions

## Prinsip Utama
- Enforcement scope dan permission dilakukan di backend (tRPC), bukan frontend.
- Prisma adalah satu-satunya sumber kebenaran data.
- Multi-role dipertahankan (`UserRole`), tidak disederhanakan menjadi single-role.

## Login Gate (NextAuth Credentials)
File: `src/lib/auth.ts`

Aturan `authorize()`:
- User tidak ditemukan / password salah: ditolak.
- `isEnabled=false`: login ditolak dengan pesan jelas `Akun belum diaktifkan admin`.
- Akun admin existing tetap aman karena seed men-set admin `isEnabled=true`.

## Invite dan Aktivasi User
Model terkait:
- `User`: `isEnabled`, `enabledAt`, `enabledByUserId`
- `UserInviteLink`: `tokenHash`, `expiry`, `isRevoked`, `useLimit`, `usedCount`
- `RoleRequest`: `requestedRoleCodes[]`, `status`, `reviewerUserId`, `reviewedAt`, `note`

Implementasi:
- Token invite disimpan hash SHA-256 (`tokenHash`).
- User hasil register invite dibuat `isEnabled=false`.
- Role request diverifikasi admin via backend.
- Approve role request akan:
  - assign multi-role ke `UserRole`
  - set `isEnabled=true`
  - isi `enabledAt` dan `enabledByUserId`

## Guard Role + Page Group
- Guard global ada di `src/server/trpc.ts`:
  - `protectedProcedure`
  - `roleProtectedProcedure`
  - `groupProtectedProcedure`
- Router admin user-management (`invite`, `role-request`, `permissions`, `user`) memakai guard:
  - page-group `USER_MANAGEMENT`
  - role `ADMIN`

## Scope Enforcement
File: `src/server/rbac/santriScope.ts`

- Role privileged: `ADMIN`, `STAF_PENDATAAN`
- Role scoped:
  - `WALI_KELAS` via `CLASS_GROUP`
  - `PEMBIMBING_KAMAR` via `DORM_ROOM` / `DORM_BUILDING` / `DORM_COMPLEX`
- Jika tidak punya scope valid, query santri dikunci no-access filter.

## Viewer Bukti Pembayaran
- Viewer bukti pembayaran tetap aktif.
- Akses file proof tetap dibatasi role backend (`ADMIN`/`BENDAHARA`) pada route API proof.

## Catatan QR
- Tidak ada endpoint atau alur QR baru untuk user onboarding.
- QR operasional yang lama tetap dipertahankan.
