-- DropForeignKey
ALTER TABLE "AccessoryLog" DROP CONSTRAINT "AccessoryLog_accessoryId_fkey";

-- DropForeignKey
ALTER TABLE "AccessoryLog" DROP CONSTRAINT "AccessoryLog_purchaseId_fkey";

-- DropForeignKey
ALTER TABLE "AccessoryLog" DROP CONSTRAINT "AccessoryLog_saleId_fkey";

-- DropForeignKey
ALTER TABLE "AccessoryLog" DROP CONSTRAINT "AccessoryLog_saleItemId_fkey";

-- DropForeignKey
ALTER TABLE "AccessoryLog" DROP CONSTRAINT "AccessoryLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "AccessoryPurchase" DROP CONSTRAINT "AccessoryPurchase_accessoryId_fkey";

-- DropForeignKey
ALTER TABLE "AccessorySale" DROP CONSTRAINT "AccessorySale_accessoryId_fkey";

-- DropForeignKey
ALTER TABLE "AccessorySale" DROP CONSTRAINT "AccessorySale_customerId_fkey";

-- DropForeignKey
ALTER TABLE "AccessorySaleItem" DROP CONSTRAINT "AccessorySaleItem_accessoryId_fkey";

-- DropForeignKey
ALTER TABLE "AccessorySaleItem" DROP CONSTRAINT "AccessorySaleItem_saleId_fkey";

-- DropForeignKey
ALTER TABLE "Unit" DROP CONSTRAINT "Unit_customerId_fkey";

-- DropForeignKey
ALTER TABLE "UnitLog" DROP CONSTRAINT "UnitLog_customerIdAfter_fkey";

-- DropForeignKey
ALTER TABLE "UnitLog" DROP CONSTRAINT "UnitLog_customerIdBefore_fkey";

-- DropForeignKey
ALTER TABLE "UnitLog" DROP CONSTRAINT "UnitLog_unitId_fkey";

-- DropForeignKey
ALTER TABLE "UnitLog" DROP CONSTRAINT "UnitLog_userId_fkey";

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitLog" ADD CONSTRAINT "UnitLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitLog" ADD CONSTRAINT "UnitLog_customerIdBefore_fkey" FOREIGN KEY ("customerIdBefore") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitLog" ADD CONSTRAINT "UnitLog_customerIdAfter_fkey" FOREIGN KEY ("customerIdAfter") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitLog" ADD CONSTRAINT "UnitLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryPurchase" ADD CONSTRAINT "AccessoryPurchase_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessorySale" ADD CONSTRAINT "AccessorySale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessorySale" ADD CONSTRAINT "AccessorySale_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessorySaleItem" ADD CONSTRAINT "AccessorySaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "AccessorySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessorySaleItem" ADD CONSTRAINT "AccessorySaleItem_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryLog" ADD CONSTRAINT "AccessoryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryLog" ADD CONSTRAINT "AccessoryLog_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryLog" ADD CONSTRAINT "AccessoryLog_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "AccessoryPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryLog" ADD CONSTRAINT "AccessoryLog_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "AccessorySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryLog" ADD CONSTRAINT "AccessoryLog_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "AccessorySaleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
