-- CreateEnum
CREATE TYPE "ImbursementLogType" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accessImbursementCreate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessImbursementDelete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessImbursementRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessImbursementUpdate" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Imbursement" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "workerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Imbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImbursementLog" (
    "id" SERIAL NOT NULL,
    "imbursementId" INTEGER NOT NULL,
    "logType" "LogType" NOT NULL,
    "userId" INTEGER NOT NULL,
    "amountBefore" INTEGER,
    "amountAfter" INTEGER,
    "noteBefore" TEXT,
    "noteAfter" TEXT,
    "workerIdBefore" INTEGER,
    "workerIdAfter" INTEGER,
    "logActionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ImbursementLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Imbursement" ADD CONSTRAINT "Imbursement_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImbursementLog" ADD CONSTRAINT "ImbursementLog_imbursementId_fkey" FOREIGN KEY ("imbursementId") REFERENCES "Imbursement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImbursementLog" ADD CONSTRAINT "ImbursementLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImbursementLog" ADD CONSTRAINT "ImbursementLog_workerIdBefore_fkey" FOREIGN KEY ("workerIdBefore") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImbursementLog" ADD CONSTRAINT "ImbursementLog_workerIdAfter_fkey" FOREIGN KEY ("workerIdAfter") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
