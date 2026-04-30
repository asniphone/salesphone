"use server";

import { prisma } from "@/lib/prisma";
import type { PaymentType, Prisma } from "@prisma/client";

// ============================================================
// Types
// ============================================================

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

interface DateRangeParams {
  dateRangeFrom?: string;
  dateRangeTo?: string;
}

function buildDateRange(params: DateRangeParams): { gte: Date; lte: Date } | undefined {
  if (!params.dateRangeFrom) return undefined;

  const fromDate = new Date(params.dateRangeFrom);
  if (isNaN(fromDate.getTime())) return undefined;

  const startOfDay = new Date(fromDate);
  startOfDay.setHours(0, 0, 0, 0);

  let endOfDay: Date;
  if (params.dateRangeTo) {
    const toDate = new Date(params.dateRangeTo);
    if (!isNaN(toDate.getTime())) {
      endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
    } else {
      endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);
    }
  } else {
    endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
  }

  return { gte: startOfDay, lte: endOfDay };
}

// ============================================================
// UNIT REPORT
// ============================================================

export interface UnitReportData {
  // Summary
  totalUnit: number;
  unitAvailable: number;
  unitBooked: number;
  unitSold: number;
  unitReturned: number;
  totalPendapatan: number;    // sum of soldPrice where SOLD
  totalModal: number;         // sum of buyPrice where SOLD
  totalKeuntunganKotor: number;    // totalPendapatan - totalModal
  totalWorkerFee: number;     // sum of workerFee where SOLD
  totalKeuntunganBersih: number;   // totalKeuntunganKotor - totalWorkerFee
  avgFeePerUnit: number;      // totalWorkerFee / unitSold
  // Monthly breakdown
  monthlyData: {
    month: string;          // "2026-01"
    label: string;          // "Januari 2026"
    terjual: number;
    pendapatan: number;
    modal: number;
    keuntunganKotor: number;
    workerFee: number;
    keuntunganBersih: number;
  }[];
  // Status breakdown for pie chart
  statusBreakdown: { name: string; value: number; fill: string }[];
  // Top workers
  topWorkers: {
    name: string;
    unitTerjual: number;
    totalFee: number;
    totalPenjualan: number;
  }[];
  // Payment type breakdown (SOLD only)
  paymentTypeBreakdown: {
    key: PaymentType | "UNSET";
    label: string;
    jumlahUnit: number;
    totalPenjualan: number;
    persentase: number;
  }[];
}

export async function getUnitReport(params: DateRangeParams = {}): Promise<ActionResult<UnitReportData>> {
  try {
    const dateRange = buildDateRange(params);

    // Base where: not deleted
    const baseWhere: Prisma.UnitWhereInput = { deletedAt: null };

    // All units (for status counts)
    const allUnitsWhere: Prisma.UnitWhereInput = { ...baseWhere };

    // Sold units (for financial data)
    const soldWhere: Prisma.UnitWhereInput = {
      ...baseWhere,
      status: "SOLD",
      soldAt: dateRange ? dateRange : undefined,
    };

    // Count by status
    const [totalUnit, unitAvailable, unitBooked, unitSold, unitReturned] = await Promise.all([
      prisma.unit.count({ where: allUnitsWhere }),
      prisma.unit.count({ where: { ...allUnitsWhere, status: "AVAILABLE" } }),
      prisma.unit.count({ where: { ...allUnitsWhere, status: "BOOKED" } }),
      prisma.unit.count({ where: soldWhere }),
      prisma.unit.count({ where: { ...allUnitsWhere, status: "RETURNED" } }),
    ]);

    // Financial: get all sold units in range
    const soldUnits = await prisma.unit.findMany({
      where: soldWhere,
      select: {
        soldPrice: true,
        buyPrice: true,
        soldAt: true,
        paymentType: true,
        workerFee: true,
        workerId: true,
        worker: { select: { name: true } },
      },
    });

    let totalPendapatan = 0;
    let totalModal = 0;
    let totalWorkerFee = 0;
    for (const u of soldUnits) {
      totalPendapatan += u.soldPrice ?? 0;
      totalModal += u.buyPrice ?? 0;
      totalWorkerFee += u.workerFee ?? 0;
    }
    const totalKeuntunganKotor = totalPendapatan - totalModal;
    const totalKeuntunganBersih = totalKeuntunganKotor - totalWorkerFee;
    const avgFeePerUnit = unitSold > 0 ? Math.round(totalWorkerFee / unitSold) : 0;

    // Monthly breakdown
    const monthlyMap = new Map<string, { terjual: number; pendapatan: number; modal: number; workerFee: number }>();

    for (const u of soldUnits) {
      if (!u.soldAt) continue;
      const d = new Date(u.soldAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyMap.get(key) ?? { terjual: 0, pendapatan: 0, modal: 0, workerFee: 0 };
      existing.terjual += 1;
      existing.pendapatan += u.soldPrice ?? 0;
      existing.modal += u.buyPrice ?? 0;
      existing.workerFee += u.workerFee ?? 0;
      monthlyMap.set(key, existing);
    }

    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];

    const monthlyData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => {
        const [year, monthStr] = key.split("-");
        const monthIdx = parseInt(monthStr, 10) - 1;
        return {
          month: key,
          label: `${monthNames[monthIdx]} ${year}`,
          terjual: val.terjual,
          pendapatan: val.pendapatan,
          modal: val.modal,
          keuntunganKotor: val.pendapatan - val.modal,
          workerFee: val.workerFee,
          keuntunganBersih: val.pendapatan - val.modal - val.workerFee,
        };
      });

    const statusBreakdown = [
      { name: "Tersedia", value: unitAvailable, fill: "var(--color-available)" },
      { name: "Dipesan", value: unitBooked, fill: "var(--color-booked)" },
      { name: "Terjual", value: unitSold, fill: "var(--color-sold)" },
      { name: "Dikembalikan", value: unitReturned, fill: "var(--color-returned)" },
    ].filter((s) => s.value > 0);

    // Top workers by unit count
    const workerMap = new Map<string, { unitTerjual: number; totalFee: number; totalPenjualan: number }>();
    for (const u of soldUnits) {
      const wName = u.worker?.name ?? "Tanpa Worker";
      const existing = workerMap.get(wName) ?? { unitTerjual: 0, totalFee: 0, totalPenjualan: 0 };
      existing.unitTerjual += 1;
      existing.totalFee += u.workerFee ?? 0;
      existing.totalPenjualan += u.soldPrice ?? 0;
      workerMap.set(wName, existing);
    }

    const topWorkers = Array.from(workerMap.entries())
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.unitTerjual - a.unitTerjual);

    const paymentTypeSeed: Record<
      PaymentType | "UNSET",
      { label: string; jumlahUnit: number; totalPenjualan: number }
    > = {
      CASH: { label: "Cash", jumlahUnit: 0, totalPenjualan: 0 },
      DEBIT: { label: "Debit", jumlahUnit: 0, totalPenjualan: 0 },
      TRANSFER: { label: "Transfer", jumlahUnit: 0, totalPenjualan: 0 },
      UNSET: { label: "Belum Diisi", jumlahUnit: 0, totalPenjualan: 0 },
    };

    for (const u of soldUnits) {
      const key = u.paymentType ?? "UNSET";
      paymentTypeSeed[key].jumlahUnit += 1;
      paymentTypeSeed[key].totalPenjualan += u.soldPrice ?? 0;
    }

    const paymentTypeBreakdown = ([
      "CASH",
      "DEBIT",
      "TRANSFER",
      "UNSET",
    ] as const)
      .map((key) => {
        const row = paymentTypeSeed[key];
        return {
          key,
          label: row.label,
          jumlahUnit: row.jumlahUnit,
          totalPenjualan: row.totalPenjualan,
          persentase:
            unitSold > 0
              ? Number(((row.jumlahUnit / unitSold) * 100).toFixed(1))
              : 0,
        };
      })
      .filter((row) => row.key !== "UNSET" || row.jumlahUnit > 0);

    return {
      success: true,
      data: {
        totalUnit,
        unitAvailable,
        unitBooked,
        unitSold,
        unitReturned,
        totalPendapatan,
        totalModal,
        totalKeuntunganKotor,
        totalWorkerFee,
        totalKeuntunganBersih,
        avgFeePerUnit,
        monthlyData,
        statusBreakdown,
        topWorkers,
        paymentTypeBreakdown,
      },
    };
  } catch (error) {
    console.error("getUnitReport error:", error);
    return { success: false, error: "Gagal mengambil data laporan unit." };
  }
}

// ============================================================
// ACCESSORY REPORT
// ============================================================

export interface AccessoryReportData {
  // Summary
  totalProduk: number;
  totalItemTerjual: number;       // total quantity sold
  totalTransaksiJual: number;     // count of AccessorySale
  totalPendapatan: number;        // sum of totalPrice
  totalKeuntungan: number;        // sum of totalProfit
  totalPembelianStok: number;     // count of AccessoryPurchase (non-deleted)
  totalPengeluaranStok: number;   // sum of buyPriceTotal from purchases
  nilaiInventaris: number;        // recorded stock × MAC  summed
  // Monthly sales
  monthlyData: {
    month: string;
    label: string;
    transaksi: number;
    pendapatan: number;
    keuntungan: number;
    itemTerjual: number;
  }[];
  // Top products
  topProducts: {
    name: string;
    totalTerjual: number;
    totalPendapatan: number;
  }[];
}

export async function getAccessoryReport(params: DateRangeParams = {}): Promise<ActionResult<AccessoryReportData>> {
  try {
    const dateRange = buildDateRange(params);

    // Produk aktif
    const totalProduk = await prisma.accessory.count({ where: { deletedAt: null } });

    // Inventaris value
    const inventarisAcc = await prisma.accessory.findMany({
      where: { deletedAt: null },
      select: { recordedStock: true, recordedBuyPrice: true },
    });
    const nilaiInventaris = inventarisAcc.reduce(
      (sum, a) => sum + a.recordedStock * a.recordedBuyPrice,
      0
    );

    // Sales where (with optional date range)
    const salesWhere: Prisma.AccessorySaleWhereInput = {
      deletedAt: null,
      createdAt: dateRange ? dateRange : undefined,
    };

    const sales = await prisma.accessorySale.findMany({
      where: salesWhere,
      select: {
        id: true,
        totalPrice: true,
        totalProfit: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            sellPricePerUnit: true,
            accessory: { select: { name: true } },
          },
        },
      },
    });

    const totalTransaksiJual = sales.length;
    let totalPendapatan = 0;
    let totalKeuntungan = 0;
    let totalItemTerjual = 0;

    for (const sale of sales) {
      totalPendapatan += sale.totalPrice;
      totalKeuntungan += sale.totalProfit;
      for (const item of sale.items) {
        totalItemTerjual += item.quantity;
      }
    }

    // Purchases (all time for pengeluaran snapshot)
    const purchaseWhere: Prisma.AccessoryPurchaseWhereInput = {
      deletedAt: null,
      createdAt: dateRange ? dateRange : undefined,
    };
    const purchaseAgg = await prisma.accessoryPurchase.aggregate({
      where: purchaseWhere,
      _count: true,
      _sum: { buyPriceTotal: true },
    });
    const totalPembelianStok = purchaseAgg._count;
    const totalPengeluaranStok = purchaseAgg._sum.buyPriceTotal ?? 0;

    // Monthly breakdown
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    const monthlyMap = new Map<string, { transaksi: number; pendapatan: number; keuntungan: number; itemTerjual: number }>();

    for (const sale of sales) {
      const d = new Date(sale.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyMap.get(key) ?? { transaksi: 0, pendapatan: 0, keuntungan: 0, itemTerjual: 0 };
      existing.transaksi += 1;
      existing.pendapatan += sale.totalPrice;
      existing.keuntungan += sale.totalProfit;
      for (const item of sale.items) {
        existing.itemTerjual += item.quantity;
      }
      monthlyMap.set(key, existing);
    }

    const monthlyData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => {
        const [year, monthStr] = key.split("-");
        const monthIdx = parseInt(monthStr, 10) - 1;
        return {
          month: key,
          label: `${monthNames[monthIdx]} ${year}`,
          ...val,
        };
      });

    // Top products by quantity sold
    const productMap = new Map<string, { totalTerjual: number; totalPendapatan: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const name = item.accessory.name;
        const existing = productMap.get(name) ?? { totalTerjual: 0, totalPendapatan: 0 };
        existing.totalTerjual += item.quantity;
        existing.totalPendapatan += item.quantity * item.sellPricePerUnit;
        productMap.set(name, existing);
      }
    }

    const topProducts = Array.from(productMap.entries())
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.totalTerjual - a.totalTerjual)
      .slice(0, 10);

    return {
      success: true,
      data: {
        totalProduk,
        totalItemTerjual,
        totalTransaksiJual,
        totalPendapatan,
        totalKeuntungan,
        totalPembelianStok,
        totalPengeluaranStok,
        nilaiInventaris,
        monthlyData,
        topProducts,
      },
    };
  } catch (error) {
    console.error("getAccessoryReport error:", error);
    return { success: false, error: "Gagal mengambil data laporan aksesoris." };
  }
}

// ============================================================
// WORKER REPORT
// ============================================================

export interface WorkerReportData {
  rankingBy: WorkerRankingBy;
  totalWorker: number;
  workerAktif: number;
  totalUnitTerjual: number;
  totalTransaksiAksesoris: number;
  totalPendapatanGabungan: number;
  totalLabaKotorGabungan: number;
  totalFeeWorkerGabungan: number;
  totalLabaBersihUntukToko: number;
  leaderboard: {
    rank: number;
    workerId: number;
    name: string;
    isActive: boolean;
    unitTerjual: number;
    transaksiAksesoris: number;
    itemAksesorisTerjual: number;
    totalPendapatan: number;
    totalLabaKotor: number;
    totalFeeWorker: number;
    skorPerforma: number;
    totalTransaksi: number;
  }[];
}

export type WorkerRankingBy =
  | "laba-bersih"
  | "pendapatan"
  | "jumlah-transaksi";

export async function getWorkerReport(
  params: DateRangeParams & { rankingBy?: WorkerRankingBy } = {},
): Promise<ActionResult<WorkerReportData>> {
  try {
    const dateRange = buildDateRange(params);
    const rankingBy = params.rankingBy ?? "laba-bersih";

    const [totalWorker, workerAktif, workers] = await Promise.all([
      prisma.worker.count({ where: { deletedAt: null } }),
      prisma.worker.count({ where: { deletedAt: null, isActive: true } }),
      prisma.worker.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          isActive: true,
          units: {
            where: {
              deletedAt: null,
              status: "SOLD",
              soldAt: dateRange ? dateRange : undefined,
            },
            select: {
              soldPrice: true,
              buyPrice: true,
              workerFee: true,
            },
          },
          accessorySales: {
            where: {
              deletedAt: null,
              createdAt: dateRange ? dateRange : undefined,
            },
            select: {
              totalPrice: true,
              totalProfit: true,
              feeWorker: true,
              items: {
                select: {
                  quantity: true,
                },
              },
            },
          },
        },
      }),
    ]);

    let totalUnitTerjual = 0;
    let totalTransaksiAksesoris = 0;
    let totalPendapatanGabungan = 0;
    let totalLabaKotorGabungan = 0;
    let totalFeeWorkerGabungan = 0;

    const leaderboard = workers
      .map((worker) => {
        let unitTerjual = 0;
        let transaksiAksesoris = 0;
        let itemAksesorisTerjual = 0;
        let pendapatanUnit = 0;
        let pendapatanAksesoris = 0;
        let labaKotorUnit = 0;
        let labaKotorAksesoris = 0;
        let feeUnit = 0;
        let feeAksesoris = 0;

        for (const unit of worker.units) {
          unitTerjual += 1;
          pendapatanUnit += unit.soldPrice ?? 0;
          labaKotorUnit += (unit.soldPrice ?? 0) - (unit.buyPrice ?? 0);
          feeUnit += unit.workerFee ?? 0;
        }

        for (const sale of worker.accessorySales) {
          transaksiAksesoris += 1;
          pendapatanAksesoris += sale.totalPrice;
          labaKotorAksesoris += sale.totalProfit;
          feeAksesoris += sale.feeWorker;
          for (const item of sale.items) {
            itemAksesorisTerjual += item.quantity;
          }
        }

        const totalPendapatan = pendapatanUnit + pendapatanAksesoris;
        const totalLabaKotor = labaKotorUnit + labaKotorAksesoris;
        const totalFeeWorker = feeUnit + feeAksesoris;
        const skorPerforma = totalLabaKotor - totalFeeWorker;
        const totalTransaksi = unitTerjual + transaksiAksesoris;

        totalUnitTerjual += unitTerjual;
        totalTransaksiAksesoris += transaksiAksesoris;
        totalPendapatanGabungan += totalPendapatan;
        totalLabaKotorGabungan += totalLabaKotor;
        totalFeeWorkerGabungan += totalFeeWorker;

        return {
          rank: 0,
          workerId: worker.id,
          name: worker.name,
          isActive: worker.isActive,
          unitTerjual,
          transaksiAksesoris,
          itemAksesorisTerjual,
          totalPendapatan,
          totalLabaKotor,
          totalFeeWorker,
          skorPerforma,
          totalTransaksi,
        };
      })
      .sort((a, b) => {
        if (rankingBy === "pendapatan" && b.totalPendapatan !== a.totalPendapatan) {
          return b.totalPendapatan - a.totalPendapatan;
        }
        if (rankingBy === "jumlah-transaksi" && b.totalTransaksi !== a.totalTransaksi) {
          return b.totalTransaksi - a.totalTransaksi;
        }
        if (rankingBy === "laba-bersih" && b.skorPerforma !== a.skorPerforma) {
          return b.skorPerforma - a.skorPerforma;
        }
        if (b.skorPerforma !== a.skorPerforma) return b.skorPerforma - a.skorPerforma;
        if (b.totalLabaKotor !== a.totalLabaKotor) {
          return b.totalLabaKotor - a.totalLabaKotor;
        }
        if (b.totalPendapatan !== a.totalPendapatan) {
          return b.totalPendapatan - a.totalPendapatan;
        }
        return a.name.localeCompare(b.name);
      })
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));

    const totalLabaBersihUntukToko =
      totalLabaKotorGabungan - totalFeeWorkerGabungan;

    return {
      success: true,
      data: {
        rankingBy,
        totalWorker,
        workerAktif,
        totalUnitTerjual,
        totalTransaksiAksesoris,
        totalPendapatanGabungan,
        totalLabaKotorGabungan,
        totalFeeWorkerGabungan,
        totalLabaBersihUntukToko,
        leaderboard,
      },
    };
  } catch (error) {
    console.error("getWorkerReport error:", error);
    return { success: false, error: "Gagal mengambil laporan worker." };
  }
}
// ============================================================
// DASHBOARD SUMMARY
// ============================================================

export interface DashboardSummaryData {
  unit: {
    available: number;
    soldThisMonth: number;
    pendapatanThisMonth: number;
    keuntunganThisMonth: number;
  };
  accessory: {
    terjualThisMonth: number;
    pendapatanThisMonth: number;
    keuntunganThisMonth: number;
  };
  customer: {
    total: number;
    newThisMonth: number;
  };
  worker: {
    active: number;
  };
  cashflow: {
    saldoAkhir: number;
  };
}

export async function getDashboardSummary(): Promise<ActionResult<DashboardSummaryData>> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Unit
    const [unitAvailable, soldUnitsThisMonth] = await Promise.all([
      prisma.unit.count({ where: { deletedAt: null, status: "AVAILABLE" } }),
      prisma.unit.findMany({
        where: {
          deletedAt: null,
          status: "SOLD",
          soldAt: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { soldPrice: true, buyPrice: true, workerFee: true },
      }),
    ]);

    let unitPendapatan = 0;
    let unitKeuntungan = 0;
    for (const u of soldUnitsThisMonth) {
      const p = u.soldPrice ?? 0;
      const b = u.buyPrice ?? 0;
      const f = u.workerFee ?? 0;
      unitPendapatan += p;
      unitKeuntungan += (p - b - f);
    }

    // 2. Aksesoris
    const accessorySalesThisMonth = await prisma.accessorySale.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      select: {
        totalPrice: true,
        totalProfit: true,
        items: { select: { quantity: true } },
      },
    });

    let accTerjual = 0;
    let accPendapatan = 0;
    let accKeuntungan = 0;
    for (const sale of accessorySalesThisMonth) {
      accPendapatan += sale.totalPrice;
      accKeuntungan += sale.totalProfit;
      for (const item of sale.items) {
        accTerjual += item.quantity;
      }
    }

    // 3. Customer
    const [totalCustomers, newCustomersThisMonth] = await Promise.all([
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.customer.count({
        where: {
          deletedAt: null,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
    ]);

    // 4. Worker
    const activeWorkers = await prisma.worker.count({
      where: { deletedAt: null, isActive: true },
    });

    // 5. Cashflow Saldo Akhir
    let saldoAkhir = 0;
    const cashflowSums = await prisma.cashflow.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      _sum: { amount: true },
    });
    
    for (const group of cashflowSums) {
      if (group.type === "INCOME") {
        saldoAkhir += group._sum.amount ?? 0;
      } else if (group.type === "EXPENSE") {
        saldoAkhir -= group._sum.amount ?? 0;
      }
    }

    return {
      success: true,
      data: {
        unit: {
          available: unitAvailable,
          soldThisMonth: soldUnitsThisMonth.length,
          pendapatanThisMonth: unitPendapatan,
          keuntunganThisMonth: unitKeuntungan,
        },
        accessory: {
          terjualThisMonth: accTerjual,
          pendapatanThisMonth: accPendapatan,
          keuntunganThisMonth: accKeuntungan,
        },
        customer: {
          total: totalCustomers,
          newThisMonth: newCustomersThisMonth,
        },
        worker: {
          active: activeWorkers,
        },
        cashflow: {
          saldoAkhir,
        },
      },
    };
  } catch (error) {
    console.error("getDashboardSummary error:", error);
    return { success: false, error: "Gagal mengambil summary dashboard." };
  }
}
