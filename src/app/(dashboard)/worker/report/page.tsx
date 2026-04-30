import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getWorkerReport } from "@/actions/report";
import { ReportDateFilter } from "@/components/report-date-filter";
import { WorkerReportClient } from "./client";

interface WorkerReportPageProps {
  searchParams: Promise<{
    dateRangeFrom?: string;
    dateRangeTo?: string;
    rankingBy?: "laba-bersih" | "pendapatan" | "jumlah-transaksi";
  }>;
}

export default async function WorkerReportPage({
  searchParams,
}: WorkerReportPageProps) {
  const params = await searchParams;
  const dateRangeFrom = params.dateRangeFrom || undefined;
  const dateRangeTo = params.dateRangeTo || undefined;
  const rankingBy = params.rankingBy || "laba-bersih";

  const result = await getWorkerReport({ dateRangeFrom, dateRangeTo, rankingBy });

  const data = result.data ?? {
    rankingBy,
    totalWorker: 0,
    workerAktif: 0,
    totalUnitTerjual: 0,
    totalTransaksiAksesoris: 0,
    totalPendapatanGabungan: 0,
    totalLabaKotorGabungan: 0,
    totalFeeWorkerGabungan: 0,
    totalLabaBersihUntukToko: 0,
    leaderboard: [],
  };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Worker / Laporan</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Laporan Worker</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Leaderboard performa worker berdasarkan basis ranking yang bisa dipilih.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <ReportDateFilter
            dateRangeFrom={dateRangeFrom}
            dateRangeTo={dateRangeTo}
          />
        </div>

        <WorkerReportClient data={data} />
      </div>
    </>
  );
}
