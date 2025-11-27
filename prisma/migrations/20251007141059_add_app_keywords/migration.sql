/*
  Warnings:

  - A unique constraint covering the columns `[appId,keyword,country]` on the table `keywords` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "keywords" ADD COLUMN     "appId" TEXT,
ALTER COLUMN "brandId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "keywords_appId_keyword_country_key" ON "keywords"("appId", "keyword", "country");

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
