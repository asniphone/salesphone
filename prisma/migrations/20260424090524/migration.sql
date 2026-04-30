-- CreateTable
CREATE TABLE "CommonInformation" (
    "id" SERIAL NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeAddress" TEXT NOT NULL,
    "storePhone" TEXT NOT NULL,
    "storeLogo" TEXT,
    "footNoteReceipt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommonInformation_pkey" PRIMARY KEY ("id")
);
