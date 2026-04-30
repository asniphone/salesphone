-- CreateEnum
CREATE TYPE "CashflowType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "Cashflow" (
    "id" SERIAL NOT NULL,
    "type" "CashflowType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "imageAttachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Cashflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashflowLog" (
    "id" SERIAL NOT NULL,
    "cashflowId" INTEGER NOT NULL,
    "logType" "LogType" NOT NULL,
    "userId" INTEGER NOT NULL,
    "amountBefore" INTEGER,
    "amountAfter" INTEGER,
    "noteBefore" TEXT,
    "noteAfter" TEXT,
    "imageAttachmentsBefore" TEXT[],
    "imageAttachmentsAfter" TEXT[],
    "cashflowTypeBefore" "CashflowType",
    "cashflowTypeAfter" "CashflowType",
    "logActionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CashflowLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CashflowLog" ADD CONSTRAINT "CashflowLog_cashflowId_fkey" FOREIGN KEY ("cashflowId") REFERENCES "Cashflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashflowLog" ADD CONSTRAINT "CashflowLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
