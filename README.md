# Pesantren Management System

Sistem Informasi Manajemen Pondok Pesantren - CRUD Santri, Billing Syariah, QR Registration, Link Sharing.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: tRPC, Prisma ORM
- **Database**: PostgreSQL 16 (Docker)
- **Auth**: NextAuth.js (Credentials + RBAC)
- **Charts**: Recharts
- **QR**: qrcode.react + jsQR scanner

## Quick Start

```bash
# 1. Clone & install
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Run database migration
npx prisma migrate dev --name init

# 4. Seed database (10 santri + bills + users)
npm run db:seed

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Credentials

| Username    | Password      | Role           |
|-------------|---------------|----------------|
| bendahara   | password123   | Bendahara      |
| staf        | password123   | Staf Pendataan |
| sekretaris  | password123   | Sekretaris     |
| guru        | password123   | Guru Mapel     |
| walikelas   | password123   | Wali Kelas     |
| pembimbing  | password123   | Pembimbing     |

## Features

- **CRUD Santri**: Full data management with search, pagination, and unified academic/dorm assignment
- **Billing Modern**: Normalized invoices with itemized breakdown & target scopes
- **Dormitory Hierarchy**: Dynamic hierarchical room management (Complex → Building → Floor → Room) with inline CRUD
- **Academic Management**: Unified ClassGroup system with detail drawer for santri monitoring
- **QR Code**: Generate & scan QR for santri identitas/absensi
- **Link Sharing**: Secure portal for wali santri to view reports & upload proof
- **Mobile/Desktop**: Separate layouts based on User-Agent
- **Multi-Role RBAC**: Database-driven roles with support for multiple roles per user

## Documentation

- `docs/progress.md`: Progress implementasi terbaru, termasuk perubahan periode invoice display mode dan catatan kualitas.
- `docs/decisions.md`: Keputusan arsitektur terkait periode invoice Gregorian vs Hijri.
- `system_documentation.md`: Dokumentasi audit dan rencana sistem yang lebih rinci.

## Scripts

```bash
npm run dev         # Start development server
npm run build       # Production build
npm run db:migrate  # Run Prisma migrations
npm run db:seed     # Seed database
npm run db:studio   # Open Prisma Studio
npm run db:reset    # Reset database
```
