-- ============================================================
-- Schema Drift Catchup Migration
-- Adds all columns and tables present in schema.prisma but
-- never reflected in the migration history.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Role enum: add new values, remove old ones
-- ────────────────────────────────────────────────────────────

-- Add new roles that replaced old ones
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAF_MADRASAH';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAF_PENDATAAN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'WALI_KELAS';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PEMBIMBING_KAMAR';

-- ────────────────────────────────────────────────────────────
-- 2. users table: add missing columns
-- ────────────────────────────────────────────────────────────

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "photo_url" TEXT;

-- ────────────────────────────────────────────────────────────
-- 3. santri table: add all missing columns
-- ────────────────────────────────────────────────────────────

ALTER TABLE "santri"
  ADD COLUMN IF NOT EXISTS "father_name" TEXT,
  ADD COLUMN IF NOT EXISTS "mother_name" TEXT,
  ADD COLUMN IF NOT EXISTS "father_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "mother_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "nik" TEXT,
  ADD COLUMN IF NOT EXISTS "no_kk" TEXT,
  ADD COLUMN IF NOT EXISTS "kk_file_url" TEXT,
  ADD COLUMN IF NOT EXISTS "kk_file_key" TEXT,
  ADD COLUMN IF NOT EXISTS "wali_name" TEXT,
  ADD COLUMN IF NOT EXISTS "wali_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "education_level" TEXT,
  ADD COLUMN IF NOT EXISTS "enrollment_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deactivated_at" TIMESTAMP(3);

-- santri: unique index on kk_file_key
CREATE UNIQUE INDEX IF NOT EXISTS "santri_kk_file_key_key" ON "santri"("kk_file_key");

-- ────────────────────────────────────────────────────────────
-- 4. dorm_room: add supervisor_id column
-- ────────────────────────────────────────────────────────────

ALTER TABLE "dorm_room"
  ADD COLUMN IF NOT EXISTS "supervisor_id" TEXT;

CREATE INDEX IF NOT EXISTS "dorm_room_supervisor_id_idx" ON "dorm_room"("supervisor_id");

ALTER TABLE "dorm_room"
  ADD CONSTRAINT "dorm_room_supervisor_id_fkey"
  FOREIGN KEY ("supervisor_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE "dorm_room" VALIDATE CONSTRAINT "dorm_room_supervisor_id_fkey";

-- ────────────────────────────────────────────────────────────
-- 5. class_groups: add wali_kelas_id column
-- ────────────────────────────────────────────────────────────

ALTER TABLE "class_groups"
  ADD COLUMN IF NOT EXISTS "wali_kelas_id" TEXT;

CREATE INDEX IF NOT EXISTS "class_groups_wali_kelas_id_idx" ON "class_groups"("wali_kelas_id");

ALTER TABLE "class_groups"
  ADD CONSTRAINT "class_groups_wali_kelas_id_fkey"
  FOREIGN KEY ("wali_kelas_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE "class_groups" VALIDATE CONSTRAINT "class_groups_wali_kelas_id_fkey";

-- ────────────────────────────────────────────────────────────
-- 6. app_settings table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- ────────────────────────────────────────────────────────────
-- 7. santri_change_requests table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "santri_change_requests" (
  "id" TEXT NOT NULL,
  "santri_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "change_field" TEXT,
  "current_value" TEXT,
  "requested_value" TEXT,
  "department" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requested_by" TEXT NOT NULL,
  "reviewed_by" TEXT,
  "review_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "santri_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "santri_change_requests_santri_id_idx" ON "santri_change_requests"("santri_id");
CREATE INDEX IF NOT EXISTS "santri_change_requests_status_idx" ON "santri_change_requests"("status");
CREATE INDEX IF NOT EXISTS "santri_change_requests_requested_by_idx" ON "santri_change_requests"("requested_by");

ALTER TABLE "santri_change_requests"
  ADD CONSTRAINT "santri_change_requests_santri_id_fkey"
  FOREIGN KEY ("santri_id") REFERENCES "santri"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────
-- 8. change_request_messages table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "change_request_messages" (
  "id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "sender_id" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "change_request_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "change_request_messages_request_id_idx" ON "change_request_messages"("request_id");
CREATE INDEX IF NOT EXISTS "change_request_messages_sender_id_idx" ON "change_request_messages"("sender_id");

ALTER TABLE "change_request_messages"
  ADD CONSTRAINT "change_request_messages_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "santri_change_requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "change_request_messages"
  ADD CONSTRAINT "change_request_messages_sender_id_fkey"
  FOREIGN KEY ("sender_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────
-- 9. section_members table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "section_members" (
  "id" TEXT NOT NULL,
  "santri_id" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "added_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "section_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "section_members_santri_id_section_key" ON "section_members"("santri_id", "section");
CREATE INDEX IF NOT EXISTS "section_members_section_idx" ON "section_members"("section");

ALTER TABLE "section_members"
  ADD CONSTRAINT "section_members_santri_id_fkey"
  FOREIGN KEY ("santri_id") REFERENCES "santri"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
