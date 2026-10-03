-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredCurrency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "resetPasswordExpires" TIMESTAMP(3),
ADD COLUMN     "resetPasswordToken" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "carrierName" TEXT,
ADD COLUMN     "lookupToken" TEXT,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "trackingNumber" TEXT;

-- AlterTable
ALTER TABLE "OrderAddress" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ImportSource" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastImportAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "importSourceId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "itemsTotal" INTEGER NOT NULL DEFAULT 0,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsImported" INTEGER NOT NULL DEFAULT 0,
    "itemsUpdated" INTEGER NOT NULL DEFAULT 0,
    "itemsSkipped" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceSnapshot" (
    "id" TEXT NOT NULL,
    "importSourceId" TEXT NOT NULL,
    "importBatchId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceFilePath" TEXT,
    "gitCommitSha" TEXT,
    "gitBranch" TEXT,
    "httpStatus" INTEGER,
    "contentHash" TEXT NOT NULL,
    "contentType" TEXT,
    "structuredData" TEXT,
    "rawHtmlOrText" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawCategoryRecord" (
    "id" TEXT NOT NULL,
    "recordCode" TEXT NOT NULL,
    "importSourceId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "sourceRecordId" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceSlug" TEXT NOT NULL,
    "sourceDescription" TEXT,
    "sourceUrl" TEXT,
    "sourceImageUrl" TEXT,
    "sourceParentSlug" TEXT,
    "sourceOrder" INTEGER,
    "sourceHash" TEXT NOT NULL,
    "rawPayload" TEXT NOT NULL,
    "normalizationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "normalizedCategoryId" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawCategoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawProductRecord" (
    "id" TEXT NOT NULL,
    "recordCode" TEXT NOT NULL,
    "importSourceId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "rawCategoryId" TEXT,
    "sourceRecordId" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceSlug" TEXT NOT NULL,
    "sourcePermalink" TEXT,
    "sourceSku" TEXT,
    "sourceCategoryName" TEXT,
    "sourceBrand" TEXT,
    "sourceShortDescription" TEXT,
    "sourceFullDescription" TEXT,
    "sourcePrice" DOUBLE PRECISION,
    "sourceRegularPrice" DOUBLE PRECISION,
    "sourceSalePrice" DOUBLE PRECISION,
    "sourceCurrency" TEXT,
    "sourceStockStatus" TEXT,
    "sourceStockQuantity" INTEGER,
    "sourceWeight" TEXT,
    "sourceDimensions" TEXT,
    "sourceAttributes" TEXT,
    "sourceVariations" TEXT,
    "sourceFlavor" TEXT,
    "sourceSize" TEXT,
    "sourcePackSize" TEXT,
    "sourceNetContent" TEXT,
    "sourceIngredients" TEXT,
    "sourceAllergens" TEXT,
    "sourceEffects" TEXT,
    "sourceServingInfo" TEXT,
    "sourceDosageInfo" TEXT,
    "sourceWarnings" TEXT,
    "sourceUsageInfo" TEXT,
    "sourceTags" TEXT,
    "sourceIsFeatured" BOOLEAN,
    "sourceReviewCount" INTEGER,
    "sourceAverageRating" DOUBLE PRECISION,
    "sourcePublishedDate" TEXT,
    "sourceModifiedDate" TEXT,
    "sourceCanonicalUrl" TEXT,
    "sourceSeoTitle" TEXT,
    "sourceSeoDescription" TEXT,
    "sourceOgImage" TEXT,
    "sourcePrimaryImage" TEXT,
    "sourceGalleryImages" TEXT,
    "sourceFilePath" TEXT,
    "sourceHash" TEXT NOT NULL,
    "rawPayload" TEXT NOT NULL,
    "normalizationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "publicationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "duplicateGroupId" TEXT,
    "matchConfidence" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawProductRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawMediaRecord" (
    "id" TEXT NOT NULL,
    "rawProductId" TEXT,
    "importSourceId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "sourcePageUrl" TEXT,
    "filename" TEXT NOT NULL,
    "altText" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "format" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isGallery" BOOLEAN NOT NULL DEFAULT false,
    "fileHash" TEXT,
    "dedupStatus" TEXT NOT NULL DEFAULT 'UNIQUE',
    "sharedProductCount" INTEGER NOT NULL DEFAULT 1,
    "rawPayload" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawMediaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawReviewRecord" (
    "id" TEXT NOT NULL,
    "rawProductId" TEXT,
    "importSourceId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "sourceReviewId" TEXT,
    "authorName" TEXT,
    "rating" DOUBLE PRECISION NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "reviewDate" TEXT,
    "isVerifiedBuyer" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT,
    "rawPayload" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'STAGED',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawReviewRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSourceLink" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rawProductId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceRecordId" TEXT,
    "matchConfidence" TEXT NOT NULL,
    "reconciliationNote" TEXT,
    "isPrimarySource" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSourceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorySourceLink" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "rawCategoryId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "mappingStatus" TEXT NOT NULL,
    "reconciliationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategorySourceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportIssue" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rawProductId" TEXT,
    "severity" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "field" TEXT,
    "sourceValue" TEXT,
    "conflictingValue" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportSource_sourceType_sourceUrl_key" ON "ImportSource"("sourceType", "sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_batchNumber_key" ON "ImportBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "ImportBatch_importSourceId_idx" ON "ImportBatch"("importSourceId");

-- CreateIndex
CREATE INDEX "SourceSnapshot_importSourceId_idx" ON "SourceSnapshot"("importSourceId");

-- CreateIndex
CREATE INDEX "SourceSnapshot_contentHash_idx" ON "SourceSnapshot"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "RawCategoryRecord_recordCode_key" ON "RawCategoryRecord"("recordCode");

-- CreateIndex
CREATE INDEX "RawCategoryRecord_importSourceId_idx" ON "RawCategoryRecord"("importSourceId");

-- CreateIndex
CREATE INDEX "RawCategoryRecord_sourceSlug_idx" ON "RawCategoryRecord"("sourceSlug");

-- CreateIndex
CREATE UNIQUE INDEX "RawProductRecord_recordCode_key" ON "RawProductRecord"("recordCode");

-- CreateIndex
CREATE INDEX "RawProductRecord_importSourceId_idx" ON "RawProductRecord"("importSourceId");

-- CreateIndex
CREATE INDEX "RawProductRecord_sourceSlug_idx" ON "RawProductRecord"("sourceSlug");

-- CreateIndex
CREATE INDEX "RawProductRecord_sourceSku_idx" ON "RawProductRecord"("sourceSku");

-- CreateIndex
CREATE INDEX "RawProductRecord_duplicateGroupId_idx" ON "RawProductRecord"("duplicateGroupId");

-- CreateIndex
CREATE INDEX "RawMediaRecord_importSourceId_idx" ON "RawMediaRecord"("importSourceId");

-- CreateIndex
CREATE INDEX "RawMediaRecord_filename_idx" ON "RawMediaRecord"("filename");

-- CreateIndex
CREATE INDEX "RawReviewRecord_importSourceId_idx" ON "RawReviewRecord"("importSourceId");

-- CreateIndex
CREATE INDEX "ProductSourceLink_productId_idx" ON "ProductSourceLink"("productId");

-- CreateIndex
CREATE INDEX "ProductSourceLink_rawProductId_idx" ON "ProductSourceLink"("rawProductId");

-- CreateIndex
CREATE INDEX "CategorySourceLink_categoryId_idx" ON "CategorySourceLink"("categoryId");

-- CreateIndex
CREATE INDEX "CategorySourceLink_rawCategoryId_idx" ON "CategorySourceLink"("rawCategoryId");

-- CreateIndex
CREATE INDEX "ImportIssue_importBatchId_idx" ON "ImportIssue"("importBatchId");

-- CreateIndex
CREATE INDEX "ImportIssue_issueType_idx" ON "ImportIssue"("issueType");

-- CreateIndex
CREATE UNIQUE INDEX "Order_lookupToken_key" ON "Order"("lookupToken");

-- CreateIndex
CREATE INDEX "Order_lookupToken_idx" ON "Order"("lookupToken");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_importSourceId_fkey" FOREIGN KEY ("importSourceId") REFERENCES "ImportSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_importSourceId_fkey" FOREIGN KEY ("importSourceId") REFERENCES "ImportSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawCategoryRecord" ADD CONSTRAINT "RawCategoryRecord_importSourceId_fkey" FOREIGN KEY ("importSourceId") REFERENCES "ImportSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawCategoryRecord" ADD CONSTRAINT "RawCategoryRecord_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawCategoryRecord" ADD CONSTRAINT "RawCategoryRecord_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProductRecord" ADD CONSTRAINT "RawProductRecord_importSourceId_fkey" FOREIGN KEY ("importSourceId") REFERENCES "ImportSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProductRecord" ADD CONSTRAINT "RawProductRecord_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProductRecord" ADD CONSTRAINT "RawProductRecord_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProductRecord" ADD CONSTRAINT "RawProductRecord_rawCategoryId_fkey" FOREIGN KEY ("rawCategoryId") REFERENCES "RawCategoryRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMediaRecord" ADD CONSTRAINT "RawMediaRecord_rawProductId_fkey" FOREIGN KEY ("rawProductId") REFERENCES "RawProductRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMediaRecord" ADD CONSTRAINT "RawMediaRecord_importSourceId_fkey" FOREIGN KEY ("importSourceId") REFERENCES "ImportSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMediaRecord" ADD CONSTRAINT "RawMediaRecord_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawReviewRecord" ADD CONSTRAINT "RawReviewRecord_rawProductId_fkey" FOREIGN KEY ("rawProductId") REFERENCES "RawProductRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawReviewRecord" ADD CONSTRAINT "RawReviewRecord_importSourceId_fkey" FOREIGN KEY ("importSourceId") REFERENCES "ImportSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawReviewRecord" ADD CONSTRAINT "RawReviewRecord_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSourceLink" ADD CONSTRAINT "ProductSourceLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSourceLink" ADD CONSTRAINT "ProductSourceLink_rawProductId_fkey" FOREIGN KEY ("rawProductId") REFERENCES "RawProductRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySourceLink" ADD CONSTRAINT "CategorySourceLink_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySourceLink" ADD CONSTRAINT "CategorySourceLink_rawCategoryId_fkey" FOREIGN KEY ("rawCategoryId") REFERENCES "RawCategoryRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportIssue" ADD CONSTRAINT "ImportIssue_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportIssue" ADD CONSTRAINT "ImportIssue_rawProductId_fkey" FOREIGN KEY ("rawProductId") REFERENCES "RawProductRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
