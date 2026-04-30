import Link from "next/link";
import { getCustomersPaginated } from "@/actions/customer";
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
import { CustomerFilter, CustomerPagination } from "./filter";

const VALID_SORT_BY = ["createdAt", "name"] as const;

interface CustomerListPageProps {
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

export default async function CustomerListPage({ searchParams }: CustomerListPageProps) {
  const params = await searchParams;

  const search = params.search || undefined;
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

  const result = await getCustomersPaginated({
    search,
    sortBy,
    sortOrder,
    page,
    pageSize,
    dateRangeFrom,
    dateRangeTo,
  });
  const data = result.data ?? { customers: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Customer</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Daftar Customer
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Kelola data pelanggan.{" "}
              <span className="font-medium">{data.total} customer</span> ditemukan.
            </p>
          </div>
          <Button asChild>
            <Link href="/customer/create">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Customer
            </Link>
          </Button>
        </div>

        <div className="mb-4">
          <CustomerFilter
            search={search ?? ""}
            sort={`${sortBy}-${sortOrder}`}
            pageSize={pageSize.toString()}
            dateRangeFrom={dateRangeFrom}
            dateRangeTo={dateRangeTo}
          />
        </div>

        {data.customers.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {search || dateRangeFrom
                ? "Tidak ada customer yang cocok dengan filter."
                : "Belum ada data customer."}
            </p>
            {!search && !dateRangeFrom && (
              <Button asChild variant="outline" className="mt-4">
                <Link href="/customer/create">Tambah Customer Pertama</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Terdaftar</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Link
                          href={`/customer/${customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Intl.DateTimeFormat("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(customer.createdAt))}
                      </TableCell>
                      <TableCell>
                        <Button asChild>
                          <Link href={`/customer/${customer.id}`}>
                            Detail
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <CustomerPagination
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
