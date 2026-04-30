/*
  Warnings:

  - Made the column `workerId` on table `AccessorySale` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AccessorySale" ALTER COLUMN "feeWorker" DROP DEFAULT,
ALTER COLUMN "workerId" SET NOT NULL;
