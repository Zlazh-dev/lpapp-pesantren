-- New canonical page-level role permissions table.
CREATE TABLE "role_pages" (
    "role_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,

    CONSTRAINT "role_pages_pkey" PRIMARY KEY ("role_id","page_id")
);

CREATE INDEX "role_pages_role_id_idx" ON "role_pages"("role_id");
CREATE INDEX "role_pages_page_id_idx" ON "role_pages"("page_id");

ALTER TABLE "role_pages" ADD CONSTRAINT "role_pages_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_pages" ADD CONSTRAINT "role_pages_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve explicit legacy page selections first.
INSERT INTO "role_pages" ("role_id", "page_id")
SELECT DISTINCT rpa."role_id", rpa."page_id"
FROM "role_page_access" rpa
JOIN "pages" p ON p."id" = rpa."page_id"
ON CONFLICT DO NOTHING;

-- Expand legacy group-level access into page-level rows.
-- If a role already had explicit page picks inside a group, keep only those explicit picks.
INSERT INTO "role_pages" ("role_id", "page_id")
SELECT DISTINCT rpg."role_id", p."id"
FROM "role_page_group_access" rpg
JOIN "pages" p ON p."group_id" = rpg."page_group_id"
WHERE NOT EXISTS (
    SELECT 1
    FROM "role_page_access" rpa
    JOIN "pages" p_explicit ON p_explicit."id" = rpa."page_id"
    WHERE rpa."role_id" = rpg."role_id"
      AND p_explicit."group_id" = rpg."page_group_id"
)
ON CONFLICT DO NOTHING;
