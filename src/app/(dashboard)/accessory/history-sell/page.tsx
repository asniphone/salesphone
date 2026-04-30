import { getAccessorySales } from "@/actions/accessory";
import { getCustomers } from "@/actions/customer";
import { getWorkers } from "@/actions/worker";
import { getCommonInformation } from "@/actions/common-information";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Package } from "lucide-react";
import { HistorySellFilter, HistorySellPagination } from "./filter";
import { AccessoryHistorySellClient } from "./client";

interface AccessoryHistorySellPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
    pageSize?: string;
    dateRangeFrom?: string;
    dateRangeTo?: string;
  }>;
}

export default async function AccessoryHistorySellPage({ searchParams }: AccessoryHistorySellPageProps) {
  const params = await searchParams;

  const search = params.search || undefined;
  const pageRaw = parseInt(params.page || "1", 10);
  const page = isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  
  const pageSizeRaw = parseInt(params.pageSize || "10", 10);
  const pageSize = [5, 10, 25, 50].includes(pageSizeRaw)
    ? pageSizeRaw
    : 10;
  const dateRangeFrom = params.dateRangeFrom || undefined;
  const dateRangeTo = params.dateRangeTo || undefined;

  const [result, customersResult, workersResult, commonInformationResult] = await Promise.all([
    getAccessorySales({
      search,
      page,
      pageSize,
      dateRangeFrom,
      dateRangeTo,
    }),
    getCustomers(),
    getWorkers(),
    getCommonInformation(),
  ]);

  const data = result.data ?? {
    sales: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  };
  const customers = customersResult.data ?? [];
  const workers = workersResult.data ?? [];
  const storeInformation = commonInformationResult.data ?? {
    storeName: "POS Internal",
    storeAddress: "-",
    storePhone: "-",
    storeLogo: null,
    footNoteReceipt: null,
    unitFeePercentage: 30,
  };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Aksesoris / Riwayat Penjualan</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Riwayat Penjualan Aksesoris</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Catatan transaksi penjualan.{" "}
              <span className="font-medium">{data.total} transaksi</span> ditemukan.
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <HistorySellFilter
            search={search ?? ""}
            pageSize={pageSize.toString()}
            dateRangeFrom={dateRangeFrom}
            dateRangeTo={dateRangeTo}
          />
        </div>

        {data.sales.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search || dateRangeFrom ? "Tidak ada riwayat penjualan yang cocok dengan filter." : "Belum ada history penjualan aksesoris."}
            </p>
          </div>
        ) : (
          <>
            <AccessoryHistorySellClient
              sales={data.sales}
              customers={customers}
              workers={workers}
              storeInformation={{
                storeName: storeInformation.storeName,
                storeAddress: storeInformation.storeAddress,
                storePhone: storeInformation.storePhone,
                storeLogo: storeInformation.storeLogo,
                footNoteReceipt: storeInformation.footNoteReceipt,
              }}
            />

            {/* Pagination */}
            <HistorySellPagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
            />
          </>
        )}
      </div>
    </>
  );
}
