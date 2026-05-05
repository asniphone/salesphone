-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('UNIT_SALE', 'UNIT_PURCHASE', 'ACCESSORY_SALE', 'ACCESSORY_PURCHASE', 'CASHFLOW', 'IMBURSEMENT');

-- CreateEnum
CREATE TYPE "LedgerActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "Ledger" (
    "id" BIGSERIAL NOT NULL,
    "actionType" "LedgerActionType" NOT NULL,
    "referenceType" "ReferenceType" NOT NULL,
    "referenceId" INTEGER NOT NULL,
    "beforeAmount" BIGINT NOT NULL DEFAULT 0,
    "afterAmount" BIGINT NOT NULL,
    "gapAmount" BIGINT NOT NULL,
    "actionNote" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);
