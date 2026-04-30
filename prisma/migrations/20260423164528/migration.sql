-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'DEBIT', 'TRANSFER');

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "paymentType" "PaymentType";
