-- CreateEnum
CREATE TYPE "AccessoryUnitStatus" AS ENUM ('AVAILABLE', 'SOLD');

-- CreateTable
CREATE TABLE "AccessoryUnit" (
    "id" SERIAL NOT NULL,
    "accessoryId" INTEGER NOT NULL,
    "serialNumber" TEXT,
    "buyPrice" INTEGER NOT NULL,
    "status" "AccessoryUnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "purchaseId" INTEGER NOT NULL,
    "saleItemId" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AccessoryUnit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AccessoryUnit" ADD CONSTRAINT "AccessoryUnit_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryUnit" ADD CONSTRAINT "AccessoryUnit_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "AccessoryPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryUnit" ADD CONSTRAINT "AccessoryUnit_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "AccessorySaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
