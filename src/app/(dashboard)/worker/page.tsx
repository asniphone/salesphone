import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getWorkersPaginated } from "@/actions/worker";
import { WorkerListClient } from "./client";
import { Button } from "@/components/ui/button";
import { Plus, HardHat } from "lucide-react";
import Link from "next/link";
import { WorkerFilter, WorkerPagination } from "./filter";

const VALID_SORT_BY = ["createdAt", "name"] as const;

interface WorkerListPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
    dateRangeFrom?: string;
    dateRangeTo?: string;
  }>;
}

export default async function WorkerListPage({ searchParams }: WorkerListPageProps) {
  const params = await searchParams;

  const search = params.search || undefined;
  const status =
    params.status === "ACTIVE" || params.status === "INACTIVE"
      ? params.status
      : "ALL";
  const isActive =
    status === "ACTIVE" ? true : status === "INACTIVE" ? false : undefined;
  const sortBy = VALID_SORT_BY.includes(params.sortBy as (typeof VALID_SORT_BY)[number])
    ? (params.sortBy as (typeof VALID_SORT_BY)[number])
    : "createdAt";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSize = [5, 10, 25, 50].includes(parseInt(params.pageSize || "10", 10))
    ? parseInt(params.pageSize || "10", 10)
    : 10;
  const dateRangeFrom = params.dateRangeFrom || undefined;
  const dateRangeTo = params.dateRangeTo || undefined;

  const result = await getWorkersPaginated({
    search,
    isActive,
    sortBy,
    sortOrder,
    page,
    pageSize,
    dateRangeFrom,
    dateRangeTo,
  });
  const data = result.data ?? { workers: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Worker</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Daftar Worker</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Kelola data pekerja/sales.{" "}
              <span className="font-medium">{data.total} worker</span> ditemukan.
            </p>
          </div>
          <Button asChild>
            <Link href="/worker/create">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Worker
            </Link>
          </Button>
        </div>

        <div className="mb-4">
          <WorkerFilter
            search={search ?? ""}
            status={status}
            sort={`${sortBy}-${sortOrder}`}
            pageSize={pageSize.toString()}
            dateRangeFrom={dateRangeFrom}
            dateRangeTo={dateRangeTo}
          />
        </div>

        {data.workers.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <HardHat className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search || status !== "ALL" || dateRangeFrom
                ? "Tidak ada worker yang cocok dengan filter."
                : "Belum ada data worker."}
            </p>
          </div>
        ) : (
          <>
            <WorkerListClient workers={data.workers} />
            <WorkerPagination
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
