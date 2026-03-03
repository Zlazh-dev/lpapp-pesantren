# Panduan Deploy LpApp — Dari Nol Sampai Online

> Panduan ini mencakup **seluruh proses** mulai dari instalasi Ubuntu Server di Oracle VirtualBox,
> konfigurasi jaringan, instalasi semua dependensi, deploy aplikasi Next.js, hingga expose ke internet
> menggunakan **Cloudflare Tunnel** (tanpa perlu IP publik statis / port forwarding).

---

## Daftar Isi

1. [Install Oracle VirtualBox](#1-install-oracle-virtualbox)
2. [Download Ubuntu Server ISO](#2-download-ubuntu-server-iso)
3. [Buat & Konfigurasi VM di VirtualBox](#3-buat--konfigurasi-vm-di-virtualbox)
4. [Install Ubuntu Server 22.04](#4-install-ubuntu-server-2204)
5. [Konfigurasi Jaringan VM (Akses SSH dari Host)](#5-konfigurasi-jaringan-vm-akses-ssh-dari-host)
6. [Persiapan Server — Install Dependensi](#6-persiapan-server--install-dependensi)
7. [Setup Database PostgreSQL](#7-setup-database-postgresql)
8. [Upload & Siapkan Aplikasi di Server](#8-upload--siapkan-aplikasi-di-server)
9. [Buat File .env di Server](#9-buat-file-env-di-server)
10. [Jalankan Migrasi Database](#10-jalankan-migrasi-database)
11. [Jalankan Aplikasi dengan PM2](#11-jalankan-aplikasi-dengan-pm2)
12. [Setup Cloudflare Tunnel (Expose ke Internet)](#12-setup-cloudflare-tunnel-expose-ke-internet)
13. [Update NEXTAUTH_URL & Restart](#13-update-nextauth_url--restart)
14. [Checklist Akhir & Perintah Berguna](#14-checklist-akhir--perintah-berguna)
15. [Update Aplikasi (Setelah Ada Perubahan)](#15-update-aplikasi-setelah-ada-perubahan)

---

## 1. Install Oracle VirtualBox

1. Download **VirtualBox** dari: https://www.virtualbox.org/wiki/Downloads  
   Pilih: **Windows hosts**

2. Jalankan installer → ikuti wizard → klik **Next** sampai selesai → **Finish**

3. *(Opsional tapi disarankan)* Install juga **VirtualBox Extension Pack** dari halaman yang sama agar support USB 2.0/3.0 dan fitur lainnya.

---

## 2. Download Ubuntu Server ISO

Download **Ubuntu Server 22.04 LTS** (bukan Desktop):

🔗 https://ubuntu.com/download/server

File yang didownload: `ubuntu-22.04.x-live-server-amd64.iso` (±1.5 GB)

---

## 3. Buat & Konfigurasi VM di VirtualBox

### Langkah 3.1 — Buat VM Baru

1. Buka VirtualBox → klik **New**
2. Isi:
   - **Name**: `Ubuntu-LpApp`
   - **Type**: `Linux`
   - **Version**: `Ubuntu (64-bit)`
3. Klik **Next**

### Langkah 3.2 — Atur RAM & Storage

| Setting | Nilai Minimum | Rekomendasi |
|---------|--------------|-------------|
| RAM | 2 GB (2048 MB) | 4 GB (4096 MB) |
| CPU | 1 core | 2 core |
| Disk | 20 GB | 30 GB (VDI, dinamis) |

4. Pilih **Create a virtual hard disk now** → VDI → Dynamically allocated → ukuran minimal **20 GB** → **Create**

### Langkah 3.3 — Pasang ISO ke VM

1. Pilih VM yang baru dibuat → klik **Settings**
2. Masuk ke **Storage**
3. Klik ikon CD "Empty" di bawah Controller IDE
4. Di kanan, klik ikon CD → **Choose a disk file** → pilih file ISO Ubuntu Server yang sudah didownload
5. Klik **OK**

### Langkah 3.4 — Konfigurasi Jaringan (Penting!)

Di **Settings → Network**:

- **Adapter 1** (untuk internet): `NAT` *(default, biarkan)* — ini untuk VM bisa akses internet
- **Adapter 2** (untuk SSH dari host Windows):
  1. Enable **Adapter 2**
  2. Attached to: **Host-only Adapter**
  3. Name: `VirtualBox Host-Only Ethernet Adapter`

> **Note:** Adapter NAT = VM bisa akses internet (download packages). Adapter Host-Only = kamu bisa SSH ke VM dari Windows menggunakan IP lokal seperti `192.168.56.x`.

---

## 4. Install Ubuntu Server 22.04

1. Start VM → akan boot dari ISO

2. Pilih bahasa: **English** (disarankan untuk kemudahan troubleshooting)

3. Ikuti wizard instalasi:
   - **Keyboard**: English
   - **Network**: Biarkan default (DHCP akan otomatis konfigurasi)
   - **Storage**: Use an entire disk → pilih disk → Done (jangan lupa konfirmasi)
   - **Profile Setup**: Isi:
     - **Your name**: (bebas, contoh: `Admin`)
     - **Server name**: `lpapp-server`
     - **Username**: `lpapp` *(ingat ini, dipakai untuk SSH)*
     - **Password**: buat password yang kuat

4. **Install OpenSSH server**: ✅ **Centang** opsi ini saat ditawarkan

5. Di bagian **Featured Server Snaps**: **Skip saja** (tidak perlu)

6. Tunggu instalasi selesai → **Reboot Now**

7. Setelah reboot, login dengan username & password yang kamu buat tadi

---

## 5. Konfigurasi Jaringan VM (Akses SSH dari Host)

### Langkah 5.1 — Cek IP Adapter Host-Only

Di dalam VM, jalankan:

```bash
ip addr show
```

Cari interface kedua (biasanya `enp0s8` atau `eth1`) yang memiliki IP `192.168.56.x`.

Contoh output:
```
3: enp0s8: <BROADCAST,MULTICAST,UP,LOWER_UP>
    inet 192.168.56.101/24  ← ini IP yang akan dipakai untuk SSH
```

> **Penting:** Jika interface kedua belum punya IP, kamu perlu mengaktifkannya manual (Langkah 5.2).

### Langkah 5.2 — Aktifkan Adapter Host-Only (Jika Perlu)

```bash
# Cek nama interface
ip link show

# Aktifkan interface (ganti enp0s8 sesuai nama yang ada)
sudo ip link set enp0s8 up
sudo dhclient enp0s8
```

Atau buat konfigurasi permanen via netplan:

```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

Tambahkan (sesuaikan nama interface):
```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: true
    enp0s8:
      dhcp4: true
```

```bash
sudo netplan apply
ip addr show enp0s8  # cek IP sudah muncul
```

### Langkah 5.3 — SSH dari Windows

Buka **PowerShell** atau **Windows Terminal** di Windows host:

```powershell
ssh lpapp@192.168.56.101
```

*(ganti IP dengan IP yang muncul di step 5.1)*

Setelah ini, kamu bisa bekerja dari terminal Windows yang lebih nyaman. **Jangan tutup VM-nya** (bisa minimize).

---

## 6. Persiapan Server — Install Dependensi

Jalankan semua perintah ini via SSH (atau langsung di terminal VM):

```bash
# Update & upgrade sistem
sudo apt update && sudo apt upgrade -y

# Install tools dasar
sudo apt install -y curl git nano unzip htop

# Install Node.js 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi Node.js
node -v    # harus v20.x.x
npm -v     # harus 10.x.x

# Install PM2 (process manager untuk Node.js)
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verifikasi PostgreSQL
psql --version
sudo systemctl status postgresql    # harus active (running)
```

---

## 7. Setup Database PostgreSQL

```bash
# Masuk ke PostgreSQL sebagai user postgres
sudo -u postgres psql
```

Jalankan perintah SQL berikut di dalam psql:

```sql
-- Buat user database
CREATE USER pesantren WITH PASSWORD 'ganti_password_kuat_disini';

-- Buat database
CREATE DATABASE pesantren_db OWNER pesantren;

-- Beri akses penuh
GRANT ALL PRIVILEGES ON DATABASE pesantren_db TO pesantren;

-- Keluar dari psql
\q
```

Tes koneksi database:

```bash
psql -U pesantren -d pesantren_db -h localhost
# Masukkan password → harus berhasil masuk
# Ketik \q untuk keluar
```

---

## 8. Upload & Siapkan Aplikasi di Server

### Opsi A — Git Clone + Build di Server ✅ (Disarankan)

Jika kode kamu ada di GitHub:

```bash
# Di server
git clone https://github.com/USERNAME/lpapp.git /home/lpapp/lpapp
cd /home/lpapp/lpapp

# Install dependencies
npm ci

# Build aplikasi (untuk production)
npm run build
```

### Opsi B — Upload dari Windows via SCP

Build dulu di Windows:

```powershell
# Di folder project (Windows)
npm run build
```

Lalu upload ke server:

```powershell
# Upload dari Windows ke server (via PowerShell/Git Bash)
scp -r .next/standalone/ lpapp@192.168.56.101:/home/lpapp/lpapp/.next/standalone/
scp -r .next/static/ lpapp@192.168.56.101:/home/lpapp/lpapp/.next/static/
scp -r public/ lpapp@192.168.56.101:/home/lpapp/lpapp/public/
scp -r prisma/ lpapp@192.168.56.101:/home/lpapp/lpapp/prisma/
scp package.json lpapp@192.168.56.101:/home/lpapp/lpapp/
```

### Buat Folder Upload (Wajib)

```bash
mkdir -p /home/lpapp/lpapp/public/uploads/{photo,kk,logo}
chmod -R 755 /home/lpapp/lpapp/public/uploads
```

### Struktur Folder di Server:

```
/home/lpapp/lpapp/
├── .next/
│   ├── standalone/     ← hasil build utama (berisi server.js)
│   └── static/         ← assets statis (CSS, JS)
├── public/             ← file publik & upload
│   └── uploads/
│       ├── photo/
│       ├── kk/
│       └── logo/
├── prisma/             ← schema + migrations
├── .env                ← environment variables (BUAT MANUAL)
└── ecosystem.config.js ← konfigurasi PM2 (BUAT MANUAL)
```

---

## 9. Buat File .env di Server

```bash
nano /home/lpapp/lpapp/.env
```

Isi file `.env`:

```env
# === DATABASE ===
DATABASE_URL="postgresql://pesantren:ganti_password_kuat_disini@localhost:5432/pesantren_db"

# === NEXTAUTH ===
# Ganti dengan subdomain yang akan kamu buat di Cloudflare Tunnel nanti
NEXTAUTH_URL="https://app.namadomain.com"
NEXTAUTH_SECRET="nanti-generate-di-bawah"

# === APP ===
NODE_ENV=production
PORT=3000

# === CLOUDINARY (Opsional) ===
# Jika tidak diisi, upload file akan disimpan secara lokal di public/uploads/
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
```

**Generate `NEXTAUTH_SECRET`:**

```bash
openssl rand -base64 32
# Salin outputnya, paste ke NEXTAUTH_SECRET di .env
```

---

## 10. Jalankan Migrasi Database

```bash
cd /home/lpapp/lpapp

# Install dependencies (jika belum)
npm install

# Jalankan migrasi database
npx prisma migrate deploy

# (Opsional) Seed data awal (user default, dll)
npm run db:seed
```

> **Note:** Jika muncul error `Environment variable not found: DATABASE_URL`, pastikan file `.env` sudah ada dan berisi `DATABASE_URL` yang benar.

---

## 11. Jalankan Aplikasi dengan PM2

### Langkah 11.1 — Salin Static Files (Wajib!)

```bash
# Static assets harus ada di dalam folder standalone
cp -r /home/lpapp/lpapp/.next/static /home/lpapp/lpapp/.next/standalone/.next/static
cp -r /home/lpapp/lpapp/public /home/lpapp/lpapp/.next/standalone/public
```

### Langkah 11.2 — Buat Konfigurasi PM2

```bash
nano /home/lpapp/lpapp/ecosystem.config.js
```

```js
module.exports = {
  apps: [{
    name: 'lpapp',
    script: '.next/standalone/server.js',
    cwd: '/home/lpapp/lpapp',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '127.0.0.1',
    },
    env_file: '/home/lpapp/lpapp/.env',
  }]
}
```

### Langkah 11.3 — Start Aplikasi

```bash
cd /home/lpapp/lpapp

# Start dengan PM2
pm2 start ecosystem.config.js

# Cek status (harus 'online')
pm2 status

# Lihat log real-time
pm2 logs lpapp

# Auto-start PM2 saat server reboot
pm2 startup
# ↑ Perintah ini akan output sebuah command sudo, JALANKAN command tersebut!
pm2 save
```

### Langkah 11.4 — Tes Lokal

```bash
# Harus return HTML halaman login
curl http://localhost:3000

# Atau cek dengan browser dari Windows:
# http://192.168.56.101:3000
```

> **Penting:** Jika `curl http://localhost:3000` mengembalikan HTML, berarti aplikasi berjalan normal. Lanjut ke step berikutnya untuk expose ke internet.

---

## 12. Setup Cloudflare Tunnel (Expose ke Internet)

> **Note:** Cloudflare Tunnel membuat subdomain `app.namadomain.com` yang langsung tunnel ke server Ubuntu kamu — **tanpa perlu IP publik statis, tanpa port forwarding di router**.
>
> **Syarat**: Domain kamu (`namadomain.com`) sudah dikelola oleh **Cloudflare** (nameserver sudah pointing ke Cloudflare).

### Langkah 12.1 — Install cloudflared

```bash
# Download cloudflared untuk Linux amd64
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

sudo dpkg -i cloudflared.deb

# Verifikasi
cloudflared --version
```

### Langkah 12.2 — Login ke Cloudflare

```bash
cloudflared tunnel login
```

Akan muncul URL panjang. **Salin URL tersebut** dan buka di browser Windows.  
Login dengan akun Cloudflare kamu → pilih domain yang akan digunakan → **Authorize**.

Setelah authorized, file `cert.pem` akan otomatis tersimpan di `~/.cloudflared/`.

### Langkah 12.3 — Buat Tunnel

```bash
# Buat tunnel baru dengan nama 'lpapp-tunnel'
cloudflared tunnel create lpapp-tunnel

# Output akan menampilkan Tunnel ID:
# Created tunnel lpapp-tunnel with id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#                                       ^^^ CATAT TUNNEL ID INI ^^^
```

### Langkah 12.4 — Konfigurasi Tunnel

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

```yaml
tunnel: TUNNEL_ID_KAMU          # ganti dengan Tunnel ID dari step 12.3
credentials-file: /home/lpapp/.cloudflared/TUNNEL_ID_KAMU.json

ingress:
  # Ganti 'app' dan 'namadomain.com' sesuai keinginanmu
  - hostname: app.namadomain.com
    service: http://localhost:3000
  - service: http_status:404
```

Contoh subdomain lain yang bisa dipakai:
- `lpapp.namadomain.com`
- `pesantren.namadomain.com`
- `manage.namadomain.com`

### Langkah 12.5 — Route DNS Subdomain ke Tunnel

Perintah ini akan **otomatis membuat CNAME record** di Cloudflare untuk subdomain kamu:

```bash
# Sesuaikan subdomain dan domain
cloudflared tunnel route dns lpapp-tunnel app.namadomain.com
```

Verifikasi di **Cloudflare Dashboard → DNS** → harus ada:
```
app    CNAME    TUNNEL_ID.cfargotunnel.com    (Proxied ☁️ oranye) ✓
```

### Langkah 12.6 — Install sebagai Service (Auto-start)

```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Cek status (harus active/running)
sudo systemctl status cloudflared
```

---

## 13. Update NEXTAUTH_URL & Restart

Setelah tunnel berjalan, update `.env` dengan subdomain finalmu:

```bash
nano /home/lpapp/lpapp/.env
```

```env
NEXTAUTH_URL="https://app.namadomain.com"
```

Lalu restart aplikasi:

```bash
pm2 restart lpapp
pm2 logs lpapp   # pastikan tidak ada error
```

Buka browser dan akses: **`https://app.namadomain.com`** 🎉

---

## 14. Checklist Akhir & Perintah Berguna

### ✅ Checklist

| No | Item | Cara Cek |
|----|------|----------|
| 1 | Ubuntu Server terinstall | Login berhasil |
| 2 | Node.js 20 terinstall | `node -v` |
| 3 | PostgreSQL berjalan | `sudo systemctl status postgresql` |
| 4 | Database & user dibuat | `psql -U pesantren -d pesantren_db -h localhost` |
| 5 | Migrasi database sukses | `npx prisma migrate status` |
| 6 | App berjalan di port 3000 | `curl http://localhost:3000` |
| 7 | PM2 menjalankan app | `pm2 status` |
| 8 | Cloudflare Tunnel berjalan | `sudo systemctl status cloudflared` |
| 9 | Website bisa diakses online | Buka `https://app.namadomain.com` |

### 🛠️ Perintah Berguna Sehari-hari

```bash
# Status aplikasi
pm2 status
pm2 logs lpapp --lines 50

# Restart / stop / start aplikasi
pm2 restart lpapp
pm2 stop lpapp
pm2 start lpapp

# Status & log tunnel Cloudflare
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
sudo systemctl restart cloudflared

# Cek database
sudo -u postgres psql -d pesantren_db

# Monitoring resource server
htop
df -h    # cek disk
free -h  # cek RAM
```

---

## 15. Update Aplikasi (Setelah Ada Perubahan)

### Jika menggunakan Git (Opsi A):

```bash
# Di server
cd /home/lpapp/lpapp

git pull origin main   # ambil perubahan terbaru
npm ci                 # update dependencies jika ada perubahan
npm run build          # rebuild aplikasi

# Salin ulang static files
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# Restart aplikasi
pm2 restart lpapp
pm2 logs lpapp
```

### Jika menggunakan SCP (Opsi B):

```powershell
# Di Windows — build dulu
npm run build

# Upload ke server
rsync -avz --progress .next/standalone/ lpapp@192.168.56.101:/home/lpapp/lpapp/.next/standalone/
rsync -avz --progress .next/static/ lpapp@192.168.56.101:/home/lpapp/lpapp/.next/standalone/.next/static/

# Di server — restart
pm2 restart lpapp
```

> **Tip:** Jika ada perubahan schema database (migration baru), jalankan juga:
> ```bash
> cd /home/lpapp/lpapp && npx prisma migrate deploy
> pm2 restart lpapp
> ```

---

> **Selesai!** Aplikasimu sekarang berjalan di Ubuntu Server (VirtualBox) dan bisa diakses dari internet via Cloudflare Tunnel. 🚀
