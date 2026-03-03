-- Create enum for role request workflow
CREATE TYPE "RoleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Extend users for strict enable/disable gate
ALTER TABLE "users"
ADD COLUMN "is_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "enabled_at" TIMESTAMP(3),
ADD COLUMN "enabled_by_user_id" TEXT,
ADD COLUMN "disabled_reason" TEXT;

-- Backfill current users to keep existing accounts accessible
UPDATE "users"
SET "is_enabled" = true
WHERE "is_enabled" = false;

ALTER TABLE "users"
ADD CONSTRAINT "users_enabled_by_user_id_fkey"
FOREIGN KEY ("enabled_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "users_enabled_by_user_id_idx" ON "users"("enabled_by_user_id");

-- Invite links
CREATE TABLE "user_invite_links" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invite_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_invite_links_token_hash_key" ON "user_invite_links"("token_hash");
CREATE INDEX "user_invite_links_created_by_user_id_idx" ON "user_invite_links"("created_by_user_id");
CREATE INDEX "user_invite_links_expires_at_idx" ON "user_invite_links"("expires_at");

ALTER TABLE "user_invite_links"
ADD CONSTRAINT "user_invite_links_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Role request
CREATE TABLE "role_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "requested_role_codes" TEXT[] NOT NULL,
    "note" TEXT,
    "status" "RoleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_user_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "role_requests_status_created_at_idx" ON "role_requests"("status", "created_at");
CREATE INDEX "role_requests_user_id_status_idx" ON "role_requests"("user_id", "status");
CREATE INDEX "role_requests_reviewed_by_user_id_idx" ON "role_requests"("reviewed_by_user_id");

ALTER TABLE "role_requests"
ADD CONSTRAINT "role_requests_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_requests"
ADD CONSTRAINT "role_requests_reviewed_by_user_id_fkey"
FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Public request role token
CREATE TABLE "role_request_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_request_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "role_request_tokens_token_hash_key" ON "role_request_tokens"("token_hash");
CREATE INDEX "role_request_tokens_user_id_used_at_idx" ON "role_request_tokens"("user_id", "used_at");
CREATE INDEX "role_request_tokens_expires_at_idx" ON "role_request_tokens"("expires_at");

ALTER TABLE "role_request_tokens"
ADD CONSTRAINT "role_request_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Temporarily disable desktop /scan page catalog entry
UPDATE "pages"
SET "is_active" = false
WHERE "code" = 'SCAN' OR "path" = '/scan';
