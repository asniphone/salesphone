/*
  Warnings:

  - You are about to drop the column `accessoryId` on the `AccessorySale` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "AccessorySale" DROP CONSTRAINT "AccessorySale_accessoryId_fkey";

-- AlterTable
ALTER TABLE "AccessorySale" DROP COLUMN "accessoryId";
