import Link from "next/link";
import { getUnits } from "@/actions/unit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { UnitFilter, UnitPagination } from "./filter";
import type { Status } from "@prisma/client";
import Image from "next/image";
import { IMAGE_PLACEHOLDER } from "@/constants/common";
import { UNIT_STATUS_CONFIG } from "@/constants/unit";

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

const VALID_STATUSES: Status[] = ["AVAILABLE", "BOOKED", "SOLD", "RETURNED"];
const VALID_SORT_BY = ["createdAt", "name", "buyPrice", "soldPrice", "buyAt", "soldAt"] as const;

interface UnitListPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
    dateTarget?: string;
    dateRangeFrom?: string;
    dateRangeTo?: string;
  }>;
}

export default async function UnitListPage({ searchParams }: UnitListPageProps) {
  const params = await searchParams;

  // Parse & validate search params
  const search = params.search || undefined;
  const status = VALID_STATUSES.includes(params.status as Status)
    ? (params.status as Status)
    : undefined;
  const sortBy = VALID_SORT_BY.includes(params.sortBy as (typeof VALID_SORT_BY)[number])
    ? (params.sortBy as (typeof VALID_SORT_BY)[number])
    : "createdAt";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSize = [5, 10, 25, 50].includes(parseInt(params.pageSize || "10", 10))
    ? parseInt(params.pageSize!, 10)
    : 10;

  const dateTarget = ["createdAt", "buyAt", "soldAt"].includes(params.dateTarget as string)
    ? (params.dateTarget as "createdAt" | "buyAt" | "soldAt")
    : undefined;
  const dateRangeFrom = params.dateRangeFrom || undefined;
  const dateRangeTo = params.dateRangeTo || undefined;

  const result = await getUnits({
    search,
    status,
    sortBy,
    sortOrder,
    page: page || 1,
    pageSize: pageSize || 10,
    dateTarget,
    dateRangeFrom,
    dateRangeTo
  });
  const data = result.data ?? { units: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Unit</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Daftar Unit</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Kelola unit handphone bekas.{" "}
              <span className="font-medium">{data.total} unit</span> ditemukan.
            </p>
          </div>
          <Button asChild>
            <Link href="/unit/create">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Unit
            </Link>
          </Button>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <UnitFilter
            search={search ?? ""}
            status={status ?? "ALL"}
            sort={`${sortBy}-${sortOrder}`}
            pageSize={pageSize.toString()}
            dateTarget={dateTarget}
            dateRangeFrom={dateRangeFrom}
            dateRangeTo={dateRangeTo}
          />
        </div>

        {data.units.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {search || status
                ? "Tidak ada unit yang cocok dengan filter."
                : "Belum ada data unit."}
            </p>
            {!search && !status && (
              <Button asChild variant="outline" className="mt-4">
                <Link href="/unit/create">Tambah Unit Pertama</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Harga (Rp)</TableHead>
                    <TableHead>Transaksi</TableHead>
                    <TableHead>Laba</TableHead>
                    <TableHead>Ditambahkan</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.units.map((unit) => {
                    const config = UNIT_STATUS_CONFIG[unit.status];
                    return (
                      <TableRow key={unit.id}>
                        <TableCell>
                          <div className="w-8 h-8 rounded-md overflow-hidden">
                            <Image src={unit.images[0] ?? IMAGE_PLACEHOLDER} className="w-8 h-8 rounded-md object-cover" alt="" width={100} height={100} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/unit/${unit.id}`}
                            className="font-medium hover:underline block leading-tight"
                          >
                            {unit.name}
                          </Link>
                          <span className="text-muted-foreground font-mono text-xs">
                            {unit.imei ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-muted-foreground text-xs font-mono">B: {formatCurrency(unit.buyPrice)}</span>
                            <span className="font-medium text-xs font-mono">J: {formatCurrency(unit.soldPrice)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-muted-foreground text-xs">B: {formatDate(unit.buyAt)}</span>
                            <span className="text-muted-foreground text-xs">J: {formatDate(unit.soldAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {unit.grossProfit ? formatCurrency(unit.grossProfit) : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(unit.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/unit/${unit.id}`}>Detail</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <UnitPagination
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
