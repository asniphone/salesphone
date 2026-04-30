/*
  Warnings:

  - Added the required column `transactionDate` to the `Cashflow` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cashflow" ADD COLUMN     "transactionDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CashflowLog" ADD COLUMN     "transactionDateAfter" TIMESTAMP(3),
ADD COLUMN     "transactionDateBefore" TIMESTAMP(3);
