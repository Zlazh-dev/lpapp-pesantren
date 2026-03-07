
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
