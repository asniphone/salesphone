import { Prisma } from "@prisma/client";

export interface LedgerInsertParams {
  actionType: "CREATE" | "UPDATE" | "DELETE";
  referenceType:
    | "UNIT_SALE"
    | "UNIT_PURCHASE"
    | "ACCESSORY_SALE"
    | "ACCESSORY_PURCHASE"
    | "CASHFLOW"
    | "IMBURSEMENT";
  referenceId: number;
  gapAmount: number;
  actionNote: string;
  transactionDate: Date;
}

export async function insertLedgerRow(
  tx: Prisma.TransactionClient,
  params: LedgerInsertParams
) {
  if (params.gapAmount === 0) return;

  // Retrieve the latest ledger entry to calculate beforeAmount
  const latestLedger = await tx.ledger.findFirst({
    orderBy: { id: "desc" },
  });

  const beforeAmount = latestLedger ? latestLedger.afterAmount : BigInt(0);
  const gapAmountBigInt = BigInt(Math.round(params.gapAmount));
  const afterAmount = beforeAmount + gapAmountBigInt;

  await tx.ledger.create({
    data: {
      actionType: params.actionType,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      beforeAmount,
      afterAmount,
      gapAmount: gapAmountBigInt,
      actionNote: params.actionNote,
      transactionDate: params.transactionDate,
    },
  });
}
