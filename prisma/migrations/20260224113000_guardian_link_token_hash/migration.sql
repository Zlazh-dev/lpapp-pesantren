-- Enable SHA-256 hashing helper in PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add new secure token columns
ALTER TABLE "shared_links" ADD COLUMN "token_hash" TEXT;
ALTER TABLE "shared_links" ADD COLUMN "revoked_at" TIMESTAMP(3);
ALTER TABLE "shared_links" ADD COLUMN "last_access_at" TIMESTAMP(3);

-- Backfill token hash from existing plaintext tokens
UPDATE "shared_links"
SET "token_hash" = encode(digest("token", 'sha256'), 'hex')
WHERE "token_hash" IS NULL;

-- Mark previously inactive links as revoked
UPDATE "shared_links"
SET "revoked_at" = COALESCE("revoked_at", NOW())
WHERE "is_active" = false;

-- Enforce secure token hash usage
ALTER TABLE "shared_links" ALTER COLUMN "token_hash" SET NOT NULL;
DROP INDEX IF EXISTS "shared_links_token_idx";
CREATE UNIQUE INDEX "shared_links_token_hash_key" ON "shared_links"("token_hash");
CREATE INDEX IF NOT EXISTS "shared_links_santri_id_idx" ON "shared_links"("santri_id");

-- Remove plaintext token storage
ALTER TABLE "shared_links" DROP COLUMN "token";
ALTER TABLE "shared_links" DROP COLUMN "is_active";
