-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('REQUESTED', 'CALCULATING', 'PRICED', 'APPROVED', 'SENT', 'REJECTED');

-- CreateEnum
CREATE TYPE "MarginType" AS ENUM ('RATE', 'AMOUNT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OverheadCategory" AS ENUM ('MANUFACTURING', 'OUTSOURCING');

-- CreateEnum
CREATE TYPE "OverheadBase" AS ENUM ('MATERIAL_COST', 'LABOR_COST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawMaterial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "purchaseWeight" DOUBLE PRECISION NOT NULL,
    "yieldRate" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetWeight" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBOM" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "mixRatio" DOUBLE PRECISION NOT NULL,
    "blendRatio" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBOM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingCost" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackagingCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborRate" (
    "id" TEXT NOT NULL,
    "processName" TEXT NOT NULL,
    "hourlyWage" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaborRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductProcess" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "laborRateId" TEXT NOT NULL,
    "workHours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OverheadRate" (
    "id" TEXT NOT NULL,
    "category" "OverheadCategory" NOT NULL,
    "base" "OverheadBase" NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverheadRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalRequest" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "requestedQty" DOUBLE PRECISION NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCalculation" (
    "id" TEXT NOT NULL,
    "proposalRequestId" TEXT NOT NULL,
    "materialCost" DOUBLE PRECISION NOT NULL,
    "laborCost" DOUBLE PRECISION NOT NULL,
    "overheadCost" DOUBLE PRECISION NOT NULL,
    "packagingCost" DOUBLE PRECISION NOT NULL,
    "manufacturingCost" DOUBLE PRECISION NOT NULL,
    "outsourcingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "calculatedById" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceProposal" (
    "id" TEXT NOT NULL,
    "costCalculationId" TEXT NOT NULL,
    "marginType" "MarginType" NOT NULL,
    "marginValue" DOUBLE PRECISION NOT NULL,
    "priceBeforeTax" DOUBLE PRECISION NOT NULL,
    "priceAfterTax" DOUBLE PRECISION NOT NULL,
    "retailPrice" DOUBLE PRECISION,
    "priceDifference" DOUBLE PRECISION,
    "priceDifferenceRate" DOUBLE PRECISION,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoryLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeData" TEXT,
    "afterData" TEXT,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");

-- CreateIndex
CREATE INDEX "ProductBOM_productId_idx" ON "ProductBOM"("productId");

-- CreateIndex
CREATE INDEX "ProductBOM_rawMaterialId_idx" ON "ProductBOM"("rawMaterialId");

-- CreateIndex
CREATE INDEX "PackagingCost_productId_idx" ON "PackagingCost"("productId");

-- CreateIndex
CREATE INDEX "ProductProcess_productId_idx" ON "ProductProcess"("productId");

-- CreateIndex
CREATE INDEX "CostCalculation_proposalRequestId_idx" ON "CostCalculation"("proposalRequestId");

-- CreateIndex
CREATE INDEX "PriceProposal_costCalculationId_idx" ON "PriceProposal"("costCalculationId");

-- CreateIndex
CREATE INDEX "HistoryLog_entityType_entityId_idx" ON "HistoryLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "ProductBOM" ADD CONSTRAINT "ProductBOM_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBOM" ADD CONSTRAINT "ProductBOM_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingCost" ADD CONSTRAINT "PackagingCost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProcess" ADD CONSTRAINT "ProductProcess_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProcess" ADD CONSTRAINT "ProductProcess_laborRateId_fkey" FOREIGN KEY ("laborRateId") REFERENCES "LaborRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalRequest" ADD CONSTRAINT "ProposalRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalRequest" ADD CONSTRAINT "ProposalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCalculation" ADD CONSTRAINT "CostCalculation_proposalRequestId_fkey" FOREIGN KEY ("proposalRequestId") REFERENCES "ProposalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCalculation" ADD CONSTRAINT "CostCalculation_calculatedById_fkey" FOREIGN KEY ("calculatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceProposal" ADD CONSTRAINT "PriceProposal_costCalculationId_fkey" FOREIGN KEY ("costCalculationId") REFERENCES "CostCalculation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceProposal" ADD CONSTRAINT "PriceProposal_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryLog" ADD CONSTRAINT "HistoryLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
