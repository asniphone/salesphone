// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// type LedgerSeed = {
//   date: Date;
//   data: AccessorySale | AccessoryPurchase | Unit | Imbursement | Cashflow;
// };

async function main() {
  console.log("🚀 Starting fix script...");

  // A. fix minus in unit
  const units = await prisma.unit.findMany();
  console.log(` Found ${units.length} units`);
  for await (const unit of units) {
    const soldPrice = unit.soldPrice || 0;
    const buyPrice = unit.buyPrice || 0;
    const workerFee = unit.workerFee || 0;
    const grossProfit = soldPrice - buyPrice;
    const netProfit = grossProfit - workerFee;

    await prisma.unit.update({
      where: { id: unit.id },
      data: {
        grossProfit,
        netProfit,
        updatedAt: unit.updatedAt,
      },
    });
    console.log(`✅ Updated unit ${unit.name}`);
  }

  // B. add to ledger
  await prisma.ledger.deleteMany();

  const [
    cashflowLogs,
    imbursementLogs,
    accessoryLogs,
    unitLogs,
    unitRows,
    workers,
    cashflowRows,
    imbursementRows,
    accessoryPurchases,
    accessorySales,
  ] = await Promise.all([
    prisma.cashflowLog.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.imbursementLog.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.accessoryLog.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.unitLog.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.unit.findMany(),
    prisma.worker.findMany(),
    prisma.cashflow.findMany(),
    prisma.imbursement.findMany(),
    prisma.accessoryPurchase.findMany(),
    prisma.accessorySale.findMany({
      include: { items: true },
    }),
  ]);

  const unitMap = new Map(unitRows.map((u) => [u.id, u]));
  const workerMap = new Map(workers.map((w) => [w.id, w]));
  const cashflowMap = new Map(cashflowRows.map((c) => [c.id, c]));
  const imbursementMap = new Map(imbursementRows.map((i) => [i.id, i]));
  const purchaseMap = new Map(accessoryPurchases.map((p) => [p.id, p]));
  const saleMap = new Map(accessorySales.map((s) => [s.id, s]));

  const purchaseTotalState = new Map();
  const saleTotalState = new Map();
  const seenSaleCreate = new Set();

  const events = [];

  // CASHFLOW events (same formula as src/actions/cashflow.ts)
  for (const log of cashflowLogs) {
    const amountBefore = log.amountBefore ?? 0;
    const amountAfter = log.amountAfter ?? 0;
    const typeBefore = log.cashflowTypeBefore;
    const typeAfter = log.cashflowTypeAfter;
    const note = (log.noteAfter ?? log.noteBefore ?? "").trim();

    if (log.logType === "CREATE" && typeAfter) {
      const gapAmount = typeAfter === "INCOME" ? amountAfter : -amountAfter;
      if (gapAmount !== 0) {
        events.push({
          createdAt: log.createdAt,
          actionType: "CREATE",
          referenceType: "CASHFLOW",
          referenceId: log.cashflowId,
          gapAmount,
          actionNote: `Cashflow ${typeAfter === "INCOME" ? "Masuk" : "Keluar"}: ${note}`,
          transactionDate: log.transactionDateAfter ?? log.createdAt,
        });
      }
      continue;
    }

    if (log.logType === "UPDATE") {
      const oldGap = typeBefore === "INCOME" ? amountBefore : -amountBefore;
      const newGap = typeAfter === "INCOME" ? amountAfter : -amountAfter;
      const gapAmount = newGap - oldGap;
      if (gapAmount !== 0) {
        events.push({
          createdAt: log.createdAt,
          actionType: "UPDATE",
          referenceType: "CASHFLOW",
          referenceId: log.cashflowId,
          gapAmount,
          actionNote: `Edit Cashflow ${typeAfter === "INCOME" ? "Masuk" : "Keluar"}: ${note}`,
          transactionDate: log.transactionDateAfter ?? log.transactionDateBefore ?? log.createdAt,
        });
      }
      continue;
    }

    if (log.logType === "DELETE" && typeBefore) {
      const gapAmount = typeBefore === "INCOME" ? -amountBefore : amountBefore;
      if (gapAmount !== 0) {
        events.push({
          createdAt: log.createdAt,
          actionType: "DELETE",
          referenceType: "CASHFLOW",
          referenceId: log.cashflowId,
          gapAmount,
          actionNote: `Hapus Cashflow ${typeBefore === "INCOME" ? "Masuk" : "Keluar"}: ${log.noteBefore ?? ""}`,
          transactionDate: log.transactionDateBefore ?? log.createdAt,
        });
      }
    }
  }

  // IMBURSEMENT events (same formula as src/actions/imbursement.ts)
  for (const log of imbursementLogs) {
    const amountBefore = log.amountBefore ?? 0;
    const amountAfter = log.amountAfter ?? 0;
    const workerAfter = log.workerIdAfter ? workerMap.get(log.workerIdAfter) : null;
    const workerBefore = log.workerIdBefore ? workerMap.get(log.workerIdBefore) : null;
    const imbursement = imbursementMap.get(log.imbursementId);

    if (log.logType === "CREATE") {
      const gapAmount = -amountAfter;
      if (gapAmount !== 0) {
        events.push({
          createdAt: log.createdAt,
          actionType: "CREATE",
          referenceType: "IMBURSEMENT",
          referenceId: log.imbursementId,
          gapAmount,
          actionNote: `Kasbon / Imbursement Worker ${workerAfter?.name ?? "Unknown"}: ${log.noteAfter ?? ""}`,
          transactionDate: log.createdAt,
        });
      }
      continue;
    }

    if (log.logType === "UPDATE") {
      const gapAmount = -(amountAfter - amountBefore);
      if (gapAmount !== 0) {
        events.push({
          createdAt: log.createdAt,
          actionType: "UPDATE",
          referenceType: "IMBURSEMENT",
          referenceId: log.imbursementId,
          gapAmount,
          actionNote: `Edit Kasbon / Imbursement Worker ${workerAfter?.name ?? "Unknown"}: ${log.noteAfter ?? ""}`,
          transactionDate: imbursement?.createdAt ?? log.createdAt,
        });
      }
      continue;
    }

    if (log.logType === "DELETE") {
      const gapAmount = +amountBefore;
      if (gapAmount !== 0) {
        events.push({
          createdAt: log.createdAt,
          actionType: "DELETE",
          referenceType: "IMBURSEMENT",
          referenceId: log.imbursementId,
          gapAmount,
          actionNote: `Hapus Kasbon / Imbursement Worker ${workerBefore?.name ?? "Unknown"}`,
          transactionDate: imbursement?.createdAt ?? log.createdAt,
        });
      }
    }
  }

  // UNIT events (same formula as src/actions/unit.ts)
  for (const log of unitLogs) {
    const unit = unitMap.get(log.unitId);
    const unitName = unit?.name ?? `Unit#${log.unitId}`;
    const imei = unit?.imei ?? "Tidak ada";

    if (log.type === "CREATE") {
      const buyPrice = log.buyPriceAfter ?? 0;
      if (buyPrice > 0) {
        events.push({
          createdAt: log.createdAt,
          actionType: "CREATE",
          referenceType: "UNIT_PURCHASE",
          referenceId: log.unitId,
          gapAmount: -buyPrice,
          actionNote: `Pembelian Unit ${unitName} (IMEI: ${imei})`,
          transactionDate: unit?.buyAt ?? log.createdAt,
        });
      }
      continue;
    }

    if (log.type === "UPDATE") {
      const oldBuyPrice = log.buyPriceBefore ?? 0;
      const newBuyPrice = log.buyPriceAfter ?? 0;
      if (oldBuyPrice !== newBuyPrice) {
        events.push({
          createdAt: log.createdAt,
          actionType: "UPDATE",
          referenceType: "UNIT_PURCHASE",
          referenceId: log.unitId,
          gapAmount: -(newBuyPrice - oldBuyPrice),
          actionNote: `Edit Harga Beli Unit ${unitName} (IMEI: ${imei})`,
          transactionDate: unit?.buyAt ?? log.createdAt,
        });
      }

      const oldEffective = (log.soldPriceBefore ?? 0) || (log.dpAmountBefore ?? 0);
      const newEffective = (log.soldPriceAfter ?? 0) || (log.dpAmountAfter ?? 0);
      const oldStatus = log.statusBefore;
      const newStatus = log.statusAfter;

      if (oldStatus !== "SOLD" && newStatus === "SOLD" && newEffective !== 0) {
        events.push({
          createdAt: log.createdAt,
          actionType: "CREATE",
          referenceType: "UNIT_SALE",
          referenceId: log.unitId,
          gapAmount: +newEffective,
          actionNote: `Penjualan Unit ${unitName} (IMEI: ${imei})`,
          transactionDate: unit?.soldAt ?? log.createdAt,
        });
      } else if (oldStatus === "SOLD" && newStatus !== "SOLD" && oldEffective !== 0) {
        events.push({
          createdAt: log.createdAt,
          actionType: "DELETE",
          referenceType: "UNIT_SALE",
          referenceId: log.unitId,
          gapAmount: -oldEffective,
          actionNote: `Batal Jual Unit ${unitName} (IMEI: ${imei})`,
          transactionDate: unit?.soldAt ?? log.createdAt,
        });
      } else if (oldStatus === "SOLD" && newStatus === "SOLD" && oldEffective !== newEffective) {
        events.push({
          createdAt: log.createdAt,
          actionType: "UPDATE",
          referenceType: "UNIT_SALE",
          referenceId: log.unitId,
          gapAmount: +(newEffective - oldEffective),
          actionNote: `Edit Harga Jual Unit ${unitName} (IMEI: ${imei})`,
          transactionDate: unit?.soldAt ?? log.createdAt,
        });
      }
    }
  }

  // ACCESSORY PURCHASE / SALE events from accessory logs
  const parseQtyPrice = (text) => {
    if (!text) return null;
    const match = text.match(/(\d+)\s*unit\s*@\s*(\d+)/i);
    if (!match) return null;
    return { qty: Number(match[1]), price: Number(match[2]) };
  };

  for (const log of accessoryLogs) {
    if (log.kind === "PURCHASE" && log.purchaseId) {
      const purchase = purchaseMap.get(log.purchaseId);
      const parsed = parseQtyPrice(log.logNote ?? "");

      if (log.type === "UPDATE" && !purchaseTotalState.has(log.purchaseId)) {
        // addAccessoryPurchase() logs CREATE as type UPDATE in accessoryLog
        const createdTotal = parsed
          ? parsed.qty * parsed.price
          : purchase?.buyPriceTotal ?? 0;
        purchaseTotalState.set(log.purchaseId, createdTotal);
        if (createdTotal !== 0) {
          events.push({
            createdAt: log.createdAt,
            actionType: "CREATE",
            referenceType: "ACCESSORY_PURCHASE",
            referenceId: log.purchaseId,
            gapAmount: -createdTotal,
            actionNote: `Pembelian Aksesoris (Purchase #${log.purchaseId})`,
            transactionDate: log.createdAt,
          });
        }
        continue;
      }

      if (log.type === "UPDATE") {
        let oldTotal = purchaseTotalState.get(log.purchaseId);
        let newTotal = purchase?.buyPriceTotal ?? oldTotal ?? 0;
        const editMatch = (log.logNote ?? "").match(
          /(\d+)\s*unit\s*→\s*(\d+)\s*unit,\s*@(\d+)\s*→\s*@(\d+)/i,
        );
        if (editMatch) {
          oldTotal = Number(editMatch[1]) * Number(editMatch[3]);
          newTotal = Number(editMatch[2]) * Number(editMatch[4]);
        }
        if (oldTotal == null) oldTotal = 0;
        const gapAmount = -(newTotal - oldTotal);
        purchaseTotalState.set(log.purchaseId, newTotal);
        if (gapAmount !== 0) {
          events.push({
            createdAt: log.createdAt,
            actionType: "UPDATE",
            referenceType: "ACCESSORY_PURCHASE",
            referenceId: log.purchaseId,
            gapAmount,
            actionNote: `Edit Pembelian Aksesoris #${log.purchaseId}`,
            transactionDate: purchase?.createdAt ?? log.createdAt,
          });
        }
        continue;
      }

      if (log.type === "DELETE") {
        const knownTotal =
          purchaseTotalState.get(log.purchaseId) ??
          (parsed ? parsed.qty * parsed.price : purchase?.buyPriceTotal ?? 0);
        purchaseTotalState.delete(log.purchaseId);
        if (knownTotal !== 0) {
          events.push({
            createdAt: log.createdAt,
            actionType: "DELETE",
            referenceType: "ACCESSORY_PURCHASE",
            referenceId: log.purchaseId,
            gapAmount: +knownTotal,
            actionNote: `Hapus Pembelian Aksesoris #${log.purchaseId}`,
            transactionDate: purchase?.createdAt ?? log.createdAt,
          });
        }
      }
      continue;
    }

    if (log.kind === "SALE" && log.saleId) {
      const sale = saleMap.get(log.saleId);
      if (!sale) continue;

      if (log.type === "UPDATE" && !seenSaleCreate.has(log.saleId)) {
        // createAccessorySale() writes accessoryLog type UPDATE kind SALE per item
        const saleTotal = sale.totalPrice;
        saleTotalState.set(log.saleId, saleTotal);
        seenSaleCreate.add(log.saleId);
        if (saleTotal !== 0) {
          events.push({
            createdAt: log.createdAt,
            actionType: "CREATE",
            referenceType: "ACCESSORY_SALE",
            referenceId: log.saleId,
            gapAmount: +saleTotal,
            actionNote: `Penjualan Aksesoris #${log.saleId}`,
            transactionDate: sale.createdAt ?? log.createdAt,
          });
        }
        continue;
      }

      if (log.type === "DELETE") {
        const knownTotal = saleTotalState.get(log.saleId) ?? sale.totalPrice ?? 0;
        saleTotalState.delete(log.saleId);
        if (knownTotal !== 0) {
          events.push({
            createdAt: log.createdAt,
            actionType: "DELETE",
            referenceType: "ACCESSORY_SALE",
            referenceId: log.saleId,
            gapAmount: -knownTotal,
            actionNote: `Hapus Penjualan Aksesoris #${log.saleId}`,
            transactionDate: sale.createdAt ?? log.createdAt,
          });
        }
      }
    }
  }

  events.sort((a, b) => {
    const t = a.createdAt.getTime() - b.createdAt.getTime();
    if (t !== 0) return t;
    return a.referenceId - b.referenceId;
  });

  console.log(` Found ${events.length} ledger seeds`);

  let currentAmount = BigInt(0);
  for (const e of events) {
    if (!e.gapAmount) continue;
    const gapAmount = BigInt(Math.round(e.gapAmount));
    const beforeAmount = currentAmount;
    const afterAmount = beforeAmount + gapAmount;

    await prisma.ledger.create({
      data: {
        actionType: e.actionType,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
        beforeAmount,
        afterAmount,
        gapAmount,
        actionNote: e.actionNote,
        transactionDate: e.transactionDate,
        createdAt: e.createdAt,
      },
    });

    currentAmount = afterAmount;
  }

  console.log(` Done ${events.length} ledger seeds`);
}

main();
