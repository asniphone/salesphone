"use server";

import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/constants/cache-tag";
import { getSession } from "@/lib/session";
import type { PaymentType, Prisma, Status } from "@prisma/client";

// ============================================================
// Types
// ============================================================

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

type UnitWithCustomer = Prisma.UnitGetPayload<{
  include: { customer: true; worker: true };
}>;

type UnitWithDetails = Prisma.UnitGetPayload<{
  include: {
    customer: true;
    worker: true;
    unitLogs: {
      include: {
        user: { omit: { password: true } };
        customerBefore: true;
        customerAfter: true;
      };
    };
  };
}>;

// ============================================================
// Helpers
// ============================================================

async function requireUserId(): Promise<number> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session.userId;
}

// ============================================================
// READ
// ============================================================

interface GetUnitsParams {
  search?: string;
  status?: Status;
  sortBy?: "createdAt" | "name" | "buyPrice" | "soldPrice" | "buyAt" | "soldAt";
  sortOrder?: "asc" | "desc";
  dateTarget?: "createdAt" | "buyAt" | "soldAt";
  dateRangeFrom?: string;
  dateRangeTo?: string;
  page?: number;
  pageSize?: number;
}

interface PaginatedUnits {
  units: UnitWithCustomer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getUnits(
  params: GetUnitsParams = {},
): Promise<ActionResult<PaginatedUnits>> {
  try {
    const {
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
      dateTarget,
      dateRangeFrom,
      dateRangeTo,
      page = 1,
      pageSize = 10,
    } = params;

    // Build where clause
    const where: Prisma.UnitWhereInput = { deletedAt: null };

    if (status) {
      where.status = status;
    }

    if (dateTarget && dateRangeFrom) {
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

        where[dateTarget] = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { imei: { contains: search, mode: "insensitive" } },
      ];
    }

    // Count total
    const total = await prisma.unit.count({ where });

    // Fetch paginated
    const units = await prisma.unit.findMany({
      where,
      include: { customer: true, worker: true },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      success: true,
      data: {
        units,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("getUnits error:", error);
    return { success: false, error: "Gagal mengambil data unit." };
  }
}

export async function getUnitById(
  id: number,
): Promise<ActionResult<UnitWithCustomer | null>> {
  try {
    const unit = await prisma.unit.findFirst({
      where: { id, deletedAt: null },
      include: { customer: true, worker: true },
    });
    return { success: true, data: unit };
  } catch (error) {
    console.error("getUnitById error:", error);
    return { success: false, error: "Gagal mengambil data unit." };
  }
}

export async function getUnitWithLogs(
  id: number,
): Promise<ActionResult<UnitWithDetails | null>> {
  try {
    const unit = await prisma.unit.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        worker: true,
        unitLogs: {
          include: {
            user: { omit: { password: true } },
            customerBefore: true,
            customerAfter: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return { success: true, data: unit };
  } catch (error) {
    console.error("getUnitWithLogs error:", error);
    return { success: false, error: "Gagal mengambil detail unit." };
  }
}

// ============================================================
// CREATE
// ============================================================

interface CreateUnitInput {
  imei?: string;
  name: string;
  note?: string;
  images?: string[];
  buyAt?: Date;
  buyPrice?: number;
  customerId?: number;
}

export async function createUnit(
  input: CreateUnitInput,
): Promise<ActionResult<UnitWithCustomer>> {
  try {
    const userId = await requireUserId();

    const unit = await prisma.$transaction(async (tx) => {
      // 1. Buat unit
      const created = await tx.unit.create({
        data: {
          imei: input.imei,
          name: input.name,
          note: input.note,
          images: input.images ?? [],
          buyAt: input.buyAt,
          buyPrice: input.buyPrice,
          customerId: input.customerId,
          grossProfit: 0,
          netProfit: 0,
        },
        include: { customer: true, worker: true },
      });

      // 2. Catat log CREATE
      await tx.unitLog.create({
        data: {
          type: "CREATE",
          unitId: created.id,
          userId,
          statusAfter: created.status,
          buyPriceAfter: created.buyPrice,
          noteAfter: created.note,
          customerIdAfter: created.customerId,
          logActionNote: "Unit baru ditambahkan",
        },
      });

      return created;
    });

    revalidateTag(CACHE_TAG.UNIT);
    revalidateTag(CACHE_TAG.UNIT_LOG);
    return { success: true, data: unit };
  } catch (error) {
    console.error("createUnit error:", error);
    return { success: false, error: "Gagal membuat unit baru." };
  }
}

// ============================================================
// UPDATE
// ============================================================

interface UpdateUnitInput {
  id: number;
  imei?: string;
  name?: string;
  note?: string;
  images?: string[];
  status?: Status;
  buyAt?: Date;
  buyPrice?: number;
  soldAt?: Date;
  soldPrice?: number;
  dpAmount?: number;
  customerId?: number | null;
  workerId?: number | null;
  workerFee?: number;
  paymentType?: PaymentType | null;
}

export async function updateUnit(
  input: UpdateUnitInput,
): Promise<ActionResult<UnitWithCustomer>> {
  try {
    const userId = await requireUserId();
    const { id, ...data } = input;

    const unit = await prisma.$transaction(async (tx) => {
      // 1. Ambil data sebelum update (snapshot before)
      const before = await tx.unit.findUniqueOrThrow({
        where: { id },
      });

      const soldPrice = input.soldPrice || before.soldPrice || 0;
      const buyPrice = input.buyPrice || before.buyPrice || 0;
      const workerFee = input.workerFee || before.workerFee || 0;

      const grossProfit = soldPrice - buyPrice;
      const netProfit = grossProfit - workerFee;

      // 2. Update unit
      const after = await tx.unit.update({
        where: { id },
        data: { ...data, grossProfit, netProfit },
        include: { customer: true, worker: true },
      });

      // 3. Buat deskripsi perubahan otomatis
      const changes: string[] = [];
      if (data.status && data.status !== before.status) {
        changes.push(`Status: ${before.status} → ${data.status}`);
      }
      if (data.buyPrice !== undefined && data.buyPrice !== before.buyPrice) {
        changes.push("Harga beli diubah");
      }
      if (data.soldPrice !== undefined && data.soldPrice !== before.soldPrice) {
        changes.push("Harga jual diubah");
      }
      if (data.dpAmount !== undefined && data.dpAmount !== before.dpAmount) {
        changes.push("DP diubah");
      }
      if (
        data.customerId !== undefined &&
        data.customerId !== before.customerId
      ) {
        changes.push("Customer diubah");
      }
      if (data.name !== undefined && data.name !== before.name) {
        changes.push("Nama diubah");
      }
      if (data.note !== undefined && data.note !== before.note) {
        changes.push("Catatan diubah");
      }
      if (data.workerId !== undefined && data.workerId !== before.workerId) {
        changes.push("Worker diubah");
      }
      if (data.workerFee !== undefined && data.workerFee !== before.workerFee) {
        changes.push("Fee worker diubah");
      }
      if (
        data.paymentType !== undefined &&
        data.paymentType !== before.paymentType
      ) {
        changes.push("Tipe pembayaran diubah");
      }

      const logNote =
        changes.length > 0 ? changes.join(", ") : "Data diperbarui";

      // 4. Catat log UPDATE
      await tx.unitLog.create({
        data: {
          type: "UPDATE",
          unitId: id,
          userId,
          statusBefore: before.status,
          statusAfter: after.status,
          buyPriceBefore: before.buyPrice,
          buyPriceAfter: after.buyPrice,
          soldPriceBefore: before.soldPrice,
          soldPriceAfter: after.soldPrice,
          dpAmountBefore: before.dpAmount,
          dpAmountAfter: after.dpAmount,
          customerIdBefore: before.customerId,
          customerIdAfter: after.customerId,
          noteBefore: before.note,
          noteAfter: after.note,
          logActionNote: logNote,
        },
      });

      return after;
    });

    revalidateTag(CACHE_TAG.UNIT);
    revalidateTag(CACHE_TAG.UNIT_LOG);
    return { success: true, data: unit };
  } catch (error) {
    console.error("updateUnit error:", error);
    return { success: false, error: "Gagal memperbarui unit." };
  }
}

// ============================================================
// DELETE (Soft Delete)
// ============================================================

export async function deleteUnit(id: number): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    await prisma.$transaction(async (tx) => {
      // 1. Ambil data sebelum delete (snapshot before)
      const before = await tx.unit.findUniqueOrThrow({
        where: { id },
      });

      // 2. Soft delete
      await tx.unit.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // 3. Catat log DELETE
      await tx.unitLog.create({
        data: {
          type: "DELETE",
          unitId: id,
          userId,
          statusBefore: before.status,
          buyPriceBefore: before.buyPrice,
          soldPriceBefore: before.soldPrice,
          dpAmountBefore: before.dpAmount,
          customerIdBefore: before.customerId,
          noteBefore: before.note,
          logActionNote: "Unit dihapus",
        },
      });
    });

    revalidateTag(CACHE_TAG.UNIT);
    revalidateTag(CACHE_TAG.UNIT_LOG);
    return { success: true };
  } catch (error) {
    console.error("deleteUnit error:", error);
    return { success: false, error: "Gagal menghapus unit." };
  }
}
