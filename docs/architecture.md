# Architecture

## Tujuan
Menjelaskan arsitektur teknis aplikasi: pola App Router, alur data client-server, struktur tRPC, dan relasi Prisma pada level desain sistem.

## Cakupan
- Arsitektur runtime Next.js.
- Pola server wrapper dan client component.
- tRPC context, auth, dan prosedur.
- Lapisan data dengan Prisma.
- Diagram alur request.

## Referensi File dan Folder
- `src/app/layout.tsx`
- `src/app/api/trpc/[trpc]/route.ts`
- `src/components/providers/TRPCProvider.tsx`
- `src/components/providers/AuthProvider.tsx`
- `src/utils/trpc.ts`
- `src/server/trpc.ts`
- `src/server/routers/_app.ts`
- `src/lib/prisma.ts`
- `prisma/schema.prisma`
- `scripts`

## Struktur Repository (Ringkas)
```text
src/
  app/                # App Router pages, API routes, desktop/mobile/public route groups
  components/         # Reusable UI components (icons, receipt, payments, providers)
  lib/                # Shared app library (auth, prisma, page-groups, billing period helpers)
  server/             # tRPC, routers, RBAC helpers, server utilities
  utils/              # Client utilities (formatters, trpc client hook)
prisma/
  schema.prisma       # Data model dan relasi
  migrations/         # Migration history
scripts/              # Script operasional (generate, migration helpers, backfill)
docs/                 # Dokumentasi sistem dan keputusan
```

## Arsitektur Aplikasi
Stack utama:
- Frontend: Next.js App Router + React Client Components.
- API internal: tRPC via endpoint `/api/trpc`.
- Auth: NextAuth Credentials.
- ORM: Prisma Client.
- DB: PostgreSQL.

## Pola App Router
Aplikasi memakai route group:
- `(desktop)` untuk UI backoffice desktop.
- `(mobile)` untuk UI mobile operasional.
- `link/[token]` untuk portal publik wali santri.

Pola implementasi halaman yang umum:
1. Server wrapper page menerima `params` dan menyiapkan context dasar.
2. Client component menangani interaksi, state, dan pemanggilan tRPC hook.

Contoh:
- `src/app/link/[token]/page.tsx` mem-passing `token` ke `GuardianPortalClient`.
- `src/app/(desktop)/santri/[id]/page.tsx` mem-passing `id` ke `SantriDetailClient`.

## tRPC Layer
Router root:
- `src/server/routers/_app.ts`

Context:
- `createTRPCContext` mengisi `prisma`, `session`, `headers`.

Guard prosedur:
- `publicProcedure`: tanpa login.
- `protectedProcedure`: wajib login.
- `roleProtectedProcedure(...roles)`: login + cek role.
- `groupProtectedProcedure(groupCode)`: login + cek page-group access.

## Prisma Layer
Prisma client singleton:
- `src/lib/prisma.ts`

Source of truth data:
- seluruh domain utama bersumber dari tabel Prisma pada `prisma/schema.prisma`.

Entity inti per domain:
- Identity and access: `User`, `RoleEntry`, `UserRole`, `RoleScope`, `PageGroup`, `Page`, `RolePageGroupAccess`, `RolePageAccess`.
- Santri and profile: `Santri`.
- Academic and dorm: `AcademicLevel`, `Grade`, `SchoolYear`, `ClassGroup`, `DormComplex`, `DormBuilding`, `DormFloor`, `DormRoom`, `DormAssignment`, plus legacy `Kelas`, `Kamar`.
- Finance: `BillingModel`, `BillingModelItem`, `BillingModelScope`, `Invoice`, `InvoiceItem`, `Payment`, `Receipt`, `PaymentProof`, plus legacy `Bill`.
- Public link: `SharedLink`.

## Relasi Inti (Ringkas)
```text
User --< UserRole >-- RoleEntry
User --< RoleScope
RoleEntry --< RolePageGroupAccess >-- PageGroup --< Page
RoleEntry --< RolePageAccess >-- Page

Santri --< Invoice --< InvoiceItem
Invoice --< Payment --1 Receipt
Invoice --< PaymentProof
Santri --< SharedLink

BillingModel --< BillingModelItem
BillingModel --< BillingModelScope
BillingModel --< Invoice

Santri --< DormAssignment >-- DormRoom -- DormFloor -- DormBuilding -- DormComplex
Santri -- ClassGroup -- Grade -- AcademicLevel
ClassGroup -- SchoolYear
```

## Diagram Alur Utama

```text
Browser (Desktop/Mobile/Portal)
    |
    | React Client Component (trpc.useQuery/useMutation)
    v
/api/trpc/[trpc] (fetchRequestHandler)
    |
    | createTRPCContext(session, prisma)
    v
tRPC Router Procedure
    |
    | auth guard: public/protected/role/group
    | scope filter (jika berlaku)
    v
Prisma Client
    |
    v
PostgreSQL
```

## Alur Upload Bukti (Ringkas)
```text
Client form upload
    -> /api/upload
    -> sharp transform
    -> cloudinary upload (fallback data URL)
    -> simpan URL melalui tRPC mutation
```

## Alur Viewer Bukti (Ringkas)
```text
Viewer page (/billing/rekap/.../proof)
    -> API file proxy route
    -> auth check (ADMIN/BENDAHARA)
    -> fetch upstream file/data URL
    -> stream ke browser
```
