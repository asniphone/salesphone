import type { CashflowType } from "@prisma/client";
import { getCashflows } from "@/actions/cashflow";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { CashflowFilter, CashflowPagination } from "./filter";
import { CashflowListClient } from "./client";

const VALID_TYPES: CashflowType[] = ["INCOME", "EXPENSE"];
const VALID_SORT_BY = ["transactionDate", "createdAt", "updatedAt", "amount", "note"] as const;
const VALID_DATE_TARGET = ["transactionDate", "createdAt"] as const;

interface CashflowPageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
    dateTarget?: string;
    dateRangeFrom?: string;
    dateRangeTo?: string;
  }>;
}

export default async function CashflowPage({ searchParams }: CashflowPageProps) {
  const params = await searchParams;

  const search = params.search || undefined;
  const type = VALID_TYPES.includes(params.type as CashflowType)
    ? (params.type as CashflowType)
    : undefined;
  const sortBy = VALID_SORT_BY.includes(params.sortBy as (typeof VALID_SORT_BY)[number])
    ? (params.sortBy as (typeof VALID_SORT_BY)[number])
    : "transactionDate";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";
  const pageRaw = parseInt(params.page || "1", 10);
  const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  const pageSizeRaw = parseInt(params.pageSize || "10", 10);
  const pageSize = [5, 10, 25, 50].includes(pageSizeRaw) ? pageSizeRaw : 10;
  const dateTarget = VALID_DATE_TARGET.includes(
    params.dateTarget as (typeof VALID_DATE_TARGET)[number],
  )
    ? (params.dateTarget as (typeof VALID_DATE_TARGET)[number])
    : "transactionDate";
  const dateRangeFrom = params.dateRangeFrom || undefined;
  const dateRangeTo = params.dateRangeTo || undefined;

  const result = await getCashflows({
    search,
    type,
    sortBy,
    sortOrder,
    page,
    pageSize,
    dateTarget,
    dateRangeFrom,
    dateRangeTo,
  });

  const data = result.data ?? {
    cashflows: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
    summary: {
      income: 0,
      expense: 0,
      net: 0,
    },
  };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Pemasukan & Pengeluaran Lainnya</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Arus Kas Operasional</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola pemasukan dan pengeluaran operasional.{" "}
            <span className="font-medium">{data.total} transaksi</span> ditemukan.
          </p>
        </div>

        <div className="mb-4">
          <CashflowFilter
            search={search ?? ""}
            type={type ?? "ALL"}
            sort={`${sortBy}-${sortOrder}`}
            pageSize={String(pageSize)}
            dateTarget={dateTarget}
            dateRangeFrom={dateRangeFrom}
            dateRangeTo={dateRangeTo}
          />
        </div>

        <CashflowListClient cashflows={data.cashflows} summary={data.summary} />

        {data.cashflows.length > 0 && (
          <CashflowPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
          />
        )}
      </div>
    </>
  );
}
