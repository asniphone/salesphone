import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getUnitReport } from "@/actions/report";
import { ReportDateFilter } from "@/components/report-date-filter";
import { UnitReportClient } from "./client";

interface UnitReportPageProps {
  searchParams: Promise<{
    dateRangeFrom?: string;
    dateRangeTo?: string;
  }>;
}

export default async function UnitReportPage({ searchParams }: UnitReportPageProps) {
  const params = await searchParams;
  const dateRangeFrom = params.dateRangeFrom || undefined;
  const dateRangeTo = params.dateRangeTo || undefined;

  const result = await getUnitReport({ dateRangeFrom, dateRangeTo });

  const data = result.data ?? {
    totalUnit: 0,
    unitAvailable: 0,
    unitBooked: 0,
    unitSold: 0,
    unitReturned: 0,
    totalPendapatan: 0,
    totalModal: 0,
    totalKeuntunganKotor: 0,
    totalWorkerFee: 0,
    totalKeuntunganBersih: 0,
    avgFeePerUnit: 0,
    monthlyData: [],
    statusBreakdown: [],
    topWorkers: [],
    paymentTypeBreakdown: [],
  };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Unit / Laporan</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Laporan Penjualan Unit</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Ringkasan performa penjualan handphone bekas.
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

        <UnitReportClient data={data} />
      </div>
    </>
  );
}
