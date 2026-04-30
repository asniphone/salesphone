"use server";

import type { CashflowType, Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/constants/cache-tag";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export type CashflowListItem = Prisma.CashflowGetPayload<{
  include: {
    _count: {
      select: {
        cashflowLogs: true;
      };
    };
  };
}>;

export type CashflowDetail = Prisma.CashflowGetPayload<{
  include: {
    cashflowLogs: {
      include: {
        user: {
          omit: {
            password: true;
          };
        };
      };
    };
  };
}>;

interface CashflowSummary {
  income: number;
  expense: number;
  net: number;
}

interface PaginatedCashflows {
  cashflows: CashflowListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: CashflowSummary;
}

interface GetCashflowsParams {
  search?: string;
  type?: CashflowType;
  sortBy?: "transactionDate" | "createdAt" | "updatedAt" | "amount" | "note";
  sortOrder?: "asc" | "desc";
  dateTarget?: "transactionDate" | "createdAt";
  dateRangeFrom?: string;
  dateRangeTo?: string;
  page?: number;
  pageSize?: number;
}

interface CashflowMutationInput {
  type: CashflowType;
  amount: number;
  note: string;
  transactionDate: Date;
  imageAttachments?: string[];
}

async function requireUserId(): Promise<number> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  return session.userId;
}

function createDateRange(
  dateRangeFrom?: string,
  dateRangeTo?: string,
): Prisma.DateTimeFilter | undefined {
  if (!dateRangeFrom) {
    return undefined;
  }

  const fromDate = new Date(dateRangeFrom);
  if (Number.isNaN(fromDate.getTime())) {
    return undefined;
  }

  const startOfDay = new Date(fromDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(fromDate);
  endOfDay.setHours(23, 59, 59, 999);

  if (dateRangeTo) {
    const toDate = new Date(dateRangeTo);
    if (!Number.isNaN(toDate.getTime())) {
      endOfDay.setTime(toDate.getTime());
      endOfDay.setHours(23, 59, 59, 999);
    }
  }

  return {
    gte: startOfDay,
    lte: endOfDay,
  };
}

function buildCashflowWhere({
  search,
  type,
  dateTarget,
  dateRangeFrom,
  dateRangeTo,
}: Pick<
  GetCashflowsParams,
  "search" | "type" | "dateTarget" | "dateRangeFrom" | "dateRangeTo"
>): Prisma.CashflowWhereInput {
  const where: Prisma.CashflowWhereInput = {
    deletedAt: null,
  };

  if (type) {
    where.type = type;
  }

  if (search) {
    where.note = {
      contains: search,
      mode: "insensitive",
    };
  }

  const dateFilter = createDateRange(dateRangeFrom, dateRangeTo);
  if (dateTarget && dateFilter) {
    where[dateTarget] = dateFilter;
  }

  return where;
}

function validateCashflowInput(input: CashflowMutationInput): string | null {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return "Nominal harus lebih besar dari 0.";
  }

  if (!input.note.trim()) {
    return "Catatan wajib diisi.";
  }

  if (Number.isNaN(input.transactionDate.getTime())) {
    return "Tanggal transaksi tidak valid.";
  }

  return null;
}

export async function getCashflows(
  params: GetCashflowsParams = {},
): Promise<ActionResult<PaginatedCashflows>> {
  try {
    const {
      search,
      type,
      sortBy = "transactionDate",
      sortOrder = "desc",
      dateTarget,
      dateRangeFrom,
      dateRangeTo,
      page = 1,
      pageSize = 10,
    } = params;

    const where = buildCashflowWhere({
      search,
      type,
      dateTarget,
      dateRangeFrom,
      dateRangeTo,
    });

    const [total, cashflows, groupedSummary] = await Promise.all([
      prisma.cashflow.count({ where }),
      prisma.cashflow.findMany({
        where,
        include: {
          _count: {
            select: {
              cashflowLogs: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.cashflow.groupBy({
        by: ["type"],
        where,
        _sum: {
          amount: true,
        },
      }),
    ]);

    const income =
      groupedSummary.find((entry) => entry.type === "INCOME")?._sum.amount ?? 0;
    const expense =
      groupedSummary.find((entry) => entry.type === "EXPENSE")?._sum.amount ?? 0;

    return {
      success: true,
      data: {
        cashflows,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        summary: {
          income,
          expense,
          net: income - expense,
        },
      },
    };
  } catch (error) {
    console.error("getCashflows error:", error);
    return { success: false, error: "Gagal mengambil data cashflow." };
  }
}

export async function getCashflowDetail(
  id: number,
): Promise<ActionResult<CashflowDetail | null>> {
  try {
    const cashflow = await prisma.cashflow.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        cashflowLogs: {
          include: {
            user: {
              omit: {
                password: true,
              },
            },
          },
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return {
      success: true,
      data: cashflow,
    };
  } catch (error) {
    console.error("getCashflowDetail error:", error);
    return { success: false, error: "Gagal mengambil detail cashflow." };
  }
}

export async function createCashflow(
  input: CashflowMutationInput,
): Promise<ActionResult<CashflowListItem>> {
  try {
    const validationError = validateCashflowInput(input);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const userId = await requireUserId();

    const cashflow = await prisma.$transaction(async (tx) => {
      const created = await tx.cashflow.create({
        data: {
          type: input.type,
          amount: input.amount,
          note: input.note.trim(),
          transactionDate: input.transactionDate,
          imageAttachments: input.imageAttachments ?? [],
        },
        include: {
          _count: {
            select: {
              cashflowLogs: true,
            },
          },
        },
      });

      await tx.cashflowLog.create({
        data: {
          cashflowId: created.id,
          logType: "CREATE",
          userId,
          amountAfter: created.amount,
          noteAfter: created.note,
          imageAttachmentsBefore: [],
          imageAttachmentsAfter: created.imageAttachments,
          cashflowTypeAfter: created.type,
          transactionDateAfter: created.transactionDate,
          logActionNote: "Transaksi cashflow ditambahkan",
        },
      });

      return created;
    });

    revalidateTag(CACHE_TAG.CASHFLOW);
    revalidateTag(CACHE_TAG.CASHFLOW_LOG);

    return { success: true, data: cashflow };
  } catch (error) {
    console.error("createCashflow error:", error);
    return { success: false, error: "Gagal menambahkan cashflow." };
  }
}

export async function updateCashflow(
  id: number,
  input: CashflowMutationInput,
): Promise<ActionResult<CashflowListItem>> {
  try {
    const validationError = validateCashflowInput(input);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const userId = await requireUserId();

    const cashflow = await prisma.$transaction(async (tx) => {
      const existing = await tx.cashflow.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      const updated = await tx.cashflow.update({
        where: { id },
        data: {
          type: input.type,
          amount: input.amount,
          note: input.note.trim(),
          transactionDate: input.transactionDate,
          imageAttachments: input.imageAttachments ?? [],
        },
        include: {
          _count: {
            select: {
              cashflowLogs: true,
            },
          },
        },
      });

      await tx.cashflowLog.create({
        data: {
          cashflowId: updated.id,
          logType: "UPDATE",
          userId,
          amountBefore: existing.amount,
          amountAfter: updated.amount,
          noteBefore: existing.note,
          noteAfter: updated.note,
          imageAttachmentsBefore: existing.imageAttachments,
          imageAttachmentsAfter: updated.imageAttachments,
          cashflowTypeBefore: existing.type,
          cashflowTypeAfter: updated.type,
          transactionDateBefore: existing.transactionDate,
          transactionDateAfter: updated.transactionDate,
          logActionNote: "Transaksi cashflow diperbarui",
        },
      });

      return updated;
    });

    revalidateTag(CACHE_TAG.CASHFLOW);
    revalidateTag(CACHE_TAG.CASHFLOW_LOG);

    return { success: true, data: cashflow };
  } catch (error) {
    console.error("updateCashflow error:", error);

    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { success: false, error: "Data cashflow tidak ditemukan." };
    }

    return { success: false, error: "Gagal memperbarui cashflow." };
  }
}

export async function deleteCashflow(
  id: number,
): Promise<ActionResult<{ id: number }>> {
  try {
    const userId = await requireUserId();

    await prisma.$transaction(async (tx) => {
      const existing = await tx.cashflow.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      await tx.cashflowLog.create({
        data: {
          cashflowId: existing.id,
          logType: "DELETE",
          userId,
          amountBefore: existing.amount,
          noteBefore: existing.note,
          imageAttachmentsBefore: existing.imageAttachments,
          imageAttachmentsAfter: [],
          cashflowTypeBefore: existing.type,
          transactionDateBefore: existing.transactionDate,
          logActionNote: "Transaksi cashflow dihapus",
        },
      });

      await tx.cashflow.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    });

    revalidateTag(CACHE_TAG.CASHFLOW);
    revalidateTag(CACHE_TAG.CASHFLOW_LOG);

    return { success: true, data: { id } };
  } catch (error) {
    console.error("deleteCashflow error:", error);

    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { success: false, error: "Data cashflow tidak ditemukan." };
    }

    return { success: false, error: "Gagal menghapus cashflow." };
  }
}
