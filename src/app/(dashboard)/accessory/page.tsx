import Link from "next/link";
import { getAccessories } from "@/actions/accessory";
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
import { Plus, Package, ShoppingCart } from "lucide-react";
import { AccessoryFilter, AccessoryPagination } from "./filter";
import Image from "next/image";
import { IMAGE_PLACEHOLDER } from "@/constants/common";
import { Badge } from "@/components/ui/badge";

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

const VALID_SORT_BY = ["createdAt", "name", "sellPrice", "recordedStock"] as const;

interface AccessoryListPageProps {
  searchParams: Promise<{
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
    dateRangeFrom?: string;
    dateRangeTo?: string;
  }>;
}

export default async function AccessoryListPage({ searchParams }: AccessoryListPageProps) {
  const params = await searchParams;

  const search = params.search || undefined;
  const sortBy = VALID_SORT_BY.includes(params.sortBy as (typeof VALID_SORT_BY)[number])
    ? (params.sortBy as (typeof VALID_SORT_BY)[number])
    : "createdAt";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";
  const pageRaw = parseInt(params.page || "1", 10);
  const page = isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  
  const pageSizeRaw = parseInt(params.pageSize || "10", 10);
  const pageSize = [5, 10, 25, 50].includes(pageSizeRaw)
    ? pageSizeRaw
    : 10;
  const dateRangeFrom = params.dateRangeFrom || undefined;
  const dateRangeTo = params.dateRangeTo || undefined;

  const result = await getAccessories({
    search,
    sortBy,
    sortOrder,
    page,
    pageSize,
    dateRangeFrom,
    dateRangeTo,
  });

  const data = result.data ?? {
    accessories: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Aksesoris</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Daftar Aksesoris</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Kelola stok aksesoris.{" "}
              <span className="font-medium">{data.total} item</span> ditemukan.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/accessory/sell">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Jual
              </Link>
            </Button>
            <Button asChild>
              <Link href="/accessory/create">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Aksesoris
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <AccessoryFilter
            search={search ?? ""}
            sort={`${sortBy}-${sortOrder}`}
            pageSize={pageSize.toString()}
            dateRangeFrom={dateRangeFrom}
            dateRangeTo={dateRangeTo}
          />
        </div>

        {data.accessories.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? "Tidak ada aksesoris yang cocok dengan filter." : "Belum ada data aksesoris."}
            </p>
            {!search && (
              <Button asChild variant="outline" className="mt-4">
                <Link href="/accessory/create">Tambah Aksesoris Pertama</Link>
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
                    <TableHead>Aksesoris</TableHead>
                    <TableHead className="text-center">Stok</TableHead>
                    <TableHead className="text-right">Harga Modal</TableHead>
                    <TableHead className="text-right">Harga Jual</TableHead>
                    <TableHead className="text-center">Transaksi</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.accessories.map((acc) => {
                    const isLowStock = acc.recordedStock <= 5;
                    return (
                      <TableRow key={acc.id}>
                        <TableCell>
                          <div className="w-8 h-8 rounded-md overflow-hidden">
                            <Image
                              src={acc.images[0] ?? IMAGE_PLACEHOLDER}
                              className="w-8 h-8 rounded-md object-cover"
                              alt=""
                              width={100}
                              height={100}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/accessory/${acc.id}`}
                            className="font-medium hover:underline block leading-tight"
                          >
                            {acc.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isLowStock ? "destructive" : "secondary"}
                            className={isLowStock ? "" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"}
                          >
                            {acc.recordedStock} unit
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-muted-foreground">
                          {formatCurrency(acc.recordedBuyPrice)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono font-medium">
                          {formatCurrency(acc.sellPrice)}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          <div className="flex flex-col gap-0.5 items-center">
                            <span>{acc._count.purchases} beli</span>
                            <span>{acc._count.sales} jual</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/accessory/${acc.id}`}>Detail</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <AccessoryPagination
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
