"use server";

import type { LedgerActionType, Prisma, ReferenceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LedgerListItem {
  id: string;
  actionType: LedgerActionType;
  referenceType: ReferenceType;
  referenceId: number;
  beforeAmount: string;
  afterAmount: string;
  gapAmount: string;
  actionNote: string;
  transactionDate: string;
  createdAt: string;
}

interface LedgerSummary {
  currentBalance: string;
  totalIn: string;
  totalOut: string;
}

interface PaginatedLedgers {
  ledgers: LedgerListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: LedgerSummary;
}

interface GetLedgersParams {
  search?: string;
  actionType?: LedgerActionType;
  referenceType?: ReferenceType;
  sortBy?: "createdAt" | "transactionDate" | "id" | "gapAmount";
  sortOrder?: "asc" | "desc";
  dateTarget?: "createdAt" | "transactionDate";
  dateRangeFrom?: string;
  dateRangeTo?: string;
  page?: number;
  pageSize?: number;
}

export interface LedgerReferenceDetail {
  ledger: LedgerListItem;
  reference: {
    title: string;
    description?: string;
    items: Array<{ label: string; value: string }>;
  };
}

function toLedgerListItem(
  row: Prisma.LedgerGetPayload<object>,
): LedgerListItem {
  return {
    id: row.id.toString(),
    actionType: row.actionType,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    beforeAmount: row.beforeAmount.toString(),
    afterAmount: row.afterAmount.toString(),
    gapAmount: row.gapAmount.toString(),
    actionNote: row.actionNote,
    transactionDate: row.transactionDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function createDateRange(
  dateRangeFrom?: string,
  dateRangeTo?: string,
): Prisma.DateTimeFilter | undefined {
  if (!dateRangeFrom) return undefined;
  const fromDate = new Date(dateRangeFrom);
  if (Number.isNaN(fromDate.getTime())) return undefined;

  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(fromDate);
  end.setHours(23, 59, 59, 999);

  if (dateRangeTo) {
    const toDate = new Date(dateRangeTo);
    if (!Number.isNaN(toDate.getTime())) {
      end.setTime(toDate.getTime());
      end.setHours(23, 59, 59, 999);
    }
  }

  return { gte: start, lte: end };
}

function buildWhere(params: GetLedgersParams): Prisma.LedgerWhereInput {
  const where: Prisma.LedgerWhereInput = {};
  if (params.search) {
    where.actionNote = { contains: params.search, mode: "insensitive" };
  }
  if (params.actionType) where.actionType = params.actionType;
  if (params.referenceType) where.referenceType = params.referenceType;

  const dateFilter = createDateRange(params.dateRangeFrom, params.dateRangeTo);
  if (params.dateTarget && dateFilter) {
    where[params.dateTarget] = dateFilter;
  }
  return where;
}

export async function getLedgers(
  params: GetLedgersParams = {},
): Promise<ActionResult<PaginatedLedgers>> {
  try {
    const {
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      pageSize = 10,
    } = params;
    const where = buildWhere(params);

    const [total, rows, latest, grouped] = await Promise.all([
      prisma.ledger.count({ where }),
      prisma.ledger.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ledger.findFirst({ orderBy: { id: "desc" } }),
      prisma.ledger.groupBy({
        by: ["referenceType"],
        _sum: { gapAmount: true },
      }),
    ]);

    let totalIn = BigInt(0);
    let totalOut = BigInt(0);
    for (const row of grouped) {
      const value = row._sum.gapAmount ?? BigInt(0);
      if (value >= BigInt(0)) totalIn += value;
      else totalOut += value;
    }

    return {
      success: true,
      data: {
        ledgers: rows.map(toLedgerListItem),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        summary: {
          currentBalance: (latest?.afterAmount ?? BigInt(0)).toString(),
          totalIn: totalIn.toString(),
          totalOut: totalOut.toString(),
        },
      },
    };
  } catch (error) {
    console.error("getLedgers error:", error);
    return { success: false, error: "Gagal mengambil data ledger." };
  }
}

export async function getLedgerReferenceDetail(
  ledgerId: string,
): Promise<ActionResult<LedgerReferenceDetail | null>> {
  try {
    const id = BigInt(ledgerId);
    const row = await prisma.ledger.findUnique({ where: { id } });
    if (!row) return { success: true, data: null };

    const ledger = toLedgerListItem(row);
    const base: LedgerReferenceDetail = {
      ledger,
      reference: {
        title: `${row.referenceType} #${row.referenceId}`,
        items: [],
      },
    };

    if (row.referenceType === "UNIT_SALE" || row.referenceType === "UNIT_PURCHASE") {
      const unit = await prisma.unit.findUnique({
        where: { id: row.referenceId },
        include: { customer: true, worker: true },
      });
      if (!unit) return { success: true, data: base };

      base.reference = {
        title: `Unit #${unit.id} - ${unit.name}`,
        description: row.referenceType === "UNIT_SALE" ? "Penjualan Unit" : "Pembelian Unit",
        items: [
          { label: "Status", value: unit.status },
          { label: "Harga Beli", value: String(unit.buyPrice ?? 0) },
          { label: "Harga Jual", value: String(unit.soldPrice ?? 0) },
          { label: "Customer", value: unit.customer?.name ?? "-" },
          { label: "Worker", value: unit.worker?.name ?? "-" },
          { label: "Fee Worker", value: String(unit.workerFee ?? 0) },
        ],
      };
      return { success: true, data: base };
    }

    if (row.referenceType === "ACCESSORY_SALE") {
      const sale = await prisma.accessorySale.findUnique({
        where: { id: row.referenceId },
        include: {
          customer: true,
          worker: true,
          items: { include: { accessory: true } },
        },
      });
      if (!sale) return { success: true, data: base };
      base.reference = {
        title: `Penjualan Aksesoris #${sale.id}`,
        items: [
          { label: "Customer", value: sale.customer?.name ?? "-" },
          { label: "Worker", value: sale.worker.name },
          { label: "Subtotal", value: String(sale.items.reduce((s, i) => s + i.sellPricePerUnit * i.quantity, 0)) },
          { label: "Diskon", value: String(sale.discount) },
          { label: "Total Harga", value: String(sale.totalPrice) },
          { label: "Total Profit", value: String(sale.totalProfit) },
          { label: "Fee Worker", value: String(sale.feeWorker) },
          { label: "Jumlah Item", value: String(sale.items.length) },
        ],
      };
      return { success: true, data: base };
    }

    if (row.referenceType === "ACCESSORY_PURCHASE") {
      const purchase = await prisma.accessoryPurchase.findUnique({
        where: { id: row.referenceId },
        include: { accessory: true },
      });
      if (!purchase) return { success: true, data: base };
      base.reference = {
        title: `Pembelian Aksesoris #${purchase.id}`,
        items: [
          { label: "Produk", value: purchase.accessory.name },
          { label: "Quantity", value: String(purchase.quantity) },
          { label: "Harga Beli/Unit", value: String(purchase.buyPricePerUnit) },
          { label: "Total Beli", value: String(purchase.buyPriceTotal) },
          { label: "Catatan", value: purchase.note ?? "-" },
        ],
      };
      return { success: true, data: base };
    }

    if (row.referenceType === "CASHFLOW") {
      const cashflow = await prisma.cashflow.findUnique({
        where: { id: row.referenceId },
      });
      if (!cashflow) return { success: true, data: base };
      base.reference = {
        title: `Cashflow #${cashflow.id}`,
        items: [
          { label: "Tipe", value: cashflow.type },
          { label: "Nominal", value: String(cashflow.amount) },
          { label: "Catatan", value: cashflow.note },
          { label: "Tanggal Transaksi", value: cashflow.transactionDate.toISOString() },
        ],
      };
      return { success: true, data: base };
    }

    if (row.referenceType === "IMBURSEMENT") {
      const imbursement = await prisma.imbursement.findUnique({
        where: { id: row.referenceId },
        include: { worker: true },
      });
      if (!imbursement) return { success: true, data: base };
      base.reference = {
        title: `Pencairan Fee #${imbursement.id}`,
        items: [
          { label: "Worker", value: imbursement.worker.name },
          { label: "Nominal", value: String(imbursement.amount) },
          { label: "Catatan", value: imbursement.note },
        ],
      };
      return { success: true, data: base };
    }

    return { success: true, data: base };
  } catch (error) {
    console.error("getLedgerReferenceDetail error:", error);
    return { success: false, error: "Gagal mengambil detail ledger." };
  }
}
