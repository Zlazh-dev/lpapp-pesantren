# ZlazhUp — Arsitektur Interaksi Detail (Beta)

> Dokumen ini memetakan sistem secara **page-by-page**: halaman, komponen, aksi/tombol, state/status, navigasi, dan guard permission.
> Tidak membahas field database atau struktur data internal kecuali nama entitas yang muncul di UI.

---

## 1. Konsep & Konvensi

### 1.1 Definisi Istilah

| Istilah | Arti |
|---|---|
| **Invoice / Tagihan** | Kewajiban bayar per santri per periode, dibuat dari model tagihan |
| **Pembayaran (Payment)** | Transaksi pelunasan invoice, bisa sebagian (cicilan/partial) |
| **Bukti Transfer (Proof)** | Gambar bukti transfer yang di-upload, menunggu validasi admin |
| **Validasi** | Proses approve/reject bukti transfer oleh admin/bendahara |
| **Resi (Receipt)** | Bukti pembayaran terverifikasi yang bisa dicetak |
| **Rekap** | Ringkasan agregasi data keuangan per periode |
| **Model Tagihan (BillingModel)** | Template tagihan yang dipakai untuk generate invoice massal |
| **Scope** | Pembatasan akses berdasarkan kamar atau kelas yang di-assign ke user |

### 1.2 Konvensi Tombol

| Label | Fungsi |
|---|---|
| **Lihat** / **Detail** | Navigasi ke halaman detail (read-only) |
| **Edit** | Masuk mode edit inline atau modal |
| **Hapus** | Konfirmasi lalu hapus data (confirm dialog) |
| **Simpan** | Kirim perubahan ke server |
| **Cetak** | Generate PDF/gambar untuk download/print |
| **Bayar** | Buka form pembayaran / catat cash |
| **Pindah** | Pindahkan santri ke kamar/kelas lain |
| **Keluarkan** | Hapus assignment santri dari kamar/kelas |
| **Upload** | Pilih file gambar untuk bukti transfer |
| **Approve / Reject** | Validasi bukti transfer |

### 1.3 Konvensi Status

**Invoice**:
- `PENDING` — Belum dibayar
- `PARTIAL` — Sudah dibayar sebagian (cicilan)
- `PAID` — Lunas

**Bukti Transfer**:
- `PENDING` — Menunggu validasi admin
- `APPROVED` — Disetujui
- `REJECTED` — Ditolak

**User**:
- `Active + Enabled` — Bisa login dan beroperasi
- `Active + Disabled` — Terdaftar, belum diaktifkan admin
- `Inactive` — Dinonaktifkan

**Invite Link**:
- `Aktif` — Masih bisa dipakai
- `Kedaluwarsa` — Melewati tanggal expiry
- `Batas Tercapai` — Use limit habis
- `Dicabut` — Direvoke admin

### 1.4 Konvensi Scope

| Scope | Arti |
|---|---|
| Scope Kamar | User hanya melihat santri di kamar yang di-assign |
| Scope Kelas | User hanya melihat santri di kelas yang di-assign |
| Tanpa Scope (Admin/Bendahara) | Melihat semua data |

---

## 2. Peta Navigasi Tingkat Tinggi

```
Login ─── (sukses) ──→ Dashboard / first accessible route

Sidebar (Desktop):
├── Beranda (/dashboard)
├── Master Data
│   ├── Manajemen Data Santri (/master-data/santri/manage)
│   ├── Manajemen Kamar (/master-data/kamar/manage)
│   └── Data Santri (/master-data/santri)
├── Keuangan
│   └── Manajemen Keuangan (/keuangan)
│       ├── Tab: Pengaturan Tagihan
│       ├── Tab: Pembayaran
│       ├── Tab: Invoice
│       ├── Tab: Resi
│       └── Tab: Rekap
├── Akademik
│   ├── Manajemen Kelas (/akademik/kelas/manage)
│   └── Kelas (/akademik/kelas)
├── User Management
│   ├── Manajemen User (/user-management/users)
│   ├── Manajemen Role (/user-management/roles)
│   ├── Manajemen Akses Halaman (/user-management/page-access)
│   ├── Reset Password (/user-management/reset-password)
│   └── Generate Link Pendaftaran (/user-management/invite-links)
└── Pengaturan (/settings)

Public (tanpa login):
├── Portal Wali Santri (/link/[token])
├── Upload Bukti Transfer (/link/[token]/upload-proof)
├── Registrasi User (/register/[token])
└── Request Role (/register/[token]/request-role)
```

---

## 3. Spesifikasi Halaman (Page-by-Page)

---

### 3.1 Login

**Tujuan**: Autentikasi user dengan username + password.

**Komponen UI**
- Form: username, password, tombol "Masuk"
- Show/hide password toggle

**Aksi (Tombol)**
- [Masuk] → validasi kredensial → redirect ke dashboard / first accessible route

**Navigasi**
- Dari: URL langsung, redirect dari halaman terproteksi
- Ke: `/dashboard` atau first accessible route sesuai role

**Guard**: Publik, tidak perlu login

**State & Status**
- Loading saat submit
- Error: "Username tidak ditemukan", "Password salah", "Akun belum diaktifkan"

**Empty / Error States**
- Validasi gagal: pesan error di bawah form

---

### 3.2 Dashboard (`/dashboard`)

**Tujuan**: Tampilkan ringkasan data utama pesantren.

**Komponen UI**
- 3 Summary Card: Total Santri, Total Kelas, Total Kamar
- Skeleton loading (animate-pulse) saat data belum tersedia

**Aksi (Tombol)**
- Tidak ada tombol aksi — halaman read-only

**Navigasi**
- Dari: Login redirect, sidebar
- Ke: Tidak ada navigasi keluar (informational page)

**Guard (Role/Scope)**
- Semua role dengan akses `/dashboard`
- Scope tidak berlaku (data agregat)

**State & Status**
- Loading: skeleton placeholder
- Error: "Gagal memuat beranda"

**Empty / Error States**
- Semua data 0: "Belum ada data untuk ditampilkan"

---

### 3.3 Data Santri — List (`/master-data/santri`)

**Tujuan**: Tampilkan daftar santri sesuai scope user (pembimbing kamar hanya lihat anggota kamarnya).

**Komponen UI**
- Search bar (by nama/NIS)
- Filter: kamar, kelas, gender, status tagihan
- List/Card santri dengan foto, nama, NIS, kamar, kelas, badge status tagihan
- Pagination (tombol Prev/Next + info "Hal X dari Y")

**Aksi (Tombol)**
- [Lihat Detail] → navigasi ke `/master-data/santri/[id]`
- [Search/Filter] → refetch data dengan parameter baru

**Navigasi**
- Dari: Sidebar "Data Santri"
- Ke: Detail Santri (`/master-data/santri/[id]`)

**Guard (Role/Scope)**
- Admin, Staf Pendataan: lihat semua santri
- Pembimbing Kamar: hanya santri di kamar scope-nya
- Wali Kelas: hanya santri di kelas scope-nya

**State & Status**
- Badge status tagihan per santri: Lunas / Belum Lunas / Belum Ada

**Empty / Error States**
- Tidak ada santri: "Belum ada data santri"
- Search tidak ditemukan: list kosong

**Catatan Implementasi UI**
- Komponen `SantriPageClient` dengan `mode="scoped"` — menerapkan filter scope otomatis

---

### 3.4 Manajemen Data Santri (`/master-data/santri/manage`)

**Tujuan**: Tampilkan daftar santri tanpa scope (admin/staf pendataan) + tombol tambah santri.

**Komponen UI**
- Sama seperti List Santri + tombol "Tambah Santri Baru"
- Modal/Form tambah santri (nama, NIS, gender, tanggal lahir, dll)

**Aksi (Tombol)**
- [Tambah Santri Baru] → buka form/navigasi ke `/santri/new`
- [Lihat Detail] → navigasi ke `/master-data/santri/[id]`

**Navigasi**
- Dari: Sidebar "Manajemen Data Santri"
- Ke: Detail Santri, Form Tambah Santri

**Guard (Role/Scope)**
- Admin, Staf Pendataan
- Scope TIDAK berlaku — lihat semua santri

**Catatan Implementasi UI**
- Komponen `SantriPageClient` dengan `mode="centralized"`

---

### 3.5 Detail Santri (`/master-data/santri/[id]`)

**Tujuan**: Tampilkan data lengkap satu santri, dengan tab Data Pribadi + Tagihan.

**Komponen UI**
- **Header**: Foto santri, nama, NIS, gender, QR Code
- **Tab "Data"**:
  - Informasi pribadi (read / edit mode)
  - Informasi orang tua
  - Alamat lengkap
  - Kamar & Kelas assignment
- **Tab "Tagihan"**:
  - Daftar invoice per model tagihan per periode
  - Detail tiap invoice: breakdown item, total, sisa, status
  - Riwayat pembayaran per invoice
  - Aksi bayar (per invoice)

**Aksi (Tombol)**
- [Edit] → toggle mode edit (inline form)
- [Simpan] → kirim perubahan data santri
- [Batal] → keluar dari mode edit tanpa menyimpan
- [Upload Foto] → file picker, upload ke server, crop/resize otomatis
- [Hapus Foto] → konfirmasi, hapus foto dari storage
- [Generate QR] → render QR code untuk santri
- [Bayar] → form pembayaran: jumlah, metode (Cash/Transfer), catatan
- [Cetak Resi] → generate PDF receipt untuk pembayaran terverifikasi

**Navigasi**
- Dari: List Santri, Detail Kamar, Detail Kelas
- Ke: Kembali ke list, Proof Viewer

**Guard (Role/Scope)**
- Admin, Staf Pendataan: akses penuh, bisa edit
- Pembimbing Kamar: lihat santri di kamarnya, read-only data, TIDAK bisa edit
- Wali Kelas: lihat santri di kelasnya, read-only data
- Bendahara: akses Tab Tagihan, bisa bayar

**State & Status**
- Mode: read / edit
- Invoice status: PENDING / PARTIAL / PAID
- Upload foto: progress state
- Form edit: dirty / clean

**Empty / Error States**
- Santri tidak ditemukan: 404
- Belum ada invoice: "Belum ada tagihan"
- Upload gagal: toast error

**Catatan Implementasi UI**
- QR Code menggunakan `qrcode.react`
- Foto menggunakan Next.js `<Image>` dengan fallback placeholder
- Toast notification untuk feedback aksi

---

### 3.6 Manajemen Kamar (`/master-data/kamar/manage`)

**Tujuan**: Kelola hierarki asrama: Kompleks → Gedung → Lantai → Kamar.

**Komponen UI**
- Daftar Kompleks (accordion/expandable)
  - Tiap kompleks: daftar Gedung
    - Tiap gedung: daftar Lantai
      - Tiap lantai: daftar Kamar (nama, kapasitas, jumlah santri)
- Form inline tambah Kompleks/Gedung/Lantai/Kamar
- Toast notification

**Aksi (Tombol)**
- [Tambah Kompleks] → form inline: nama, kode
- [Tambah Gedung] → form inline: nama, kode (di dalam kompleks)
- [Tambah Lantai] → form inline: nomor lantai (di dalam gedung)
- [Tambah Kamar] → form inline: nama, kode, kapasitas (di dalam lantai)
- [Lihat Kamar] → navigasi ke `/master-data/kamar/[roomId]`
- [Nonaktif/Aktif] → toggle isActive
- [Hapus] → confirm dialog, hapus item

**Navigasi**
- Dari: Sidebar "Manajemen Kamar"
- Ke: Detail Kamar

**Guard (Role/Scope)**
- Admin: CRUD penuh
- Pembimbing Kamar: TIDAK bisa CRUD, hanya navigasi ke detail kamar scope-nya

**Empty / Error States**
- Belum ada kompleks: "Belum ada data asrama"
- Gagal buat: toast error

---

### 3.7 Detail Kamar (`/master-data/kamar/[roomId]`)

**Tujuan**: Tampilkan daftar santri di satu kamar + aksi kelola anggota.

**Komponen UI**
- Header: nama kamar, path breadcrumb (Kompleks > Gedung > Lantai > Kamar), kapasitas
- Tabel santri: checkbox seleksi, nama, NIS, gender
- "Basket" area: santri terpilih untuk bulk action
- Form pencarian santri untuk ditambahkan

**Aksi (Tombol)**
- [Tambah Santri ke Kamar] → search santri belum punya kamar, pilih, assign
- [Keluarkan dari Kamar] → bulk remove selected santri dari kamar (confirm dialog)
- [Pindah ke Kamar Lain] → pilih kamar tujuan, pindahkan selected santri
- [Lihat Detail Santri] → navigasi link ke `/master-data/santri/[id]`
- [Pilih Semua / Hapus Pilihan] → toggle all checkboxes

**Navigasi**
- Dari: Manajemen Kamar
- Ke: Detail Santri, kembali ke Manajemen Kamar

**Guard (Role/Scope)**
- Admin: CRUD penuh
- Pembimbing Kamar: hanya kamar scope-nya — lihat + tambah/keluarkan santri

**State & Status**
- Selected santri (basket): array of selected IDs
- Search santri: query string + results dropdown

**Empty / Error States**
- Kamar kosong: "Belum ada santri di kamar ini"
- Kamar tidak ditemukan: 404
- Gagal pindah/keluarkan: toast error

---

### 3.8 Manajemen Kelas (`/akademik/kelas/manage`)

**Tujuan**: Kelola hierarki akademik: Jenjang → Tingkat → Kelas.

**Komponen UI**
- Daftar Jenjang (MI/MTs/MA) — expandable
  - Tiap jenjang: daftar Tingkat (Grade)
    - Tiap tingkat: daftar Kelas / Rombel (ClassGroup)
- Form inline tambah Jenjang/Tingkat/Kelas
- Toast notification

**Aksi (Tombol)**
- [Tambah Jenjang] → form inline: kode, nama
- [Tambah Tingkat] → form inline: nomor tingkat (di dalam jenjang)
- [Tambah Kelas/Rombel] → form inline: suffix (A/B/C), tahun ajaran
- [Lihat Kelas] → navigasi ke detail kelas
- [Hapus] → confirm dialog + cascade delete

**Navigasi**
- Dari: Sidebar "Manajemen Kelas"
- Ke: Detail Kelas

**Guard (Role/Scope)**
- Admin: CRUD penuh
- Wali Kelas: TIDAK bisa CRUD, hanya navigasi ke kelas scope-nya

**Empty / Error States**
- Belum ada jenjang: "Belum ada jenjang pendidikan"

---

### 3.9 Detail Kelas (`/akademik/kelas/[classGroupId]`)

**Tujuan**: Tampilkan daftar santri di satu kelas + aksi kelola anggota.

**Komponen UI**
- Header: nama kelas (e.g. "7A"), jenjang, tahun ajaran, kapasitas
- Tabel santri: checkbox seleksi, nama, NIS, gender
- "Basket" area: santri terpilih untuk bulk action
- Form pencarian santri untuk ditambahkan

**Aksi (Tombol)**
- [Tambah Santri ke Kelas] → search santri, pilih, assign
- [Keluarkan dari Kelas] → bulk remove selected santri dari kelas
- [Pindah ke Kelas Lain] → pilih kelas tujuan, pindahkan selected santri
- [Lihat Detail Santri] → navigasi link
- [Pilih Semua / Hapus Pilihan] → toggle all checkboxes

**Navigasi**
- Dari: Manajemen Kelas, List Kelas
- Ke: Detail Santri, kembali ke Manajemen Kelas

**Guard (Role/Scope)**
- Admin: CRUD penuh
- Wali Kelas: hanya kelas scope-nya

**State & Status**
- Selected santri (basket), search state

**Empty / Error States**
- Kelas kosong: "Belum ada santri di kelas ini"

---

### 3.10 List Kelas (`/akademik/kelas`)

**Tujuan**: Tampilkan daftar semua kelas (card view) untuk navigasi cepat ke detail.

**Komponen UI**
- Grid card: tiap kelas menampilkan nama, jumlah santri, kapasitas

**Aksi (Tombol)**
- [Lihat] → navigasi ke detail kelas

**Navigasi**
- Dari: Sidebar "Kelas"
- Ke: Detail Kelas

**Guard (Role/Scope)**
- Admin, Wali Kelas (lihat semua, navigasi ke scope kelas-nya)

---

### 3.11 Keuangan — Container (`/keuangan`)

**Tujuan**: Halaman container dengan 5 tab keuangan, dikendalikan query parameter `?tab=...`.

**Komponen UI**
- Tab bar: Pengaturan Tagihan | Pembayaran | Invoice | Resi | Rekap
- Konten tab di-load secara dinamis (code-splitting via `next/dynamic`)
- Suspense fallback loading per tab

**Aksi (Tombol)**
- [Klik Tab] → update query param `?tab=xxx`, load komponen

**Navigasi**
- Dari: Sidebar "Manajemen Keuangan"
- Ke: Konten sesuai tab aktif

**Guard (Role/Scope)**
- Admin, Bendahara: akses penuh semua tab
- Role lain: tergantung `role_pages` assignment

---

### 3.12 Keuangan — Tab Pengaturan Tagihan (`?tab=pengaturan-tagihan`)

**Tujuan**: CRUD model tagihan (template) + generate invoice massal dari model.

**Komponen UI**
- Daftar model tagihan (card): nama, periode, jumlah item, total, status aktif/nonaktif
- Form tambah/edit model (modal): nama, deskripsi, tipe periode, item tagihan (label + jumlah)
- Tombol generate invoice

**Aksi (Tombol)**
- [Tambah Model] → buka form modal
- [Edit] → buka form modal dengan data existing
- [Aktif/Nonaktif] → toggle status model
- [Hapus] → confirm dialog
- [Generate Invoice] → generate invoice massal per model untuk santri yang cocok scope

**Guard**: Admin, Bendahara

**State & Status**
- Model: aktif / nonaktif

**Empty / Error States**
- Belum ada model: "Belum ada model tagihan"

---

### 3.13 Keuangan — Tab Pembayaran (`?tab=pembayaran`)

**Tujuan**: Validasi bukti pembayaran transfer — approve atau reject.

**Komponen UI**
- Daftar bukti pembayaran: santri, periode, jumlah, status, tanggal upload
- Filter: status (Pending/Approved/Rejected)
- Pagination
- Tombol Lihat Bukti → halaman viewer

**Aksi (Tombol)**
- [Approve] → konfirmasi, ubah status bukti ke APPROVED, create payment record
- [Reject] → konfirmasi, ubah status ke REJECTED
- [Lihat Bukti] → buka image viewer (halaman `/keuangan/proofs/[proofId]`)

**Guard**: Admin, Bendahara

**State & Status**
- Bukti: PENDING / APPROVED / REJECTED

**Empty / Error States**
- Tidak ada bukti: "Tidak ada bukti pembayaran"

---

### 3.14 Keuangan — Tab Invoice (`?tab=invoice`)

**Tujuan**: Daftar invoice dengan filter periode, status, dan pencarian santri.

**Komponen UI**
- Filter: mode kalender (Gregorian/Hijri), tahun, bulan, status (PENDING/PARTIAL/PAID)
- Search: nama/NIS santri
- Tabel invoice: santri, model tagihan, periode, total, sisa, status
- Pagination

**Aksi (Tombol)**
- [Filter/Search] → refetch data
- [Lihat Detail] → ekspansi inline atau navigasi

**Guard**: Admin, Bendahara

**State & Status**
- Invoice: PENDING / PARTIAL / PAID
- Filter mode: GREGORIAN / HIJRI

---

### 3.15 Keuangan — Tab Resi (`?tab=resi`)

**Tujuan**: Daftar pembayaran terverifikasi + cetak resi.

**Komponen UI**
- Daftar pembayaran verified: santri, jumlah, metode, tanggal, resi number
- Pagination
- Modal resi viewer (ReceiptView component)

**Aksi (Tombol)**
- [Lihat Resi] → buka modal resi
- [Cetak] → generate PDF / export gambar
- [Verifikasi] → verifikasi pembayaran yang belum di-verify

**Guard**: Admin, Bendahara

---

### 3.16 Keuangan — Tab Rekap (`?tab=rekap`)

**Tujuan**: Ringkasan agregasi keuangan per periode, dengan 2 sub-tab.

**Komponen UI**
- Sub-tab: Rekap Invoice | Rekap Pembayaran (`?tab=rekap&sub=xxx`)
- Filter periode: mode (Gregorian/Hijri), tahun, bulan
- Summary cards: total tagihan, total dibayar, outstanding, jumlah invoice, jumlah pembayaran
- **Rekap Invoice**: statistik invoice (lunas/pending/partial count + amount)
- **Rekap Pembayaran**: statistik pembayaran (terverifikasi/pending count)

**Aksi (Tombol)**
- [Switch Sub-tab] → toggle antara Rekap Invoice / Rekap Pembayaran
- [Ubah Filter] → refetch data agregasi

**Guard**: Admin, Bendahara

**Empty / Error States**
- Tidak ada data periode: "Tidak ada data untuk periode ini"

---

### 3.17 Keuangan — Viewer Bukti Pembayaran (`/keuangan/proofs/[proofId]`)

**Tujuan**: Preview gambar bukti transfer dengan metadata invoice/santri.

**Komponen UI**
- Header: nama santri, NIS, nama model tagihan, periode
- Image viewer: gambar bukti (PaymentProofViewer component)
- Info: status bukti, tanggal upload, catatan

**Aksi (Tombol)**
- [Kembali ke Rekap] → navigasi balik

**Navigasi**
- Dari: Tab Pembayaran
- Ke: Kembali ke Tab Pembayaran

**Guard (Role/Scope)**
- Admin, Bendahara (cek `hasBillingProofViewerAccess`)

**Empty / Error States**
- Bukti tidak ditemukan: 404 (notFound)
- Akses ditolak: halaman "Akses Ditolak" dengan tombol kembali

---

### 3.18 Manajemen User (`/user-management/users`)

**Tujuan**: List semua user, enable/disable akun, assign role + scope.

**Komponen UI**
- Tab: Perlu Aktivasi | Semua User
- Tabel user: nama lengkap, username, role, status enabled
- Aksi per user: Enable, Disable, Assign Role, Set Scope
- Form scope: pilih kamar/kelas untuk ditautkan ke role

**Aksi (Tombol)**
- [Enable] → aktifkan akun user (isEnabled = true)
- [Disable] → nonaktifkan akun user + isi alasan
- [Assign Role] → pilih role codes yang di-assign ke user
- [Set Scope] → assign scope (kamar/kelas/jenjang) ke role tertentu
- [Tab Toggle] → switch antara "Perlu Aktivasi" dan "Semua User"

**Navigasi**
- Dari: Sidebar "Manajemen User"
- Ke: Tidak ada navigasi keluar (semua aksi inline)

**Guard (Role/Scope)**
- Admin only

**State & Status**
- User: enabled / disabled
- Tab: perlu_aktivasi / semua

**Empty / Error States**
- Belum ada user: "Belum ada user"
- Tidak ada user perlu aktivasi: "Semua user sudah diaktifkan"

---

### 3.19 Manajemen Role (`/user-management/roles`)

**Tujuan**: CRUD role dinamis (custom role di luar enum bawaan).

**Komponen UI**
- Form inline: Code + Nama Role → Tambah
- Daftar role: kode, nama, jumlah user yang memakai
- Tombol Hapus per role (disabled jika ada user yang assign)

**Aksi (Tombol)**
- [Tambah] → buat role baru
- [Hapus] → hapus role (jika tidak ada user assign)

**Guard**: Admin only

**Empty / Error States**
- Belum ada role: "Belum ada role"
- Code sudah ada: error conflict

---

### 3.20 Manajemen Akses Halaman (`/user-management/page-access`)

**Tujuan**: Atur akses halaman per role — checkbox matrix per page, grouped by PageGroup.

**Komponen UI**
- Panel kiri: daftar Role (selectable)
- Panel kanan: grouped checkboxes per PageGroup → Pages
  - Tiap group: expandable, tombol "Pilih Semua"
  - Tiap page: checkbox, nama halaman, path
- Tombol Simpan
- Toggle "Edit Groups & Pages" → buka `PermissionsCatalogEditor`
- **Catalog Editor**: CRUD PageGroup + Page catalog inline

**Aksi (Tombol)**
- [Pilih Role] → load halaman yang dicentang untuk role tersebut
- [Check/Uncheck Page] → toggle page ID di draft
- [Pilih Semua Kategori] → toggle semua page dalam satu group
- [Simpan] → `setRoleAccess` mutation: hapus semua + buat ulang `role_pages`
- [Edit Groups & Pages] → toggle Catalog Editor
- ADMIN role: semua checkbox otomatis tercentang, tidak bisa diubah

**Navigasi**
- Dari: Sidebar "Manajemen Akses Halaman"
- Ke: Tidak ada navigasi keluar

**Guard**: Admin only

**State & Status**
- `selectedRoleId`: role yang dipilih
- `draft.selectedPageIds`: page IDs yang tercentang (form state)
- `expandedGroups`: group mana yang terbuka
- `isPending`: loading saat save

**Empty / Error States**
- Belum pilih role: "Pilih role terlebih dahulu"
- Save error: toast error

**Catatan Implementasi UI**
- `effectiveSelectedPageSet`: untuk ADMIN, semua pages dianggap terpilih
- Banner kuning untuk ADMIN: "Role ADMIN otomatis memiliki akses ke semua halaman"
- Invalidasi cache: `getRoleAccess` + `me.permissions` setelah save

---

### 3.21 Reset Password (`/user-management/reset-password`)

**Tujuan**: Admin me-reset password user mana saja.

**Komponen UI**
- Daftar user: nama, username
- Per user: input password baru + tombol Reset

**Aksi (Tombol)**
- [Reset] → kirim password baru (min 6 char)

**Guard**: Admin only

**Empty / Error States**
- Belum ada user: "Belum ada user"
- Password terlalu pendek: tombol disabled

---

### 3.22 Generate Link Pendaftaran (`/user-management/invite-links`)

**Tujuan**: Buat link invite untuk pendaftaran user baru, dengan kuota + tanggal expiry.

**Komponen UI**
- Form: tanggal expiry (date picker), use limit (opsional), tombol Generate
- URL hasil generate: box dengan tombol Salin
- Tabel invite link: pembuat, expiry, use limit, used count, status, aksi

**Aksi (Tombol)**
- [Generate] → buat invite link baru
- [Salin URL] → copy ke clipboard
- [Revoke] → cabut link (disabled jika sudah dicabut)

**Guard**: Admin only

**State & Status**
- Invite: Aktif / Kedaluwarsa / Batas Tercapai / Dicabut

**Empty / Error States**
- Belum ada invite: "Belum ada invite link"

---

### 3.23 Pengaturan (`/settings`)

**Tujuan**: Pengaturan global sistem (placeholder saat ini).

**Komponen UI**
- Pesan placeholder: "Placeholder pengaturan global"

**Guard**: Admin only

---

### 3.24 Portal Wali Santri (`/link/[token]`)

**Tujuan**: Halaman publik read-only untuk wali santri — lihat data anak, tagihan, dan upload bukti transfer.

**Komponen UI**
- Header: foto santri, nama, NIS, gender, tanggal lahir, info orang tua
- Informasi alamat
- Daftar invoice: model tagihan, periode, total, sisa, status (PENDING/PARTIAL/PAID)
  - Per invoice: detail item breakdown, riwayat pembayaran
- Form upload bukti transfer (per invoice)
- Tombol cetak resi (jika ada pembayaran lunas)

**Aksi (Tombol)**
- [Upload Bukti Pembayaran] → buka form upload gambar + jumlah bayar
- [Cetak Resi] → generate/cetak PDF resi
- [Lihat Detail Invoice] → ekspansi inline

**Navigasi**
- Dari: Link yang di-share admin ke wali
- Ke: Upload Proof page (`/link/[token]/upload-proof`)

**Guard (Role/Scope)**
- Publik via token (non-login) — hanya anak yang bertautan dengan shared link
- Token harus valid dan belum expired/revoked

**State & Status**
- Invoice: PENDING / PARTIAL / PAID / WAITING (menunggu verifikasi)
- Upload: idle / uploading / success / error
- Token: valid / invalid / expired

**Empty / Error States**
- Token invalid: "Link tidak valid atau sudah kedaluwarsa"
- Belum ada invoice: "Belum ada tagihan"
- Upload gagal: toast error

**Catatan Implementasi UI**
- Komponen `GuardianPortalClient` (462 baris)
- Upload bukti transfer: file picker + preview gambar + amount input
- Konfirmasi sebelum submit upload

---

### 3.25 Upload Bukti Transfer Wali (`/link/[token]/upload-proof`)

**Tujuan**: Form upload bukti transfer untuk satu invoice tertentu.

**Komponen UI**
- Info invoice: model, periode, total, sisa bayar, status
- Form: pilih file gambar, input jumlah bayar, tombol Upload
- Preview gambar sebelum submit

**Aksi (Tombol)**
- [Upload] → kirim gambar + jumlah → buat PaymentProof (PENDING)
- [Kembali] → kembali ke portal wali

**Guard**: Token-based (publik)

**State & Status**
- Upload: idle / uploading / success / error

---

### 3.26 Registrasi User via Invite (`/register/[token]`)

**Tujuan**: Form pendaftaran user baru dari link invite.

**Komponen UI**
- Validasi token (loading / valid / invalid)
- Form: Nama Lengkap, Username, Password, Konfirmasi Password
- Link "Sudah punya akun? Masuk"

**Aksi (Tombol)**
- [Lanjutkan] → daftar user baru → redirect ke Request Role
- [Masuk] → navigasi ke `/login`

**Navigasi**
- Dari: Link invite yang di-share admin
- Ke: Request Role (`/register/[token]/request-role`)

**Guard**: Token-based (publik) — token harus valid, belum expired, belum limit

**State & Status**
- Token validation: loading / valid / invalid
- Form: error messages

**Empty / Error States**
- Token invalid: "Link tidak valid" + tombol Muat Ulang
- Password mismatch: "Konfirmasi password tidak sama"
- Username taken: error dari server

---

### 3.27 Request Role (`/register/[token]/request-role`)

**Tujuan**: Setelah registrasi, user memilih role yang diminta.

**Komponen UI**
- List role tersedia (multi-select checkboxes)
- Input catatan (opsional)
- Tombol "Ajukan Request"
- Success state: pesan "tunggu admin aktifkan"

**Aksi (Tombol)**
- [Toggle Role] → pilih/hapus role dari request
- [Ajukan Request] → kirim role request ke admin
- [Masuk] → navigasi ke login setelah success

**Navigasi**
- Dari: Setelah registrasi sukses
- Ke: Login page

**Guard**: Token-based (request token dari registrasi)

**State & Status**
- Request: idle / submitting / success / error

---

## 4. Matriks Permission Level Tombol (Ringkas)

### 4.1 Modul Santri / Master Data

| Aksi | Admin | Staf Pendataan | Pembimbing Kamar | Wali Kelas | Bendahara | Wali Santri |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Lihat list santri | ✅ Semua | ✅ Semua | ✅ Scope kamar | ✅ Scope kelas | ❌ | ❌ |
| Lihat detail santri | ✅ | ✅ | ✅ Scope | ✅ Scope | ❌ | ✅ Via token |
| Edit data santri | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tambah santri | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Upload/hapus foto | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Hapus santri | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 4.2 Modul Kamar / Asrama

| Aksi | Admin | Pembimbing Kamar | Role lain |
|---|:---:|:---:|:---:|
| CRUD Kompleks/Gedung/Lantai | ✅ | ❌ | ❌ |
| Tambah kamar | ✅ | ❌ | ❌ |
| Lihat detail kamar | ✅ Semua | ✅ Scope | ❌ |
| Tambah santri ke kamar | ✅ | ✅ Scope | ❌ |
| Keluarkan santri dari kamar | ✅ | ✅ Scope | ❌ |
| Pindah santri antar kamar | ✅ | ✅ Scope | ❌ |

### 4.3 Modul Kelas / Akademik

| Aksi | Admin | Wali Kelas | Role lain |
|---|:---:|:---:|:---:|
| CRUD Jenjang/Tingkat/Kelas | ✅ | ❌ | ❌ |
| Lihat detail kelas | ✅ Semua | ✅ Scope | ❌ |
| Tambah santri ke kelas | ✅ | ❌ | ❌ |
| Keluarkan santri dari kelas | ✅ | ❌ | ❌ |
| Pindah santri antar kelas | ✅ | ❌ | ❌ |

### 4.4 Modul Keuangan

| Aksi | Admin | Bendahara | Wali Santri | Role lain |
|---|:---:|:---:|:---:|:---:|
| CRUD model tagihan | ✅ | ✅ | ❌ | ❌ |
| Generate invoice | ✅ | ✅ | ❌ | ❌ |
| Lihat daftar invoice | ✅ | ✅ | ✅ Via token | ❌ |
| Catat pembayaran cash | ✅ | ✅ | ❌ | ❌ |
| Upload bukti transfer | ❌ | ❌ | ✅ Via token | ❌ |
| Approve/Reject bukti | ✅ | ✅ | ❌ | ❌ |
| Lihat bukti pembayaran | ✅ | ✅ | ❌ | ❌ |
| Cetak resi | ✅ | ✅ | ✅ Via token | ❌ |
| Lihat rekap | ✅ | ✅ | ❌ | ❌ |

### 4.5 Modul User Management

| Aksi | Admin | Role lain |
|---|:---:|:---:|
| Lihat/enable/disable user | ✅ | ❌ |
| Assign role ke user | ✅ | ❌ |
| Set scope role | ✅ | ❌ |
| CRUD role | ✅ | ❌ |
| Kelola page access | ✅ | ❌ |
| Reset password | ✅ | ❌ |
| Generate/revoke invite link | ✅ | ❌ |

### 4.6 Modul Publik (Non-Login)

| Aksi | Siapa | Syarat |
|---|---|---|
| Registrasi via invite link | Calon user | Token invite valid |
| Request role | User baru setelah registrasi | Request token dari registrasi |
| Lihat data santri (read-only) | Wali santri | Shared link token valid |
| Lihat tagihan & status | Wali santri | Shared link token valid |
| Upload bukti transfer | Wali santri | Shared link token valid |
| Cetak resi | Wali santri | Shared link token valid |
