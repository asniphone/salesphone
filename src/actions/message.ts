"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Prisma } from "@prisma/client";
import { FONNTE_TOKEN } from "@/constants/env";

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

interface InvoiceStoreInformation {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  footNoteReceipt: string | null;
}

async function requireUserId(): Promise<number> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session.userId;
}

/**
 * Format mata uang Rupiah
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Ambil profil toko dari CommonInformation.
 * Jika belum ada data, pakai fallback agar invoice tetap terbentuk.
 */
async function getInvoiceStoreInformation(): Promise<InvoiceStoreInformation> {
  const commonInformation = await prisma.commonInformation.findFirst({
    where: { deletedAt: null },
    orderBy: { id: "desc" },
    select: {
      storeName: true,
      storeAddress: true,
      storePhone: true,
      footNoteReceipt: true,
    },
  });

  if (!commonInformation) {
    return {
      storeName: "POS Internal",
      storeAddress: "-",
      storePhone: "-",
      footNoteReceipt: null,
    };
  }

  return {
    storeName: commonInformation.storeName,
    storeAddress: commonInformation.storeAddress,
    storePhone: commonInformation.storePhone,
    footNoteReceipt: commonInformation.footNoteReceipt,
  };
}

/**
 * Helper internal untuk memanggil API Fonnte send message.
 * Menerima array target phone numbers dan message text.
 */
export async function sendFonnteMessage(targets: string[], message: string): Promise<boolean> {
  if (!FONNTE_TOKEN) {
    console.warn("Peringatan: FONNTE_TOKEN belum diatur di .env");
    return false;
  }

  // Filter nomor kosong dan bersihkan format secara mendasar
  const validTargets = targets
    .map((t) => t.replace(/[^0-9+]/g, "")) // hanya simpan angka dan plus
    .filter((t) => t.length >= 10);

  if (!validTargets.length) return false;

  const targetStr = validTargets.join(",");
  const formData = new FormData();
  formData.append("target", targetStr);
  formData.append("message", message);

  try {
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: FONNTE_TOKEN,
      },
      body: formData,
    });

    const data = await response.json();
    if (!data.status) {
      console.error("Fonnte API Error response:", data);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Fonnte Fetch Error:", error);
    return false;
  }
}

// ============================================================
// INVOICE UNIT
// ============================================================

export async function sendUnitInvoiceWhatsApp(unitId: number): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const storeInformation = await getInvoiceStoreInformation();

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { customer: true },
    });

    if (!unit) return { success: false, error: "Unit tidak ditemukan." };
    if (!unit.customer) return { success: false, error: "Unit ini belum dikaitkan dengan customer." };
    if (!unit.customer.phone) return { success: false, error: "Customer tidak memiliki nomor telepon." };
    if (unit.status !== "SOLD") return { success: false, error: "Hanya unit dengan status SOLD yang dapat dikirimkan invoice." };

    const customerName = unit.customer.name;
    const phone = unit.customer.phone;
    const dateStr = unit.soldAt
      ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(unit.soldAt)
      : "-";
    const footNote = storeInformation.footNoteReceipt?.trim();

    const message = `Halo *${customerName}*,

Terima kasih telah berbelanja di toko kami! Berikut adalah detail rincian transaksi pembelian unit Anda:

*INVOICE PEMBELIAN UNIT*
Id: #${unit.id}
━━━━━━━━━━━━━━━━━━━━━━
• Toko: *${storeInformation.storeName}*
• Alamat: ${storeInformation.storeAddress}
• Telepon: ${storeInformation.storePhone}
━━━━━━━━━━━━━━━━━━━━━━
• Unit: ${unit.name}
${unit.imei ? `• IMEI: ${unit.imei}` : ""}
• Tanggal: ${dateStr}
• Total Harga: *${formatCurrency(unit.soldPrice ?? 0)}*
━━━━━━━━━━━━━━━━━━━━━━${footNote ? `
Catatan:
${footNote}
` : ""}

Jika ada pertanyaan lebih lanjut, silakan balas pesan ini. Semoga hari Anda menyenangkan!`;

    const sent = await sendFonnteMessage([phone], message);

    await prisma.sendInvoiceHistory.create({
      data: {
        content: message,
        status: sent ? "SUCCESS" : "FAILED",
        userId,
        customerId: unit.customerId!,
      },
    });

    if (!sent) {
      return { success: false, error: "Gagal mengirim pesan melalui Fonnte. Periksa token atau nomor tujuan." };
    }

    return { success: true };
  } catch (error) {
    console.error("sendUnitInvoiceWhatsApp error:", error);
    return { success: false, error: "Terjadi kesalahan saat mengirim invoice unit." };
  }
}

// ============================================================
// INVOICE AKSESORIS
// ============================================================

export async function sendAccessorySaleInvoiceWhatsApp(saleId: number): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const storeInformation = await getInvoiceStoreInformation();

    const sale = await prisma.accessorySale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        items: {
          include: { accessory: true },
        },
      },
    });

    if (!sale) return { success: false, error: "Data penjualan aksesoris tidak ditemukan." };
    if (!sale.customer) return { success: false, error: "Penjualan tidak dikaitkan dengan customer yang valid." };
    if (!sale.customer.phone) return { success: false, error: "Customer tidak memiliki nomor telepon." };

    const customerName = sale.customer.name;
    const phone = sale.customer.phone;
    const dateStr = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(sale.createdAt);
    const footNote = storeInformation.footNoteReceipt?.trim();

    let itemsStr = "";
    for (const item of sale.items) {
      itemsStr += `• ${item.accessory.name}\n  ${item.quantity} x ${formatCurrency(item.sellPricePerUnit)}\n`;
    }

    const message = `Halo *${customerName}*,

Terima kasih telah berbelanja di toko kami! Berikut adalah rincian penjualan aksesoris Anda:

*INVOICE PENJUALAN AKSESORIS*
ID Transaksi: #${sale.id}
Tanggal: ${dateStr}
━━━━━━━━━━━━━━━━━━━━━━
• Toko: *${storeInformation.storeName}*
• Alamat: ${storeInformation.storeAddress}
• Telepon: ${storeInformation.storePhone}
━━━━━━━━━━━━━━━━━━━━━━
${itemsStr}
━━━━━━━━━━━━━━━━━━━━━━
*Total Harga: ${formatCurrency(sale.totalPrice)}*${footNote ? `

Catatan:
${footNote}` : ""}

Terima kasih atas kepercayaannya. Semoga hari Anda menyenangkan!`;

    const sent = await sendFonnteMessage([phone], message);

    await prisma.sendInvoiceHistory.create({
      data: {
        content: message,
        status: sent ? "SUCCESS" : "FAILED",
        userId,
        customerId: sale.customerId,
      },
    });

    if (!sent) {
      return { success: false, error: "Gagal mengirim pesan melalui Fonnte. Periksa token atau nomor tujuan." };
    }

    return { success: true };
  } catch (error) {
    console.error("sendAccessorySaleInvoiceWhatsApp error:", error);
    return { success: false, error: "Terjadi kesalahan saat mengirim invoice aksesoris." };
  }
}

// ============================================================
// BULK CRM / MARKETING
// ============================================================

interface BulkMessageInput {
  customerIds: number[];
  message: string;
}

export async function sendBulkMarketingWhatsApp(input: BulkMessageInput): Promise<ActionResult<{ successCount: number; failureCount: number }>> {
  try {
    const userId = await requireUserId();

    if (!input.message || input.message.trim() === "") {
      return { success: false, error: "Pesan tidak boleh kosong." };
    }

    if (!input.customerIds || input.customerIds.length === 0) {
      return { success: false, error: "Pilih setidaknya satu customer tujuan." };
    }

    const customers = await prisma.customer.findMany({
      where: {
        id: { in: input.customerIds },
        phone: { not: null },
      },
    });

    if (customers.length === 0) {
      return { success: false, error: "Tidak ada customer dengan nomor telepon valid." };
    }

    // Hanya yang panjangnya >= 10
    const validCustomers = customers.filter(c => c.phone && c.phone.length >= 10);
    const targets = validCustomers.map((c) => c.phone as string);

    if (targets.length === 0) {
      return { success: false, error: "Tidak ada nomor tujuan yang valid setelah disaring." };
    }

    // Fonnte free tier mungkin memiliki batasan bulk per detik. 
    // Menggabungkan ke dalam target array comma separated adalah cara standar dari API mereka.
    const sent = await sendFonnteMessage(targets, input.message);
    
    // Record histori broadcast/CRM (BlastMessageHistory)
    await prisma.blastMessageHistory.create({
      data: {
        content: input.message,
        status: sent ? "SUCCESS" : "FAILED",
        userId,
        customers: {
          connect: validCustomers.map((c) => ({ id: c.id })),
        },
      },
    });

    if (!sent) {
      return { success: false, error: "Gagal mengirim bulk message via Fonnte." };
    }

    return {
      success: true,
      data: {
        successCount: targets.length,
        failureCount: input.customerIds.length - targets.length,
      },
    };
  } catch (error) {
    console.error("sendBulkMarketingWhatsApp error:", error);
    return { success: false, error: "Terjadi kesalahan sistem saat mengirim bulk message." };
  }
}

// ============================================================
// READ / HISTORY
// ============================================================

export interface GetBlastMessagesParams {
  page?: number;
  pageSize?: number;
}

export type BlastMessageWithDetails = Prisma.BlastMessageHistoryGetPayload<{
  include: {
    user: { select: { email: true } };
    _count: { select: { customers: true } };
  };
}>;

export interface PaginatedBlastMessages {
  messages: BlastMessageWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getBlastMessages(params: GetBlastMessagesParams = {}): Promise<ActionResult<PaginatedBlastMessages>> {
  try {
    const { page = 1, pageSize = 10 } = params;

    const where: Prisma.BlastMessageHistoryWhereInput = { deletedAt: null };

    const total = await prisma.blastMessageHistory.count({ where });

    const messages = await prisma.blastMessageHistory.findMany({
      where,
      include: {
        user: { select: { email: true } },
        _count: { select: { customers: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      success: true,
      data: {
        messages,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("getBlastMessages error:", error);
    return { success: false, error: "Gagal mengambil riwayat pesan." };
  }
}
