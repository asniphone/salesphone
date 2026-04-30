"use server";

import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/constants/cache-tag";
import { getSession } from "@/lib/session";
import type { Prisma } from "@prisma/client";

// ============================================================
// Types
// ============================================================

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

type AccessoryWithCounts = Prisma.AccessoryGetPayload<{
  include: {
    _count: { select: { purchases: true; sales: true } };
  };
}>;

type AccessoryWithDetails = Prisma.AccessoryGetPayload<{
  include: {
    purchases: { where: { deletedAt: null } };
    logs: {
      include: {
        user: { omit: { password: true } };
        purchase: true;
        sale: true;
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

interface GetAccessoriesParams {
  search?: string;
  sortBy?: "createdAt" | "name" | "sellPrice" | "recordedStock";
  sortOrder?: "asc" | "desc";
  dateRangeFrom?: string;
  dateRangeTo?: string;
  page?: number;
  pageSize?: number;
}

interface PaginatedAccessories {
  accessories: AccessoryWithCounts[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getAccessories(
  params: GetAccessoriesParams = {},
): Promise<ActionResult<PaginatedAccessories>> {
  try {
    const {
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      dateRangeFrom,
      dateRangeTo,
      page = 1,
      pageSize = 10,
    } = params;

    const where: Prisma.AccessoryWhereInput = { deletedAt: null };

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

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const total = await prisma.accessory.count({ where });

    const accessories = await prisma.accessory.findMany({
      where,
      include: {
        _count: { select: { purchases: true, sales: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      success: true,
      data: {
        accessories,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("getAccessories error:", error);
    return { success: false, error: "Gagal mengambil data aksesoris." };
  }
}

export async function getAccessoryById(
  id: number,
): Promise<ActionResult<AccessoryWithDetails | null>> {
  try {
    const accessory = await prisma.accessory.findFirst({
      where: { id, deletedAt: null },
      include: {
        // Only show non-deleted purchases
        purchases: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
        logs: {
          include: {
            user: { omit: { password: true } },
            purchase: true,
            sale: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return { success: true, data: accessory };
  } catch (error) {
    console.error("getAccessoryById error:", error);
    return { success: false, error: "Gagal mengambil detail aksesoris." };
  }
}

// ============================================================
// CREATE
// ============================================================

interface CreateAccessoryInput {
  name: string;
  images?: string[];
  sellPrice: number;
  initialBuyPrice?: number;
  initialStock?: number;
  initialNote?: string;
}

export async function createAccessory(
  input: CreateAccessoryInput,
): Promise<ActionResult<AccessoryWithCounts>> {
  try {
    const userId = await requireUserId();

    const hasInitialStock = (input.initialStock ?? 0) > 0;

    const accessory = await prisma.$transaction(async (tx) => {
      const created = await tx.accessory.create({
        data: {
          name: input.name,
          images: input.images ?? [],
          sellPrice: input.sellPrice,
          recordedBuyPrice: hasInitialStock ? (input.initialBuyPrice ?? 0) : 0,
          recordedStock: input.initialStock ?? 0,
        },
        include: {
          _count: { select: { purchases: true, sales: true } },
        },
      });

      // Log CREATE
      await tx.accessoryLog.create({
        data: {
          type: "CREATE",
          kind: "COMMON",
          accessoryId: created.id,
          userId,
          afterName: created.name,
          afterSellPrice: created.sellPrice,
          afterRecordedBuyPrice: created.recordedBuyPrice,
          afterRecordedStock: created.recordedStock,
          logNote: "Aksesoris baru ditambahkan",
        },
      });

      // Jika ada stok awal, buat purchase record agar terlacak
      if (hasInitialStock) {
        const qty = input.initialStock!;
        const pricePerUnit = input.initialBuyPrice ?? 0;
        const purchase = await tx.accessoryPurchase.create({
          data: {
            accessoryId: created.id,
            quantity: qty,
            buyPricePerUnit: pricePerUnit,
            buyPriceTotal: qty * pricePerUnit,
            note: input.initialNote || "Stok awal saat produk dibuat",
          },
        });

        // Log PURCHASE
        await tx.accessoryLog.create({
          data: {
            type: "CREATE",
            kind: "PURCHASE",
            accessoryId: created.id,
            userId,
            purchaseId: purchase.id,
            beforeRecordedStock: 0,
            afterRecordedStock: qty,
            beforeRecordedBuyPrice: 0,
            afterRecordedBuyPrice: pricePerUnit,
            logNote: `Stok awal: ${qty} unit @${pricePerUnit}`,
          },
        });
      }

      return created;
    });

    revalidateTag(CACHE_TAG.ACCESSORY);
    revalidateTag(CACHE_TAG.ACCESSORY_LOG);
    return { success: true, data: accessory };
  } catch (error) {
    console.error("createAccessory error:", error);
    return { success: false, error: "Gagal membuat aksesoris baru." };
  }
}

// ============================================================
// PURCHASE (Tambah Stok)
// ============================================================

interface AddPurchaseInput {
  accessoryId: number;
  quantity: number;
  buyPricePerUnit: number;
  note?: string;
}

export async function addAccessoryPurchase(
  input: AddPurchaseInput,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    await prisma.$transaction(async (tx) => {
      const accessory = await tx.accessory.findUniqueOrThrow({
        where: { id: input.accessoryId },
      });

      // Hitung Moving Average Cost (MAC)
      const currentTotalValue =
        accessory.recordedStock * accessory.recordedBuyPrice;
      const newPurchaseValue = input.quantity * input.buyPricePerUnit;
      const newTotalStock = accessory.recordedStock + input.quantity;
      const newMAC =
        newTotalStock > 0
          ? Math.round((currentTotalValue + newPurchaseValue) / newTotalStock)
          : input.buyPricePerUnit;

      // Buat purchase record
      const purchase = await tx.accessoryPurchase.create({
        data: {
          accessoryId: input.accessoryId,
          quantity: input.quantity,
          buyPricePerUnit: input.buyPricePerUnit,
          buyPriceTotal: newPurchaseValue,
          note: input.note,
        },
      });

      // Update stok dan MAC di accessory
      await tx.accessory.update({
        where: { id: input.accessoryId },
        data: {
          recordedStock: newTotalStock,
          recordedBuyPrice: newMAC,
        },
      });

      // Catat log
      await tx.accessoryLog.create({
        data: {
          type: "UPDATE",
          kind: "PURCHASE",
          accessoryId: input.accessoryId,
          userId,
          purchaseId: purchase.id,
          beforeRecordedStock: accessory.recordedStock,
          afterRecordedStock: newTotalStock,
          beforeRecordedBuyPrice: accessory.recordedBuyPrice,
          afterRecordedBuyPrice: newMAC,
          logNote: `Pembelian ${input.quantity} unit @${input.buyPricePerUnit}${input.note ? ` — ${input.note}` : ""}`,
        },
      });
    });

    revalidateTag(CACHE_TAG.ACCESSORY);
    revalidateTag(CACHE_TAG.ACCESSORY_LOG);
    return { success: true };
  } catch (error) {
    console.error("addAccessoryPurchase error:", error);
    return { success: false, error: "Gagal menambahkan pembelian aksesoris." };
  }
}

// ============================================================
// PURCHASE — EDIT
// ============================================================

interface UpdatePurchaseInput {
  purchaseId: number;
  accessoryId: number;
  quantity: number;
  buyPricePerUnit: number;
  note?: string;
}

export async function updateAccessoryPurchase(
  input: UpdatePurchaseInput,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    await prisma.$transaction(async (tx) => {
      // Ambil data purchase lama
      const oldPurchase = await tx.accessoryPurchase.findUniqueOrThrow({
        where: { id: input.purchaseId },
      });

      const accessory = await tx.accessory.findUniqueOrThrow({
        where: { id: input.accessoryId },
      });

      // Update purchase record
      await tx.accessoryPurchase.update({
        where: { id: input.purchaseId },
        data: {
          quantity: input.quantity,
          buyPricePerUnit: input.buyPricePerUnit,
          buyPriceTotal: input.quantity * input.buyPricePerUnit,
          note: input.note,
        },
      });

      // ─── Incremental MAC formula ─────────────────────────────────────────
      // Menggunakan pendekatan incremental agar perubahan unit yang terjual
      // tetap diperhitungkan dengan benar.
      // Formula: new_value = (stock × old_MAC) + value_delta
      //          new_MAC   = new_value / new_stock
      // ─────────────────────────────────────────────────────────────────────
      const stockDelta = input.quantity - oldPurchase.quantity;
      const valueDelta =
        input.quantity * input.buyPricePerUnit -
        oldPurchase.quantity * oldPurchase.buyPricePerUnit;

      const currentTotalValue =
        accessory.recordedStock * accessory.recordedBuyPrice;
      const newTotalValue = currentTotalValue + valueDelta;
      const newStock = Math.max(0, accessory.recordedStock + stockDelta);
      const newMAC = newStock > 0 ? Math.round(newTotalValue / newStock) : 0;

      await tx.accessory.update({
        where: { id: input.accessoryId },
        data: {
          recordedStock: newStock,
          recordedBuyPrice: newMAC,
        },
      });

      // Catat log
      await tx.accessoryLog.create({
        data: {
          type: "UPDATE",
          kind: "PURCHASE",
          accessoryId: input.accessoryId,
          userId,
          purchaseId: input.purchaseId,
          beforeRecordedStock: accessory.recordedStock,
          afterRecordedStock: newStock,
          beforeRecordedBuyPrice: accessory.recordedBuyPrice,
          afterRecordedBuyPrice: newMAC,
          logNote: `Edit pembelian: ${oldPurchase.quantity} unit → ${input.quantity} unit, @${oldPurchase.buyPricePerUnit} → @${input.buyPricePerUnit}`,
        },
      });
    });

    revalidateTag(CACHE_TAG.ACCESSORY);
    revalidateTag(CACHE_TAG.ACCESSORY_LOG);
    return { success: true };
  } catch (error) {
    console.error("updateAccessoryPurchase error:", error);
    return { success: false, error: "Gagal memperbarui data pembelian." };
  }
}

// ============================================================
// PURCHASE — DELETE (Soft Delete)
// ============================================================

export async function deleteAccessoryPurchase(
  purchaseId: number,
  accessoryId: number,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.accessoryPurchase.findUniqueOrThrow({
        where: { id: purchaseId },
      });

      const accessory = await tx.accessory.findUniqueOrThrow({
        where: { id: accessoryId },
      });

      // Validasi: tidak boleh hapus purchase jika stok akan jadi negatif
      const newStock = accessory.recordedStock - purchase.quantity;
      if (newStock < 0) {
        throw new Error(
          `Tidak bisa menghapus: stok akan menjadi ${newStock}. ` +
            `Pastikan tidak ada penjualan yang bergantung pada stok ini.`,
        );
      }

      // Soft delete purchase
      await tx.accessoryPurchase.update({
        where: { id: purchaseId },
        data: { deletedAt: new Date() },
      });

      // ─── Incremental MAC formula ─────────────────────────────────────────
      // Hapus kontribusi purchase ini dari nilai inventaris secara incremental
      // agar unit yang sudah terjual tetap diperhitungkan.
      // Formula: new_value = (stock × old_MAC) - (qty × price_per_unit)
      //          new_MAC   = new_value / new_stock
      // ─────────────────────────────────────────────────────────────────────
      const removedValue = purchase.quantity * purchase.buyPricePerUnit;
      const currentTotalValue =
        accessory.recordedStock * accessory.recordedBuyPrice;
      const newTotalValue = currentTotalValue - removedValue;
      const newMAC = newStock > 0 ? Math.round(newTotalValue / newStock) : 0;

      await tx.accessory.update({
        where: { id: accessoryId },
        data: {
          recordedStock: newStock,
          recordedBuyPrice: newMAC,
        },
      });

      // Catat log
      await tx.accessoryLog.create({
        data: {
          type: "DELETE",
          kind: "PURCHASE",
          accessoryId,
          userId,
          purchaseId,
          beforeRecordedStock: accessory.recordedStock,
          afterRecordedStock: newStock,
          beforeRecordedBuyPrice: accessory.recordedBuyPrice,
          afterRecordedBuyPrice: newMAC,
          logNote: `Hapus pembelian: ${purchase.quantity} unit @${purchase.buyPricePerUnit}`,
        },
      });
    });

    revalidateTag(CACHE_TAG.ACCESSORY);
    revalidateTag(CACHE_TAG.ACCESSORY_LOG);
    return { success: true };
  } catch (error) {
    console.error("deleteAccessoryPurchase error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Gagal menghapus data pembelian.";
    return { success: false, error: message };
  }
}

// ============================================================
// UPDATE (Accessory)
// ============================================================

interface UpdateAccessoryInput {
  id: number;
  name?: string;
  images?: string[];
  sellPrice?: number;
}

export async function updateAccessory(
  input: UpdateAccessoryInput,
): Promise<ActionResult<AccessoryWithCounts>> {
  try {
    const userId = await requireUserId();
    const { id, ...data } = input;

    const accessory = await prisma.$transaction(async (tx) => {
      const before = await tx.accessory.findUniqueOrThrow({ where: { id } });

      const after = await tx.accessory.update({
        where: { id },
        data,
        include: {
          _count: { select: { purchases: true, sales: true } },
        },
      });

      const changes: string[] = [];
      if (data.name && data.name !== before.name) changes.push("Nama diubah");
      if (data.sellPrice !== undefined && data.sellPrice !== before.sellPrice) {
        changes.push("Harga jual diubah");
      }

      await tx.accessoryLog.create({
        data: {
          type: "UPDATE",
          kind: "COMMON",
          accessoryId: id,
          userId,
          beforeName: before.name,
          afterName: after.name,
          beforeSellPrice: before.sellPrice,
          afterSellPrice: after.sellPrice,
          logNote: changes.length > 0 ? changes.join(", ") : "Data diperbarui",
        },
      });

      return after;
    });

    revalidateTag(CACHE_TAG.ACCESSORY);
    revalidateTag(CACHE_TAG.ACCESSORY_LOG);
    return { success: true, data: accessory };
  } catch (error) {
    console.error("updateAccessory error:", error);
    return { success: false, error: "Gagal memperbarui aksesoris." };
  }
}

// ============================================================
// DELETE (Soft Delete — Accessory)
// ============================================================

export async function deleteAccessory(id: number): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    await prisma.$transaction(async (tx) => {
      const before = await tx.accessory.findUniqueOrThrow({ where: { id } });

      await tx.accessory.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.accessoryLog.create({
        data: {
          type: "DELETE",
          kind: "COMMON",
          accessoryId: id,
          userId,
          beforeName: before.name,
          beforeSellPrice: before.sellPrice,
          beforeRecordedStock: before.recordedStock,
          logNote: "Aksesoris dihapus",
        },
      });
    });

    revalidateTag(CACHE_TAG.ACCESSORY);
    revalidateTag(CACHE_TAG.ACCESSORY_LOG);
    return { success: true };
  } catch (error) {
    console.error("deleteAccessory error:", error);
    return { success: false, error: "Gagal menghapus aksesoris." };
  }
}

// ============================================================
// READ — For Sell Page (available stock only)
// ============================================================

export type AccessoryForSale = {
  id: number;
  name: string;
  images: string[];
  recordedStock: number;
  recordedBuyPrice: number;
  sellPrice: number;
};

export async function getAccessoriesForSale(): Promise<
  ActionResult<AccessoryForSale[]>
> {
  try {
    const accessories = await prisma.accessory.findMany({
      where: { deletedAt: null, recordedStock: { gt: 0 } },
      select: {
        id: true,
        name: true,
        images: true,
        recordedStock: true,
        recordedBuyPrice: true,
        sellPrice: true,
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: accessories };
  } catch (error) {
    console.error("getAccessoriesForSale error:", error);
    return { success: false, error: "Gagal mengambil daftar aksesoris." };
  }
}

// ============================================================
// SALE — Jual Aksesoris
// ============================================================

interface SaleItem {
  accessoryId: number;
  quantity: number;
}

interface CreateAccessorySaleInput {
  customerId: number;
  workerId: number;
  feeWorker: number;
  items: SaleItem[];
}

type AccessorySaleResult = {
  id: number;
  totalPrice: number;
  totalProfit: number;
};

export async function createAccessorySale(
  input: CreateAccessorySaleInput,
): Promise<ActionResult<AccessorySaleResult>> {
  try {
    const userId = await requireUserId();

    if (!input.items.length) {
      return { success: false, error: "Keranjang tidak boleh kosong." };
    }
    if (!input.customerId || input.customerId < 1) {
      return { success: false, error: "Customer wajib dipilih." };
    }
    if (!input.workerId || input.workerId < 1) {
      return { success: false, error: "Worker wajib dipilih." };
    }
    if (input.feeWorker < 0) {
      return { success: false, error: "Fee worker tidak boleh kurang dari 0." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const [customer, worker] = await Promise.all([
        tx.customer.findFirstOrThrow({
          where: { id: input.customerId, deletedAt: null },
        }),
        tx.worker.findFirstOrThrow({
          where: { id: input.workerId, deletedAt: null },
        }),
      ]);

      // 1. Ambil data semua aksesoris yang akan dijual (lock untuk konsistensi)
      const accessoryIds = input.items.map((i) => i.accessoryId);
      const accessories = await tx.accessory.findMany({
        where: { id: { in: accessoryIds }, deletedAt: null },
      });

      // Buat map untuk lookup cepat
      const accessoryMap = new Map(accessories.map((a) => [a.id, a]));

      // 2. Validasi stok mencukupi
      for (const item of input.items) {
        const acc = accessoryMap.get(item.accessoryId);
        if (!acc) {
          throw new Error(`Aksesoris ID ${item.accessoryId} tidak ditemukan.`);
        }
        if (acc.recordedStock < item.quantity) {
          throw new Error(
            `Stok "${acc.name}" tidak mencukupi. Tersedia: ${acc.recordedStock}, diminta: ${item.quantity}.`,
          );
        }
      }

      // 3. Hitung total transaksi
      let totalPrice = 0;
      let totalProfit = 0;

      const saleItemsData = input.items.map((item) => {
        const acc = accessoryMap.get(item.accessoryId)!;
        // Freeze harga saat transaksi terjadi
        const sellPricePerUnit = acc.sellPrice;
        const recordedBuyPricePerUnit = acc.recordedBuyPrice;
        const profitPerUnit = sellPricePerUnit - recordedBuyPricePerUnit;

        totalPrice += sellPricePerUnit * item.quantity;
        totalProfit += profitPerUnit * item.quantity;

        return {
          accessoryId: item.accessoryId,
          quantity: item.quantity,
          sellPricePerUnit,
          recordedBuyPricePerUnit,
          profitPerUnit,
        };
      });

      // 4. Buat AccessorySale header
      const sale = await tx.accessorySale.create({
        data: {
          customerId: input.customerId,
          workerId: input.workerId,
          feeWorker: input.feeWorker,
          totalPrice,
          totalProfit,
        },
      });

      // 5. Buat setiap AccessorySaleItem & update stok + catat log per item
      for (const itemData of saleItemsData) {
        const acc = accessoryMap.get(itemData.accessoryId)!;
        const newStock = acc.recordedStock - itemData.quantity;

        // Buat sale item
        const saleItem = await tx.accessorySaleItem.create({
          data: {
            saleId: sale.id,
            accessoryId: itemData.accessoryId,
            quantity: itemData.quantity,
            recordedBuyPricePerUnit: itemData.recordedBuyPricePerUnit,
            sellPricePerUnit: itemData.sellPricePerUnit,
            profitPerUnit: itemData.profitPerUnit,
          },
        });

        // Kurangi stok — MAC TIDAK berubah karena COGS sudah ter-freeze
        await tx.accessory.update({
          where: { id: itemData.accessoryId },
          data: { recordedStock: newStock },
        });

        // Catat log per aksesoris yang terjual
        await tx.accessoryLog.create({
          data: {
            type: "UPDATE",
            kind: "SALE",
            accessoryId: itemData.accessoryId,
            userId,
            saleId: sale.id,
            saleItemId: saleItem.id,
            beforeRecordedStock: acc.recordedStock,
            afterRecordedStock: newStock,
            beforeRecordedBuyPrice: acc.recordedBuyPrice,
            afterRecordedBuyPrice: acc.recordedBuyPrice, // MAC tidak berubah saat penjualan
            logNote:
              `Terjual ${itemData.quantity} unit @${itemData.sellPricePerUnit} ` +
              `(profit: ${itemData.profitPerUnit}/unit) ke ${customer.name} ` +
              `oleh worker ${worker.name} (fee: ${input.feeWorker})`,
          },
        });
      }

      return { id: sale.id, totalPrice, totalProfit };
    });

    revalidateTag(CACHE_TAG.ACCESSORY);
    revalidateTag(CACHE_TAG.ACCESSORY_LOG);
    revalidateTag(CACHE_TAG.WORKER);
    return { success: true, data: result };
  } catch (error) {
    console.error("createAccessorySale error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memproses penjualan aksesoris.";
    return { success: false, error: message };
  }
}

// ============================================================
// READ - Sales History
// ============================================================

export type AccessorySaleHistoryData = Prisma.AccessorySaleGetPayload<{
  include: {
    customer: true;
    worker: true;
    items: {
      include: {
        accessory: true;
      };
    };
  };
}>;

export async function getAccessorySales(
  params: GetAccessoriesParams = {},
): Promise<
  ActionResult<{
    sales: AccessorySaleHistoryData[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>
> {
  try {
    const {
      search,
      dateRangeFrom,
      dateRangeTo,
      page = 1,
      pageSize = 10,
    } = params;

    const where: Prisma.AccessorySaleWhereInput = { deletedAt: null };

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

    if (search) {
      // Search by Customer name

      where.OR = [
        {
          customer: {
            name: { contains: search, mode: "insensitive" },
          },
        },
        {
          worker: {
            name: { contains: search, mode: "insensitive" },
          },
        },
        {
          items: {
            some: {
              accessory: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
      ];
    }

    const total = await prisma.accessorySale.count({ where });

    const sales = await prisma.accessorySale.findMany({
      where,
      include: {
        customer: true,
        worker: true,
        items: {
          include: { accessory: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      success: true,
      data: {
        sales,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("getAccessorySales error:", error);
    return {
      success: false,
      error: "Gagal mengambil riwayat penjualan aksesoris.",
    };
  }
}

interface UpdateAccessorySaleInput {
  saleId: number;
  customerId: number;
  workerId: number;
  feeWorker: number;
}

export async function updateAccessorySale(
  input: UpdateAccessorySaleInput,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    if (!input.customerId || input.customerId < 1) {
      return { success: false, error: "Customer wajib dipilih." };
    }
    if (!input.workerId || input.workerId < 1) {
      return { success: false, error: "Worker wajib dipilih." };
    }
    if (input.feeWorker < 0) {
      return { success: false, error: "Fee worker tidak boleh kurang dari 0." };
    }

    await prisma.$transaction(async (tx) => {
      const sale = await tx.accessorySale.findFirstOrThrow({
        where: { id: input.saleId, deletedAt: null },
        include: {
          customer: true,
          worker: true,
          items: {
            include: {
              accessory: true,
            },
          },
        },
      });

      const [nextCustomer, nextWorker] = await Promise.all([
        tx.customer.findFirstOrThrow({
          where: { id: input.customerId, deletedAt: null },
        }),
        tx.worker.findFirstOrThrow({
          where: { id: input.workerId, deletedAt: null },
        }),
      ]);

      await tx.accessorySale.update({
        where: { id: input.saleId },
        data: {
          customerId: input.customerId,
          workerId: input.workerId,
          feeWorker: input.feeWorker,
        },
      });

      const changes: string[] = [];

      if (sale.customerId !== input.customerId) {
        changes.push(`customer: ${sale.customer.name} → ${nextCustomer.name}`);
      }
      if (sale.workerId !== input.workerId) {
        changes.push(`worker: ${sale.worker.name} → ${nextWorker.name}`);
      }
      if (sale.feeWorker !== input.feeWorker) {
        changes.push(`fee worker: ${sale.feeWorker} → ${input.feeWorker}`);
      }

      if (!changes.length) {
        return;
      }

      for (const item of sale.items) {
        await tx.accessoryLog.create({
          data: {
            type: "UPDATE",
            kind: "SALE",
            accessoryId: item.accessoryId,
            userId,
            saleId: sale.id,
            saleItemId: item.id,
            beforeRecordedStock: item.accessory.recordedStock,
            afterRecordedStock: item.accessory.recordedStock,
            beforeRecordedBuyPrice: item.accessory.recordedBuyPrice,
            afterRecordedBuyPrice: item.accessory.recordedBuyPrice,
            logNote: `Edit penjualan #${sale.id}: ${changes.join(", ")}`,
          },
        });
      }
    });

    revalidateTag(CACHE_TAG.ACCESSORY);
    revalidateTag(CACHE_TAG.ACCESSORY_LOG);
    revalidateTag(CACHE_TAG.WORKER);
    return { success: true };
  } catch (error) {
    console.error("updateAccessorySale error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memperbarui penjualan aksesoris.";
    return { success: false, error: message };
  }
}

export async function deleteAccessorySale(
  saleId: number,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    await prisma.$transaction(async (tx) => {
      const sale = await tx.accessorySale.findFirstOrThrow({
        where: { id: saleId, deletedAt: null },
        include: {
          customer: true,
          worker: true,
          items: {
            include: {
              accessory: true,
            },
          },
        },
      });

      await tx.accessorySale.update({
        where: { id: saleId },
        data: { deletedAt: new Date() },
      });

      for (const item of sale.items) {
        const currentTotalValue =
          item.accessory.recordedStock * item.accessory.recordedBuyPrice;
        const returnedValue = item.quantity * item.recordedBuyPricePerUnit;
        const newStock = item.accessory.recordedStock + item.quantity;
        const newRecordedBuyPrice =
          newStock > 0
            ? Math.round((currentTotalValue + returnedValue) / newStock)
            : 0;

        await tx.accessory.update({
          where: { id: item.accessoryId },
          data: {
            recordedStock: newStock,
            recordedBuyPrice: newRecordedBuyPrice,
          },
        });

        await tx.accessoryLog.create({
          data: {
            type: "DELETE",
            kind: "SALE",
            accessoryId: item.accessoryId,
            userId,
            saleId: sale.id,
            saleItemId: item.id,
            beforeRecordedStock: item.accessory.recordedStock,
            afterRecordedStock: newStock,
            beforeRecordedBuyPrice: item.accessory.recordedBuyPrice,
            afterRecordedBuyPrice: newRecordedBuyPrice,
            logNote:
              `Hapus penjualan #${sale.id}: kembalikan ${item.quantity} unit ` +
              `dari transaksi ${sale.customer.name} / worker ${sale.worker.name}`,
          },
        });
      }
    });

    revalidateTag(CACHE_TAG.ACCESSORY);
    revalidateTag(CACHE_TAG.ACCESSORY_LOG);
    revalidateTag(CACHE_TAG.WORKER);
    return { success: true };
  } catch (error) {
    console.error("deleteAccessorySale error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Gagal menghapus penjualan aksesoris.";
    return { success: false, error: message };
  }
}
