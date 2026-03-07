
---
[2026-03-08 05:00 WIB] - P1: Setup Backup Database PostgreSQL

Membuat sistem backup otomatis harian untuk database pesantren_db.
Langkah yang dilakukan:
- Buat direktori /home/adminedas/backups (chmod adminedas:adminedas)
- Upload script /home/adminedas/backup-db.sh (pg_dump -h localhost + gzip + cleanup 30d)
- Setup ~/.pgpass (chmod 600) untuk auth tanpa password prompt
- Tambahkan crontab: 0 1 * * * backup-db.sh
- Test manual BERHASIL: file db-2026-03-08_*.sql.gz terbuat, log backup.log tercatat

Output: 28KB backup file aktif di /home/adminedas/backups/
Risiko diatasi: kehilangan data DB total akibat disk failure/human error
Status: Selesai

---
[2026-03-07 22:14 WIB] - Server Hardening Session: P1–P5 Selesai

=== P1: Backup Database PostgreSQL ===
- Buat /home/adminedas/backups/ (chown adminedas)
- Upload /home/adminedas/backup-db.sh (pg_dump -h localhost | gzip, cleanup 30d)
- Setup ~/.pgpass (chmod 600) untuk auth non-interaktif
- Crontab: 0 1 * * * backup-db.sh
- Test manual BERHASIL: file db-*.sql.gz ~28K terbuat
Risiko diatasi: kehilangan data DB total
Status: Selesai

=== P2: Bind Next.js ke localhost + Harden UFW ===
- ecosystem.config.js: HOSTNAME 0.0.0.0 -> 127.0.0.1
- PM2 reload --update-env (instance 0 dan 1 reload OK)
- UFW: port 3000 DENY, Tailscale 100.64.0.0/10 ALLOW port 22
- UFW enabled (status: active)
Risiko diatasi: bypass Cloudflare via direct port 3000 access
Status: Selesai

=== P3: PM2 Log Rotation ===
- pm2 install pm2-logrotate
- max_size: 50M, retain: 7, compress: true
- pm2 save
Status: Selesai

=== P4: Prisma Migrate Otomatis di deploy.sh ===
- scripts/deploy.sh dipatch: tambah 'npx prisma migrate deploy' sebelum pm2 reload
- Verifikasi: 11 migrations, Database schema is up to date
Status: Selesai

=== P5: rclone Install (Off-site Backup) ===
- sudo apt install rclone -y: INSTALLED
- Crontab: 30 1 * * * rclone copy .../backups/ gdrive:lpapp-backups/
- CATATAN: rclone config (Google Drive auth) belum dikonfigurasi
  Perlu user jalankan manual: rclone config -> remote name: gdrive
Status: Partial (install selesai, perlu konfigurasi gdrive manual)

---
[2026-03-07 23:06 WIB] - Auto-Deploy Sukses

- Commit: 94c624b
- Pesan: Fix bug export santri Excel: exportFull procedure tanpa pagination
- Build: OK, PM2 reload OK
- Status: Live

---
[2026-03-08 05:58 WIB] - Setup Auto-Deploy Workflow

- Script: deploy-auto.sh (git pull master + npm ci + prisma migrate + build + pm2 reload)
- Trigger: cron setiap 5 menit cek .trigger-deploy file
- Test manual: BERHASIL (23:06 WIB), PM2 2 instance reload OK
- Log: /home/adminedas/logs/deploy.log
Status: Selesai

---
[2026-03-08 06:13 WIB] - Fix Bug Upload Santri: Tanggal Format & Kolom Keluar

- parseDate helper: support DD/MM/YYYY dan YYYY-MM-DD, set jam 12:00 hindari TZ shift
- Kolom baru 'Tanggal Keluar' di template: jika diisi ? isActive: false (alumni otomatis)
- Error message informatif per baris (contoh: Baris 5: Format tanggal lahir tidak valid)
- Template Excel: header DD/MM/YYYY + sample baris + lebar kolom optimal
- UI: instruksi format amber box + preview table dengan Tgl Keluar alumni badge
- TypeScript: 0 error
Status: Selesai
