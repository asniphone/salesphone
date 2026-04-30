"use server";

import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/constants/cache-tag";
import type { Prisma } from "@prisma/client";

// ============================================================
// Types
// ============================================================

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

interface GetWorkersParams {
  search?: string;
  isActive?: boolean;
  sortBy?: "createdAt" | "name";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  dateRangeFrom?: string;
  dateRangeTo?: string;
}

interface PaginatedWorkers {
  workers: WorkerData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type WorkerData = Prisma.WorkerGetPayload<object>;

export type WorkerWithUnits = Prisma.WorkerGetPayload<{
  include: {
    units: {
      include: {
        customer: true;
      };
      orderBy: { soldAt: "desc" };
    };
  };
}>;

// ============================================================
// READ
// ============================================================

export async function getWorkers(): Promise<ActionResult<WorkerData[]>> {
  try {
    const workers = await prisma.worker.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: workers };
  } catch (error) {
    console.error("getWorkers error:", error);
    return { success: false, error: "Gagal mengambil data worker." };
  }
}

export async function getWorkersPaginated(
  params: GetWorkersParams = {},
): Promise<ActionResult<PaginatedWorkers>> {
  try {
    const {
      search,
      isActive,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      pageSize = 10,
      dateRangeFrom,
      dateRangeTo,
    } = params;

    const where: Prisma.WorkerWhereInput = { deletedAt: null };

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateRangeFrom) {
      const fromDate = new Date(dateRangeFrom);
      if (!isNaN(fromDate.getTime())) {
        const startOfDay = new Date(fromDate.setHours(0, 0, 0, 0));
        let endOfDay = new Date(fromDate);
        endOfDay.setHours(23, 59, 59, 999);

        if (dateRangeTo) {
          const toDate = new Date(dateRangeTo);
          if (!isNaN(toDate.getTime())) {
            endOfDay = new Date(toDate.setHours(23, 59, 59, 999));
          }
        }

        where.createdAt = { gte: startOfDay, lte: endOfDay };
      }
    }

    const total = await prisma.worker.count({ where });
    const workers = await prisma.worker.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      success: true,
      data: {
        workers,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("getWorkersPaginated error:", error);
    return { success: false, error: "Gagal mengambil data worker." };
  }
}

export async function getActiveWorkers(): Promise<ActionResult<WorkerData[]>> {
  try {
    const workers = await prisma.worker.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: workers };
  } catch (error) {
    console.error("getActiveWorkers error:", error);
    return { success: false, error: "Gagal mengambil data worker aktif." };
  }
}

export async function getWorkerById(id: number): Promise<ActionResult<WorkerWithUnits | null>> {
  try {
    const worker = await prisma.worker.findFirst({
      where: { id, deletedAt: null },
      include: {
        units: {
          where: { deletedAt: null },
          include: { customer: true },
          orderBy: { soldAt: "desc" },
        },
      },
    });
    return { success: true, data: worker };
  } catch (error) {
    console.error("getWorkerById error:", error);
    return { success: false, error: "Gagal mengambil detail worker." };
  }
}

// ============================================================
// CREATE
// ============================================================

interface CreateWorkerInput {
  name: string;
  phone: string;
}

export async function createWorker(input: CreateWorkerInput): Promise<ActionResult<WorkerData>> {
  try {
    if (!input.name.trim()) {
      return { success: false, error: "Nama worker wajib diisi." };
    }
    if (!input.phone.trim()) {
      return { success: false, error: "Nomor telepon worker wajib diisi." };
    }

    const worker = await prisma.worker.create({
      data: {
        name: input.name.trim(),
        phone: input.phone.trim(),
      },
    });

    revalidateTag(CACHE_TAG.WORKER);
    return { success: true, data: worker };
  } catch (error) {
    console.error("createWorker error:", error);
    return { success: false, error: "Gagal membuat worker baru." };
  }
}

// ============================================================
// UPDATE
// ============================================================

interface UpdateWorkerInput {
  id: number;
  name: string;
  phone: string;
}

export async function updateWorker(input: UpdateWorkerInput): Promise<ActionResult<WorkerData>> {
  try {
    const updated = await prisma.worker.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        phone: input.phone.trim(),
      },
    });

    revalidateTag(CACHE_TAG.WORKER);
    return { success: true, data: updated };
  } catch (error) {
    console.error("updateWorker error:", error);
    return { success: false, error: "Gagal mengupdate worker." };
  }
}

export async function toggleWorkerActive(id: number): Promise<ActionResult> {
  try {
    const worker = await prisma.worker.findUniqueOrThrow({ where: { id } });

    await prisma.worker.update({
      where: { id },
      data: { isActive: !worker.isActive },
    });

    revalidateTag(CACHE_TAG.WORKER);
    return { success: true };
  } catch (error) {
    console.error("toggleWorkerActive error:", error);
    return { success: false, error: "Gagal mengubah status worker." };
  }
}

// ============================================================
// DELETE (Soft Delete)
// ============================================================

export async function deleteWorker(id: number): Promise<ActionResult> {
  try {
    await prisma.worker.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidateTag(CACHE_TAG.WORKER);
    return { success: true };
  } catch (error) {
    console.error("deleteWorker error:", error);
    return { success: false, error: "Gagal menghapus worker." };
  }
}
