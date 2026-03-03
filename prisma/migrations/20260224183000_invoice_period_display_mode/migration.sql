-- Create enum for invoice period display mode
CREATE TYPE "BillingPeriodDisplayMode" AS ENUM ('GREGORIAN', 'HIJRI');

-- Add new invoice period metadata columns
ALTER TABLE "invoices"
ADD COLUMN "period_year" INTEGER,
ADD COLUMN "period_month" INTEGER,
ADD COLUMN "period_display_mode" "BillingPeriodDisplayMode" NOT NULL DEFAULT 'GREGORIAN',
ADD COLUMN "hijri_year" INTEGER,
ADD COLUMN "hijri_month" INTEGER,
ADD COLUMN "hijri_variant" TEXT DEFAULT 'indonesia';

-- Backfill Gregorian period columns from period_key when possible
UPDATE "invoices"
SET
  "period_year" = CASE
    WHEN "period_key" ~ '^\d{4}(-\d{2})?$' THEN CAST(split_part("period_key", '-', 1) AS INTEGER)
    ELSE NULL
  END,
  "period_month" = CASE
    WHEN "period_key" ~ '^\d{4}-\d{2}$' THEN CAST(split_part("period_key", '-', 2) AS INTEGER)
    ELSE NULL
  END;

-- Fallback to issued_at for rows that cannot be parsed from period_key
UPDATE "invoices"
SET "period_year" = EXTRACT(YEAR FROM "issued_at")::INTEGER
WHERE "period_year" IS NULL;

UPDATE "invoices"
SET "period_month" = EXTRACT(MONTH FROM "issued_at")::INTEGER
WHERE "period_month" IS NULL;

-- Add supporting indexes for period filtering
CREATE INDEX "invoices_period_display_mode_period_year_period_month_idx"
  ON "invoices"("period_display_mode", "period_year", "period_month");

CREATE INDEX "invoices_period_display_mode_hijri_year_hijri_month_idx"
  ON "invoices"("period_display_mode", "hijri_year", "hijri_month");
