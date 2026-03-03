-- Ensure required page groups exist and stay active in fixed order.
INSERT INTO page_groups (id, code, name, sort_order, is_active, created_at, updated_at)
VALUES
  (md5(random()::text || clock_timestamp()::text), 'DASHBOARD', 'Dashboard', 0, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), 'MASTER_DATA', 'Master Data', 1, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), 'KEUANGAN', 'Keuangan', 2, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), 'AKADEMIK', 'Akademik', 3, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), 'USER_MANAGEMENT', 'User Management', 4, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), 'SETTINGS', 'Settings', 5, true, now(), now())
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

WITH group_map AS (
  SELECT code, id
  FROM page_groups
  WHERE code IN ('DASHBOARD', 'MASTER_DATA', 'KEUANGAN', 'AKADEMIK', 'USER_MANAGEMENT', 'SETTINGS')
)
INSERT INTO pages (id, group_id, code, name, path, sort_order, is_active, created_at, updated_at)
VALUES
  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'DASHBOARD'), 'DASHBOARD', 'Beranda', '/dashboard', 0, true, now(), now()),

  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'MASTER_DATA'), 'MASTER_SANTRI_MANAGE', 'Manajemen Data Santri', '/master-data/santri/manage', 0, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'MASTER_DATA'), 'MASTER_KAMAR_MANAGE', 'Manajemen Kamar', '/master-data/kamar/manage', 1, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'MASTER_DATA'), 'MASTER_SANTRI_LIST', 'Data Santri', '/master-data/santri', 2, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'MASTER_DATA'), 'MASTER_SANTRI_DETAIL', 'Detail Santri', '/master-data/santri/[id]', 3, true, now(), now()),

  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'KEUANGAN'), 'KEUANGAN_MANAGEMENT', 'Manajemen Keuangan', '/keuangan', 0, true, now(), now()),

  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'AKADEMIK'), 'AKADEMIK_KELAS_MANAGE', 'Manajemen Kelas', '/akademik/kelas/manage', 0, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'AKADEMIK'), 'AKADEMIK_KELAS_LIST', 'Kelas', '/akademik/kelas', 1, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'AKADEMIK'), 'AKADEMIK_KELAS_DETAIL', 'Detail Kelas', '/akademik/kelas/[classGroupId]', 2, true, now(), now()),

  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'USER_MANAGEMENT'), 'USER_MANAGEMENT_USERS', 'Manajemen User', '/user-management/users', 0, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'USER_MANAGEMENT'), 'USER_MANAGEMENT_ROLES', 'Manajemen Role', '/user-management/roles', 1, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'USER_MANAGEMENT'), 'USER_MANAGEMENT_PAGE_ACCESS', 'Manajemen Akses Halaman', '/user-management/page-access', 2, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'USER_MANAGEMENT'), 'USER_MANAGEMENT_RESET_PASSWORD', 'Reset Password', '/user-management/reset-password', 3, true, now(), now()),
  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'USER_MANAGEMENT'), 'USER_MANAGEMENT_INVITE_LINKS', 'Generate Link Untuk Pendaftaran User', '/user-management/invite-links', 4, true, now(), now()),

  (md5(random()::text || clock_timestamp()::text), (SELECT id FROM group_map WHERE code = 'SETTINGS'), 'PENGATURAN_GLOBAL', 'Pengaturan', '/settings', 0, true, now(), now())
ON CONFLICT (code) DO UPDATE
SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  path = EXCLUDED.path,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

-- /scan is temporarily removed from active catalog.
UPDATE pages
SET is_active = false, updated_at = now()
WHERE code = 'SCAN' OR path = '/scan';
