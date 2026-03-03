-- Align page-group codes with revised ZlazhUp Beta naming
DELETE FROM "page_groups"
WHERE "code" = 'BERANDA'
  AND EXISTS (SELECT 1 FROM "page_groups" WHERE "code" = 'DASHBOARD');

UPDATE "page_groups"
SET "code" = 'DASHBOARD',
    "name" = 'Dashboard',
    "updated_at" = NOW()
WHERE "code" = 'BERANDA'
  AND NOT EXISTS (SELECT 1 FROM "page_groups" WHERE "code" = 'DASHBOARD');

DELETE FROM "page_groups"
WHERE "code" = 'PENGATURAN'
  AND EXISTS (SELECT 1 FROM "page_groups" WHERE "code" = 'SETTINGS');

UPDATE "page_groups"
SET "code" = 'SETTINGS',
    "name" = 'Settings',
    "updated_at" = NOW()
WHERE "code" = 'PENGATURAN'
  AND NOT EXISTS (SELECT 1 FROM "page_groups" WHERE "code" = 'SETTINGS');

-- Ensure required page-groups exist (bootstrap safety)
INSERT INTO "page_groups" ("id", "code", "name", "sort_order", "is_active", "created_at", "updated_at")
SELECT md5(random()::text || clock_timestamp()::text), v.code, v.name, v.sort_order, true, NOW(), NOW()
FROM (
    VALUES
        ('DASHBOARD', 'Dashboard', 0),
        ('MASTER_DATA', 'Master Data', 1),
        ('KEUANGAN', 'Keuangan', 2),
        ('AKADEMIK', 'Akademik', 3),
        ('USER_MANAGEMENT', 'User Management', 4),
        ('SETTINGS', 'Settings', 5)
) AS v(code, name, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM "page_groups" pg WHERE pg."code" = v.code
);

UPDATE "page_groups"
SET "is_active" = true,
    "updated_at" = NOW()
WHERE "code" IN ('DASHBOARD', 'MASTER_DATA', 'KEUANGAN', 'AKADEMIK', 'USER_MANAGEMENT', 'SETTINGS');

-- Ensure ADMIN role exists
INSERT INTO "role_entries" ("id", "code", "name", "created_at", "updated_at")
SELECT md5(random()::text || clock_timestamp()::text), 'ADMIN', 'Administrator', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "role_entries" WHERE "code" = 'ADMIN'
);

-- Ensure admin account is enabled
UPDATE "users"
SET "is_enabled" = true,
    "enabled_at" = COALESCE("enabled_at", NOW()),
    "disabled_reason" = NULL,
    "updated_at" = NOW()
WHERE "username" = 'admin' OR "role" = 'ADMIN';

-- Ensure admin account has ADMIN role relation
INSERT INTO "user_roles" ("user_id", "role_id")
SELECT u."id", r."id"
FROM "users" u
JOIN "role_entries" r ON r."code" = 'ADMIN'
WHERE (u."username" = 'admin' OR u."role" = 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM "user_roles" ur
      WHERE ur."user_id" = u."id" AND ur."role_id" = r."id"
  );

-- Ensure ADMIN role has full page-group access by default
INSERT INTO "role_page_group_access" ("role_id", "page_group_id")
SELECT r."id", pg."id"
FROM "role_entries" r
JOIN "page_groups" pg ON pg."code" IN ('DASHBOARD', 'MASTER_DATA', 'KEUANGAN', 'AKADEMIK', 'USER_MANAGEMENT', 'SETTINGS')
WHERE r."code" = 'ADMIN'
ON CONFLICT ("role_id", "page_group_id") DO NOTHING;
