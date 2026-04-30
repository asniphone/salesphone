-- CreateEnum
CREATE TYPE "AccessoryKindLogType" AS ENUM ('COMMON', 'PURCHASE', 'SALE');

-- CreateTable
CREATE TABLE "Accessory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "images" TEXT[],
    "recordedStock" INTEGER NOT NULL DEFAULT 0,
    "recordedBuyPrice" INTEGER NOT NULL DEFAULT 0,
    "sellPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Accessory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessoryPurchase" (
    "id" SERIAL NOT NULL,
    "accessoryId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "buyPricePerUnit" INTEGER NOT NULL,
    "buyPriceTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AccessoryPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessorySale" (
    "id" SERIAL NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "totalProfit" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "accessoryId" INTEGER,

    CONSTRAINT "AccessorySale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessorySaleItem" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "accessoryId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "recordedBuyPricePerUnit" INTEGER NOT NULL,
    "sellPricePerUnit" INTEGER NOT NULL,
    "profitPerUnit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessorySaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessoryLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "accessoryId" INTEGER NOT NULL,
    "type" "LogType" NOT NULL,
    "kind" "AccessoryKindLogType" NOT NULL,
    "purchaseId" INTEGER,
    "saleId" INTEGER,
    "saleItemId" INTEGER,
    "beforeName" TEXT,
    "afterName" TEXT,
    "beforeSellPrice" INTEGER,
    "afterSellPrice" INTEGER,
    "beforeRecordedBuyPrice" INTEGER,
    "afterRecordedBuyPrice" INTEGER,
    "beforeRecordedStock" INTEGER,
    "afterRecordedStock" INTEGER,
    "logNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AccessoryLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AccessoryPurchase" ADD CONSTRAINT "AccessoryPurchase_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessorySale" ADD CONSTRAINT "AccessorySale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessorySale" ADD CONSTRAINT "AccessorySale_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessorySaleItem" ADD CONSTRAINT "AccessorySaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "AccessorySale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessorySaleItem" ADD CONSTRAINT "AccessorySaleItem_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryLog" ADD CONSTRAINT "AccessoryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryLog" ADD CONSTRAINT "AccessoryLog_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryLog" ADD CONSTRAINT "AccessoryLog_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "AccessoryPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryLog" ADD CONSTRAINT "AccessoryLog_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "AccessorySale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryLog" ADD CONSTRAINT "AccessoryLog_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "AccessorySaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
