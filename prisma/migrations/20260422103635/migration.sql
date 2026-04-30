-- CreateTable
CREATE TABLE "BlastMessageHistory" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BlastMessageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BlastMessageHistoryToCustomer" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_BlastMessageHistoryToCustomer_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BlastMessageHistoryToCustomer_B_index" ON "_BlastMessageHistoryToCustomer"("B");

-- AddForeignKey
ALTER TABLE "BlastMessageHistory" ADD CONSTRAINT "BlastMessageHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlastMessageHistoryToCustomer" ADD CONSTRAINT "_BlastMessageHistoryToCustomer_A_fkey" FOREIGN KEY ("A") REFERENCES "BlastMessageHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlastMessageHistoryToCustomer" ADD CONSTRAINT "_BlastMessageHistoryToCustomer_B_fkey" FOREIGN KEY ("B") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
