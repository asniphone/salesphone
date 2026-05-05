import type { LedgerActionType, ReferenceType } from "@prisma/client";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { getLedgers } from "@/actions/ledger-read";
import { getCurrentUserAccess } from "@/lib/access";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { LedgerListClient } from "./client";
import { LedgerFilter, LedgerPagination } from "./filter";

const VALID_ACTION: LedgerActionType[] = ["CREATE", "UPDATE", "DELETE"];
const VALID_REFERENCE: ReferenceType[] = [
  "UNIT_SALE",
  "UNIT_PURCHASE",
  "ACCESSORY_SALE",
  "ACCESSORY_PURCHASE",
  "CASHFLOW",
  "IMBURSEMENT",
];
const VALID_SORT_BY = ["createdAt", "transactionDate", "id", "gapAmount"] as const;
const VALID_DATE_TARGET = ["createdAt", "transactionDate"] as const;

interface LedgerPageProps {
  searchParams: Promise<{
    search?: string;
    actionType?: string;
    referenceType?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
    dateTarget?: string;
    dateRangeFrom?: string;
    dateRangeTo?: string;
  }>;
}

export default async function LedgerPage({ searchParams }: LedgerPageProps) {
  const userAccess = await getCurrentUserAccess();
  if (!userAccess) redirect("/login");
  if (!userAccess.accessLedgerRead) redirect("/profile?forbidden=1");

  const params = await searchParams;
  const search = params.search || undefined;
  const actionType = VALID_ACTION.includes(params.actionType as LedgerActionType)
    ? (params.actionType as LedgerActionType)
    : undefined;
  const referenceType = VALID_REFERENCE.includes(params.referenceType as ReferenceType)
    ? (params.referenceType as ReferenceType)
    : undefined;
  const sortBy = VALID_SORT_BY.includes(params.sortBy as (typeof VALID_SORT_BY)[number])
    ? (params.sortBy as (typeof VALID_SORT_BY)[number])
    : "createdAt";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";
  const pageRaw = parseInt(params.page || "1", 10);
  const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  const pageSizeRaw = parseInt(params.pageSize || "10", 10);
  const pageSize = [5, 10, 25, 50].includes(pageSizeRaw) ? pageSizeRaw : 10;
  const dateTarget = VALID_DATE_TARGET.includes(
    params.dateTarget as (typeof VALID_DATE_TARGET)[number],
  )
    ? (params.dateTarget as (typeof VALID_DATE_TARGET)[number])
    : "createdAt";
  const dateRangeFrom = params.dateRangeFrom || undefined;
  const dateRangeTo = params.dateRangeTo || undefined;

  const result = await getLedgers({
    search,
    actionType,
    referenceType,
    sortBy,
    sortOrder,
    page,
    pageSize,
    dateTarget,
    dateRangeFrom,
    dateRangeTo,
  });

  const data = result.data ?? {
    ledgers: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
    summary: {
      currentBalance: "0",
      totalIn: "0",
      totalOut: "0",
    },
  };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Riwayat Saldo</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Riwayat Saldo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Menampilkan jejak perubahan saldo berbasis ledger append-only.{" "}
            <span className="font-medium">{data.total} transaksi</span> ditemukan.
          </p>
        </div>

        <div className="mb-4">
          <LedgerFilter
            search={search ?? ""}
            actionType={actionType ?? "ALL"}
            referenceType={referenceType ?? "ALL"}
            sort={`${sortBy}-${sortOrder}`}
            pageSize={String(pageSize)}
            dateTarget={dateTarget}
            dateRangeFrom={dateRangeFrom}
            dateRangeTo={dateRangeTo}
          />
        </div>

        {data.ledgers.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search || actionType || referenceType || dateRangeFrom
                ? "Tidak ada data ledger yang cocok dengan filter."
                : "Belum ada data ledger."}
            </p>
          </div>
        ) : (
          <>
            <LedgerListClient ledgers={data.ledgers} summary={data.summary} />
            <LedgerPagination
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

