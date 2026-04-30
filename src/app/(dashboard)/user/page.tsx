import Link from "next/link";
import { getUsersPaginated } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Plus, UserCircle } from "lucide-react";
import { UserListClient } from "./client";
import { UserFilter, UserPagination } from "./filter";

const VALID_SORT_BY = ["createdAt", "name"] as const;

interface UserListPageProps {
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

export default async function UserListPage({ searchParams }: UserListPageProps) {
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

  const result = await getUsersPaginated({
    search,
    sortBy,
    sortOrder,
    page,
    pageSize,
    dateRangeFrom,
    dateRangeTo,
  });
  const data = result.data ?? { users: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">User</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Daftar User</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Kelola akses staf dan karyawan ke dalam sistem.{" "}
              <span className="font-medium">{data.total} user</span> ditemukan.
            </p>
          </div>
          <Button asChild>
            <Link href="/user/create">
              <Plus className="mr-2 h-4 w-4" />
              Tambah User
            </Link>
          </Button>
        </div>

        <div className="mb-4">
          <UserFilter
            search={search ?? ""}
            sort={`${sortBy}-${sortOrder}`}
            pageSize={pageSize.toString()}
            dateRangeFrom={dateRangeFrom}
            dateRangeTo={dateRangeTo}
          />
        </div>

        {data.users.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <UserCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search || dateRangeFrom
                ? "Tidak ada user yang cocok dengan filter."
                : "Belum ada data user selain akun default."}
            </p>
            {!search && !dateRangeFrom && (
              <Button asChild variant="outline" className="mt-4">
                <Link href="/user/create">Tambah User</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <UserListClient users={data.users} />
            <UserPagination
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
