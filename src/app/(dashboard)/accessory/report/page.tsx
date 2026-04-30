import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getAccessoryReport } from "@/actions/report";
import { ReportDateFilter } from "@/components/report-date-filter";
import { AccessoryReportClient } from "./client";

interface AccessoryReportPageProps {
  searchParams: Promise<{
    dateRangeFrom?: string;
    dateRangeTo?: string;
  }>;
}

export default async function AccessoryReportPage({ searchParams }: AccessoryReportPageProps) {
  const params = await searchParams;
  const dateRangeFrom = params.dateRangeFrom || undefined;
  const dateRangeTo = params.dateRangeTo || undefined;

  const result = await getAccessoryReport({ dateRangeFrom, dateRangeTo });

  const data = result.data ?? {
    totalProduk: 0,
    totalItemTerjual: 0,
    totalTransaksiJual: 0,
    totalPendapatan: 0,
    totalKeuntungan: 0,
    totalPembelianStok: 0,
    totalPengeluaranStok: 0,
    nilaiInventaris: 0,
    monthlyData: [],
    topProducts: [],
  };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Aksesoris / Laporan</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Laporan Aksesoris</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Ringkasan performa penjualan dan inventaris aksesoris.
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <ReportDateFilter
            dateRangeFrom={dateRangeFrom}
            dateRangeTo={dateRangeTo}
          />
        </div>

        <AccessoryReportClient data={data} />
      </div>
    </>
  );
}
