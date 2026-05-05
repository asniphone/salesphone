"use server";

import type { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/constants/cache-tag";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { insertLedgerRow } from "./ledger";

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ImbursementListItem = Prisma.ImbursementGetPayload<{
  include: {
    worker: true;
    _count: {
      select: {
        imbursementLogs: true;
      };
    };
  };
}>;

export type ImbursementDetail = Prisma.ImbursementGetPayload<{
  include: {
    worker: true;
    imbursementLogs: {
      include: {
        user: {
          omit: {
            password: true;
          };
        };
        workerBefore: true;
        workerAfter: true;
      };
    };
  };
}>;

export interface WorkerImbursementOption {
  id: number;
  name: string;
  phone: string;
  isActive: boolean;
  writtenFee: number;
  reimbursed: number;
  remaining: number;
}

interface ImbursementSummary {
  writtenFee: number;
  reimbursed: number;
  remaining: number;
}

interface PaginatedImbursements {
  imbursements: ImbursementListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: ImbursementSummary;
}

interface GetImbursementsParams {
  search?: string;
  workerId?: number;
  sortBy?: "createdAt" | "updatedAt" | "amount" | "note";
  sortOrder?: "asc" | "desc";
  dateTarget?: "createdAt" | "updatedAt";
  dateRangeFrom?: string;
  dateRangeTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ImbursementMutationInput {
  workerId: number;
  amount: number;
  note: string;
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
  if (!dateRangeFrom) return undefined;

  const fromDate = new Date(dateRangeFrom);
  if (Number.isNaN(fromDate.getTime())) return undefined;

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

  return { gte: startOfDay, lte: endOfDay };
}

function buildImbursementWhere({
  search,
  workerId,
  dateTarget,
  dateRangeFrom,
  dateRangeTo,
}: Pick<
  GetImbursementsParams,
  "search" | "workerId" | "dateTarget" | "dateRangeFrom" | "dateRangeTo"
>): Prisma.ImbursementWhereInput {
  const where: Prisma.ImbursementWhereInput = { deletedAt: null };

  if (workerId) {
    where.workerId = workerId;
  }

  if (search) {
    where.OR = [
      { note: { contains: search, mode: "insensitive" } },
      { worker: { name: { contains: search, mode: "insensitive" } } },
      { worker: { phone: { contains: search, mode: "insensitive" } } },
    ];
  }

  const dateFilter = createDateRange(dateRangeFrom, dateRangeTo);
  if (dateTarget && dateFilter) {
    where[dateTarget] = dateFilter;
  }

  return where;
}

function validateInput(input: ImbursementMutationInput): string | null {
  if (!Number.isInteger(input.workerId) || input.workerId <= 0) {
    return "Worker wajib dipilih.";
  }

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return "Nominal pencairan harus lebih besar dari 0.";
  }

  if (!input.note.trim()) {
    return "Catatan wajib diisi.";
  }

  return null;
}

async function getWrittenFeeByWorker(
  tx: Prisma.TransactionClient,
  workerId: number,
): Promise<number> {
  const [unitFee, accessoryFee] = await Promise.all([
    tx.unit.aggregate({
      where: {
        deletedAt: null,
        status: "SOLD",
        workerId,
      },
      _sum: {
        workerFee: true,
      },
    }),
    tx.accessorySale.aggregate({
      where: {
        deletedAt: null,
        workerId,
      },
      _sum: {
        feeWorker: true,
      },
    }),
  ]);

  return (unitFee._sum.workerFee ?? 0) + (accessoryFee._sum.feeWorker ?? 0);
}

async function getReimbursedByWorker(
  tx: Prisma.TransactionClient,
  workerId: number,
): Promise<number> {
  const reimbursed = await tx.imbursement.aggregate({
    where: {
      deletedAt: null,
      workerId,
    },
    _sum: {
      amount: true,
    },
  });

  return reimbursed._sum.amount ?? 0;
}

async function getWorkerRemainingFee(
  tx: Prisma.TransactionClient,
  workerId: number,
): Promise<number> {
  const [writtenFee, reimbursed] = await Promise.all([
    getWrittenFeeByWorker(tx, workerId),
    getReimbursedByWorker(tx, workerId),
  ]);

  return writtenFee - reimbursed;
}

async function getGlobalSummary(): Promise<ImbursementSummary> {
  const [unitFee, accessoryFee, reimbursed] = await Promise.all([
    prisma.unit.aggregate({
      where: {
        deletedAt: null,
        status: "SOLD",
        workerId: { not: null },
      },
      _sum: {
        workerFee: true,
      },
    }),
    prisma.accessorySale.aggregate({
      where: {
        deletedAt: null,
      },
      _sum: {
        feeWorker: true,
      },
    }),
    prisma.imbursement.aggregate({
      where: {
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const writtenFee =
    (unitFee._sum.workerFee ?? 0) + (accessoryFee._sum.feeWorker ?? 0);
  const reimbursedAmount = reimbursed._sum.amount ?? 0;

  return {
    writtenFee,
    reimbursed: reimbursedAmount,
    remaining: writtenFee - reimbursedAmount,
  };
}

export async function getImbursements(
  params: GetImbursementsParams = {},
): Promise<ActionResult<PaginatedImbursements>> {
  try {
    const {
      search,
      workerId,
      sortBy = "createdAt",
      sortOrder = "desc",
      dateTarget = "createdAt",
      dateRangeFrom,
      dateRangeTo,
      page = 1,
      pageSize = 10,
    } = params;

    const where = buildImbursementWhere({
      search,
      workerId,
      dateTarget,
      dateRangeFrom,
      dateRangeTo,
    });

    const [total, imbursements, summary] = await Promise.all([
      prisma.imbursement.count({ where }),
      prisma.imbursement.findMany({
        where,
        include: {
          worker: true,
          _count: {
            select: {
              imbursementLogs: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      getGlobalSummary(),
    ]);

    return {
      success: true,
      data: {
        imbursements,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        summary,
      },
    };
  } catch (error) {
    console.error("getImbursements error:", error);
    return { success: false, error: "Gagal mengambil data pencairan fee." };
  }
}

export async function getImbursementDetail(
  id: number,
): Promise<ActionResult<ImbursementDetail | null>> {
  try {
    const imbursement = await prisma.imbursement.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        worker: true,
        imbursementLogs: {
          where: {
            deletedAt: null,
          },
          include: {
            user: {
              omit: {
                password: true,
              },
            },
            workerBefore: true,
            workerAfter: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return { success: true, data: imbursement };
  } catch (error) {
    console.error("getImbursementDetail error:", error);
    return { success: false, error: "Gagal mengambil detail pencairan fee." };
  }
}

export async function getImbursementWorkerOptions(): Promise<
  ActionResult<WorkerImbursementOption[]>
> {
  try {
    const workers = await prisma.worker.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
        units: {
          where: {
            deletedAt: null,
            status: "SOLD",
          },
          select: {
            workerFee: true,
          },
        },
        accessorySales: {
          where: {
            deletedAt: null,
          },
          select: {
            feeWorker: true,
          },
        },
        imbursements: {
          where: {
            deletedAt: null,
          },
          select: {
            amount: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const options = workers.map((worker) => {
      const unitFee = worker.units.reduce(
        (sum, unit) => sum + (unit.workerFee ?? 0),
        0,
      );
      const accessoryFee = worker.accessorySales.reduce(
        (sum, sale) => sum + sale.feeWorker,
        0,
      );
      const reimbursed = worker.imbursements.reduce(
        (sum, imbursement) => sum + imbursement.amount,
        0,
      );
      const writtenFee = unitFee + accessoryFee;

      return {
        id: worker.id,
        name: worker.name,
        phone: worker.phone,
        isActive: worker.isActive,
        writtenFee,
        reimbursed,
        remaining: writtenFee - reimbursed,
      };
    });

    return { success: true, data: options };
  } catch (error) {
    console.error("getImbursementWorkerOptions error:", error);
    return { success: false, error: "Gagal mengambil opsi worker." };
  }
}

export async function createImbursement(
  input: ImbursementMutationInput,
): Promise<ActionResult<ImbursementListItem>> {
  try {
    const validationError = validateInput(input);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const userId = await requireUserId();

    const imbursement = await prisma.$transaction(async (tx) => {
      const worker = await tx.worker.findFirst({
        where: {
          id: input.workerId,
          deletedAt: null,
        },
      });

      if (!worker) {
        throw new Error("WORKER_NOT_FOUND");
      }

      const remaining = await getWorkerRemainingFee(tx, input.workerId);
      if (input.amount > remaining) {
        throw new Error("AMOUNT_EXCEEDS_REMAINING");
      }

      const created = await tx.imbursement.create({
        data: {
          workerId: input.workerId,
          amount: input.amount,
          note: input.note.trim(),
        },
        include: {
          worker: true,
          _count: {
            select: {
              imbursementLogs: true,
            },
          },
        },
      });

      await tx.imbursementLog.create({
        data: {
          imbursementId: created.id,
          logType: "CREATE",
          userId,
          amountAfter: created.amount,
          noteAfter: created.note,
          workerIdAfter: created.workerId,
          logActionNote: "Pencairan fee worker ditambahkan",
        },
      });

      await insertLedgerRow(tx, {
        actionType: "CREATE",
        referenceType: "IMBURSEMENT",
        referenceId: created.id,
        gapAmount: -input.amount,
        actionNote: `Kasbon / Imbursement Worker ${worker.name}: ${input.note}`,
        transactionDate: new Date(),
      });

      return created;
    });

    revalidateTag(CACHE_TAG.IMBURSEMENT);
    revalidateTag(CACHE_TAG.IMBURSEMENT_LOG);
    revalidateTag(CACHE_TAG.WORKER);

    return { success: true, data: imbursement };
  } catch (error) {
    console.error("createImbursement error:", error);

    if (error instanceof Error && error.message === "WORKER_NOT_FOUND") {
      return { success: false, error: "Worker tidak ditemukan." };
    }
    if (error instanceof Error && error.message === "AMOUNT_EXCEEDS_REMAINING") {
      return {
        success: false,
        error: "Nominal pencairan melebihi sisa fee worker yang belum cair.",
      };
    }

    return { success: false, error: "Gagal menambahkan pencairan fee." };
  }
}

export async function updateImbursement(
  id: number,
  input: ImbursementMutationInput,
): Promise<ActionResult<ImbursementListItem>> {
  try {
    const validationError = validateInput(input);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const userId = await requireUserId();

    const imbursement = await prisma.$transaction(async (tx) => {
      const existing = await tx.imbursement.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      const worker = await tx.worker.findFirst({
        where: {
          id: input.workerId,
          deletedAt: null,
        },
      });

      if (!worker) {
        throw new Error("WORKER_NOT_FOUND");
      }

      const remaining = await getWorkerRemainingFee(tx, input.workerId);
      const editableRemaining =
        existing.workerId === input.workerId ? remaining + existing.amount : remaining;

      if (input.amount > editableRemaining) {
        throw new Error("AMOUNT_EXCEEDS_REMAINING");
      }

      const updated = await tx.imbursement.update({
        where: { id },
        data: {
          workerId: input.workerId,
          amount: input.amount,
          note: input.note.trim(),
        },
        include: {
          worker: true,
          _count: {
            select: {
              imbursementLogs: true,
            },
          },
        },
      });

      await tx.imbursementLog.create({
        data: {
          imbursementId: updated.id,
          logType: "UPDATE",
          userId,
          amountBefore: existing.amount,
          amountAfter: updated.amount,
          noteBefore: existing.note,
          noteAfter: updated.note,
          workerIdBefore: existing.workerId,
          workerIdAfter: updated.workerId,
          logActionNote: "Pencairan fee worker diperbarui",
        },
      });

      if (existing.amount !== input.amount || existing.workerId !== input.workerId) {
        await insertLedgerRow(tx, {
          actionType: "UPDATE",
          referenceType: "IMBURSEMENT",
          referenceId: updated.id,
          gapAmount: -(input.amount - existing.amount),
          actionNote: `Edit Kasbon / Imbursement Worker ${worker.name}: ${input.note}`,
          transactionDate: existing.createdAt,
        });
      }

      return updated;
    });

    revalidateTag(CACHE_TAG.IMBURSEMENT);
    revalidateTag(CACHE_TAG.IMBURSEMENT_LOG);
    revalidateTag(CACHE_TAG.WORKER);

    return { success: true, data: imbursement };
  } catch (error) {
    console.error("updateImbursement error:", error);

    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { success: false, error: "Data pencairan fee tidak ditemukan." };
    }
    if (error instanceof Error && error.message === "WORKER_NOT_FOUND") {
      return { success: false, error: "Worker tidak ditemukan." };
    }
    if (error instanceof Error && error.message === "AMOUNT_EXCEEDS_REMAINING") {
      return {
        success: false,
        error: "Nominal pencairan melebihi sisa fee worker yang belum cair.",
      };
    }

    return { success: false, error: "Gagal memperbarui pencairan fee." };
  }
}

export async function deleteImbursement(
  id: number,
): Promise<ActionResult<{ id: number }>> {
  try {
    const userId = await requireUserId();

    await prisma.$transaction(async (tx) => {
      const existing = await tx.imbursement.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      await tx.imbursementLog.create({
        data: {
          imbursementId: existing.id,
          logType: "DELETE",
          userId,
          amountBefore: existing.amount,
          noteBefore: existing.note,
          workerIdBefore: existing.workerId,
          logActionNote: "Pencairan fee worker dihapus",
        },
      });

      await tx.imbursement.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      const worker = await tx.worker.findFirst({ where: { id: existing.workerId } });

      await insertLedgerRow(tx, {
        actionType: "DELETE",
        referenceType: "IMBURSEMENT",
        referenceId: existing.id,
        gapAmount: +existing.amount,
        actionNote: `Hapus Kasbon / Imbursement Worker ${worker?.name || "Unknown"}`,
        transactionDate: existing.createdAt,
      });

    });

    revalidateTag(CACHE_TAG.IMBURSEMENT);
    revalidateTag(CACHE_TAG.IMBURSEMENT_LOG);
    revalidateTag(CACHE_TAG.WORKER);

    return { success: true, data: { id } };
  } catch (error) {
    console.error("deleteImbursement error:", error);

    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { success: false, error: "Data pencairan fee tidak ditemukan." };
    }

    return { success: false, error: "Gagal menghapus pencairan fee." };
  }
}
