-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "BacklinkStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandId" TEXT NOT NULL,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_rankings" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" INTEGER,
    "traffic" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appId" TEXT NOT NULL,

    CONSTRAINT "app_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandId" TEXT NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_rankings" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "url" TEXT,
    "traffic" INTEGER,
    "searchVolume" INTEGER,
    "difficulty" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keywordId" TEXT NOT NULL,

    CONSTRAINT "keyword_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backlinks" (
    "id" TEXT NOT NULL,
    "rootDomain" TEXT NOT NULL,
    "referringPageUrl" TEXT NOT NULL,
    "dr" INTEGER,
    "traffic" INTEGER,
    "targetUrl" TEXT NOT NULL,
    "anchor" TEXT,
    "dofollow" BOOLEAN NOT NULL DEFAULT true,
    "status" "BacklinkStatus" NOT NULL,
    "price" DOUBLE PRECISION,
    "builtOn" TIMESTAMP(3),
    "supplierEmail" TEXT,
    "liveFor" INTEGER,
    "invoice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandId" TEXT NOT NULL,

    CONSTRAINT "backlinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "url" TEXT,
    "pageType" TEXT NOT NULL,
    "contentUrl" TEXT,
    "wordCount" INTEGER,
    "status" "ArticleStatus" NOT NULL,
    "docCode" TEXT,
    "originalWc" INTEGER,
    "writer" TEXT,
    "publishDate" TIMESTAMP(3),
    "seoCheck" BOOLEAN NOT NULL DEFAULT false,
    "images" INTEGER,
    "ai" BOOLEAN NOT NULL DEFAULT false,
    "plagiarism" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandId" TEXT NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_rankings_appId_keyword_country_date_key" ON "app_rankings"("appId", "keyword", "country", "date");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_brandId_keyword_country_key" ON "keywords"("brandId", "keyword", "country");

-- CreateIndex
CREATE UNIQUE INDEX "keyword_rankings_keywordId_date_key" ON "keyword_rankings"("keywordId", "date");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_rankings" ADD CONSTRAINT "app_rankings_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keyword_rankings" ADD CONSTRAINT "keyword_rankings_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backlinks" ADD CONSTRAINT "backlinks_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
