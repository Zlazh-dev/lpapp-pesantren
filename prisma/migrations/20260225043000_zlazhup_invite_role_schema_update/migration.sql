-- Align invite link schema with ZlazhUp Beta contract
ALTER TABLE "user_invite_links"
RENAME COLUMN "expires_at" TO "expiry";

ALTER TABLE "user_invite_links"
RENAME COLUMN "max_uses" TO "use_limit";

ALTER TABLE "user_invite_links"
ADD COLUMN "is_revoked" BOOLEAN NOT NULL DEFAULT false;

UPDATE "user_invite_links"
SET "is_revoked" = true
WHERE "revoked_at" IS NOT NULL;

ALTER TABLE "user_invite_links"
DROP COLUMN "revoked_at";

DROP INDEX IF EXISTS "user_invite_links_expires_at_idx";
CREATE INDEX "user_invite_links_expiry_idx" ON "user_invite_links"("expiry");

-- Align role request reviewer column naming
ALTER TABLE "role_requests"
DROP CONSTRAINT IF EXISTS "role_requests_reviewed_by_user_id_fkey";

ALTER TABLE "role_requests"
RENAME COLUMN "reviewed_by_user_id" TO "reviewer_user_id";

DROP INDEX IF EXISTS "role_requests_reviewed_by_user_id_idx";
CREATE INDEX "role_requests_reviewer_user_id_idx" ON "role_requests"("reviewer_user_id");

ALTER TABLE "role_requests"
ADD CONSTRAINT "role_requests_reviewer_user_id_fkey"
FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
