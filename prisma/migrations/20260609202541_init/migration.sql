-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "categories" TEXT NOT NULL DEFAULT '',
    "subCategories" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "liquidityScale" TEXT NOT NULL DEFAULT '',
    "timeframes" TEXT NOT NULL DEFAULT '',
    "inferredInterests" JSONB NOT NULL DEFAULT '{}',
    "marketSettings" JSONB NOT NULL DEFAULT '{}',
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "popularMarkets" TEXT NOT NULL DEFAULT '',
    "agentId" INTEGER,
    "agentRegisteredAt" TIMESTAMP(3),
    "lastScoringUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightHistory" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "marketTitle" TEXT NOT NULL,
    "marketSlug" TEXT,
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsightHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedMarket" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "kalshiId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "category" TEXT NOT NULL,
    "subCategories" TEXT NOT NULL DEFAULT '',
    "marketType" TEXT NOT NULL DEFAULT 'binary',
    "timeHorizonDays" INTEGER NOT NULL,
    "resolutionDate" TIMESTAMP(3) NOT NULL,
    "resolutionType" TEXT NOT NULL DEFAULT 'event',
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "liquidity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "embedding" JSONB,
    "status" TEXT NOT NULL DEFAULT 'open',
    "kalshiUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimilarMarket" (
    "id" TEXT NOT NULL,
    "marketIId" TEXT NOT NULL,
    "marketJId" TEXT NOT NULL,
    "isSameOutcome" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rationale" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimilarMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketFavorite" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEngagement" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "timeSpentMs" INTEGER NOT NULL DEFAULT 0,
    "isWatchlisted" BOOLEAN NOT NULL DEFAULT false,
    "tradeExposure" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "interactionType" TEXT NOT NULL DEFAULT 'view',
    "firstInteraction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastInteraction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SomniaInvocation" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "receipts" JSONB NOT NULL,
    "recommendationCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SomniaInvocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_key" ON "Wallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Preference_walletId_key" ON "Preference"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedMarket_walletId_slug_key" ON "SavedMarket"("walletId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Market_kalshiId_key" ON "Market"("kalshiId");

-- CreateIndex
CREATE UNIQUE INDEX "SimilarMarket_marketIId_marketJId_key" ON "SimilarMarket"("marketIId", "marketJId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketFavorite_walletId_marketId_key" ON "MarketFavorite"("walletId", "marketId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEngagement_walletId_marketId_key" ON "UserEngagement"("walletId", "marketId");

-- CreateIndex
CREATE UNIQUE INDEX "SomniaInvocation_requestId_key" ON "SomniaInvocation"("requestId");

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightHistory" ADD CONSTRAINT "InsightHistory_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMarket" ADD CONSTRAINT "SavedMarket_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarMarket" ADD CONSTRAINT "SimilarMarket_marketIId_fkey" FOREIGN KEY ("marketIId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarMarket" ADD CONSTRAINT "SimilarMarket_marketJId_fkey" FOREIGN KEY ("marketJId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketFavorite" ADD CONSTRAINT "MarketFavorite_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Preference"("walletId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketFavorite" ADD CONSTRAINT "MarketFavorite_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEngagement" ADD CONSTRAINT "UserEngagement_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Preference"("walletId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEngagement" ADD CONSTRAINT "UserEngagement_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SomniaInvocation" ADD CONSTRAINT "SomniaInvocation_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Preference"("walletId") ON DELETE CASCADE ON UPDATE CASCADE;
