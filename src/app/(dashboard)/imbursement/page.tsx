import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/access";
import {
  getImbursements,
  getImbursementWorkerOptions,
} from "@/actions/imbursement";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ImbursementFilter, ImbursementPagination } from "./filter";
import { ImbursementListClient } from "./client";

const VALID_SORT_BY = ["createdAt", "updatedAt", "amount", "note"] as const;
const VALID_DATE_TARGET = ["createdAt", "updatedAt"] as const;

interface ImbursementPageProps {
  searchParams: Promise<{
    search?: string;
    workerId?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
    dateTarget?: string;
    dateRangeFrom?: string;
    dateRangeTo?: string;
  }>;
}

export default async function ImbursementPage({
  searchParams,
}: ImbursementPageProps) {
  const userAccess = await getCurrentUserAccess();
  if (!userAccess) redirect("/login");
  if (!userAccess.accessImbursementRead) redirect("/profile?forbidden=1");

  const params = await searchParams;

  const search = params.search || undefined;
  const workerIdRaw = Number.parseInt(params.workerId || "", 10);
  const workerId = Number.isNaN(workerIdRaw) ? undefined : workerIdRaw;
  const sortBy = VALID_SORT_BY.includes(params.sortBy as (typeof VALID_SORT_BY)[number])
    ? (params.sortBy as (typeof VALID_SORT_BY)[number])
    : "createdAt";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";
  const pageRaw = Number.parseInt(params.page || "1", 10);
  const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  const pageSizeRaw = Number.parseInt(params.pageSize || "10", 10);
  const pageSize = [5, 10, 25, 50].includes(pageSizeRaw) ? pageSizeRaw : 10;
  const dateTarget = VALID_DATE_TARGET.includes(
    params.dateTarget as (typeof VALID_DATE_TARGET)[number],
  )
    ? (params.dateTarget as (typeof VALID_DATE_TARGET)[number])
    : "createdAt";
  const dateRangeFrom = params.dateRangeFrom || undefined;
  const dateRangeTo = params.dateRangeTo || undefined;

  const [result, workerOptionsResult] = await Promise.all([
    getImbursements({
      search,
      workerId,
      sortBy,
      sortOrder,
      page,
      pageSize,
      dateTarget,
      dateRangeFrom,
      dateRangeTo,
    }),
    getImbursementWorkerOptions(),
  ]);

  const data = result.data ?? {
    imbursements: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
    summary: {
      writtenFee: 0,
      reimbursed: 0,
      remaining: 0,
    },
  };
  const workers = workerOptionsResult.data ?? [];

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Pencairan Fee Worker</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Pencairan Fee Worker</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Catat fee worker yang sudah dicairkan.{" "}
            <span className="font-medium">{data.total} pencairan</span> ditemukan.
          </p>
        </div>

        <div className="mb-4">
          <ImbursementFilter
            search={search ?? ""}
            workerId={workerId ? String(workerId) : "ALL"}
            workers={workers}
            sort={`${sortBy}-${sortOrder}`}
            pageSize={String(pageSize)}
            dateTarget={dateTarget}
            dateRangeFrom={dateRangeFrom}
            dateRangeTo={dateRangeTo}
          />
        </div>

        <ImbursementListClient
          imbursements={data.imbursements}
          workers={workers}
          summary={data.summary}
          userAccess={userAccess}
        />

        {data.imbursements.length > 0 && (
          <ImbursementPagination
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
