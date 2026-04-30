-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('AVAILABLE', 'BOOKED', 'SOLD');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" SERIAL NOT NULL,
    "imei" TEXT,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "images" TEXT[],
    "status" "Status" NOT NULL DEFAULT 'AVAILABLE',
    "buyAt" TIMESTAMP(3),
    "buyPrice" INTEGER,
    "soldAt" TIMESTAMP(3),
    "soldPrice" INTEGER,
    "dpAmount" INTEGER,
    "customerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitLog" (
    "id" SERIAL NOT NULL,
    "type" "LogType" NOT NULL,
    "unitId" INTEGER NOT NULL,
    "statusBefore" "Status",
    "statusAfter" "Status",
    "buyPriceBefore" INTEGER,
    "buyPriceAfter" INTEGER,
    "soldPriceBefore" INTEGER,
    "soldPriceAfter" INTEGER,
    "dpAmountBefore" INTEGER,
    "dpAmountAfter" INTEGER,
    "customerIdBefore" INTEGER,
    "customerIdAfter" INTEGER,
    "noteBefore" TEXT,
    "noteAfter" TEXT,
    "logActionNote" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_imei_key" ON "Unit"("imei");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitLog" ADD CONSTRAINT "UnitLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitLog" ADD CONSTRAINT "UnitLog_customerIdBefore_fkey" FOREIGN KEY ("customerIdBefore") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitLog" ADD CONSTRAINT "UnitLog_customerIdAfter_fkey" FOREIGN KEY ("customerIdAfter") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitLog" ADD CONSTRAINT "UnitLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
