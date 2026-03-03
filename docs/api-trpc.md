# API tRPC

## Endpoint
- `/api/trpc/[trpc]`

## Root Router
File: `src/server/routers/_app.ts`

Router utama:
- `invite`
- `auth`
- `roleRequest`
- `user`
- `permissions`
- `santri`, `kamar`, `kelas`, `dorm`, `academic`
- `billingModel`, `invoice`, `billing`, `payment`, `paymentProof`
- `attendance`, `link`

## Procedure Final ZlazhUp Beta

### Admin (User Management)
Router: `src/server/routers/invite.ts`
- `invite.createInviteLink({ expiry, useLimit })`
- `invite.revokeInviteLink({ id })`
- `invite.listInviteLinks()`

Router: `src/server/routers/role-request.ts`
- `roleRequest.listRoleRequests({ status?, page?, limit?, search? })`
- `roleRequest.reviewRoleRequest({ id, action: 'APPROVE' | 'REJECT', note? })`

Perilaku approve:
- assign multi-role ke tabel `UserRole`
- set `user.isEnabled=true`
- set `enabledAt` dan `enabledByUserId`

### Public / Unauthed
Router: `src/server/routers/invite.ts`
- `invite.validateInviteToken({ token })`

Router: `src/server/routers/auth.ts`
- `auth.registerFromInvite({ token, userData })`

### Pending User Submit Role
Router: `src/server/routers/role-request.ts`
- `roleRequest.submitRoleRequest({ requestedRoleCodes, note? })`
- `roleRequest.submitRoleRequestByToken({ requestToken, requestedRoleCodes, note? })` (dipakai flow register berbasis token)

## Guard dan Security
- Guard auth/permission ada di backend (tRPC middleware), bukan frontend.
- Procedure admin user-management menerapkan:
  - `groupProtectedProcedure('USER_MANAGEMENT')`
  - validasi role `ADMIN`

## Billing Period Contract
- Timestamp transaksi tetap Gregorian.
- UI label periode invoice wajib memakai formatter terpusat:
  - `formatBillingPeriod(invoice)` dari `src/lib/billing/period.ts`
- Tidak hardcode format `MM/YYYY`.

## Backward Compatibility
Alias lama masih tersedia agar UI legacy tetap berjalan sementara:
- `invite.generate`, `invite.validateToken`
- `roleRequest.createPublic`, `roleRequest.listPending`, `roleRequest.review`
