-- AlterTable
ALTER TABLE "AccessorySale" ADD COLUMN     "feeWorker" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "workerId" INTEGER;

-- AddForeignKey
ALTER TABLE "AccessorySale" ADD CONSTRAINT "AccessorySale_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
