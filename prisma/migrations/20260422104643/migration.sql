/*
  Warnings:

  - Added the required column `status` to the `BlastMessageHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `SendInvoiceHistory` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "BlastMessageHistory" ADD COLUMN     "status" "MessageStatus" NOT NULL;

-- AlterTable
ALTER TABLE "SendInvoiceHistory" ADD COLUMN     "status" "MessageStatus" NOT NULL;
