-- CreateTable
CREATE TABLE "rank_trackers" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastChecked" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appId" TEXT NOT NULL,

    CONSTRAINT "rank_trackers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rank_tracker_history" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "url" TEXT,
    "traffic" INTEGER,
    "searchVolume" INTEGER,
    "difficulty" INTEGER,
    "cpc" DOUBLE PRECISION,
    "competition" DOUBLE PRECISION,
    "trend" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rankTrackerId" TEXT NOT NULL,

    CONSTRAINT "rank_tracker_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rank_trackers_appId_keyword_country_domain_key" ON "rank_trackers"("appId", "keyword", "country", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "rank_tracker_history_rankTrackerId_date_key" ON "rank_tracker_history"("rankTrackerId", "date");

-- AddForeignKey
ALTER TABLE "rank_trackers" ADD CONSTRAINT "rank_trackers_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_tracker_history" ADD CONSTRAINT "rank_tracker_history_rankTrackerId_fkey" FOREIGN KEY ("rankTrackerId") REFERENCES "rank_trackers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
