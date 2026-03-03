-- CreateTable
CREATE TABLE "role_page_access" (
    "role_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,

    CONSTRAINT "role_page_access_pkey" PRIMARY KEY ("role_id","page_id")
);

-- CreateIndex
CREATE INDEX "role_page_access_role_id_idx" ON "role_page_access"("role_id");

-- CreateIndex
CREATE INDEX "role_page_access_page_id_idx" ON "role_page_access"("page_id");

-- AddForeignKey
ALTER TABLE "role_page_access" ADD CONSTRAINT "role_page_access_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_page_access" ADD CONSTRAINT "role_page_access_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
