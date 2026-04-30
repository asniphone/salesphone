"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Calendar as CalendarIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Dibuat Terbaru" },
  { value: "createdAt-asc", label: "Dibuat Terlama" },
  { value: "name-asc", label: "Nama A-Z" },
  { value: "name-desc", label: "Nama Z-A" },
  { value: "sellPrice-desc", label: "Harga Jual ↓" },
  { value: "sellPrice-asc", label: "Harga Jual ↑" },
  { value: "recordedStock-desc", label: "Stok Terbanyak" },
  { value: "recordedStock-asc", label: "Stok Tersedikit" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "5", label: "5 per halaman" },
  { value: "10", label: "10 per halaman" },
  { value: "25", label: "25 per halaman" },
  { value: "50", label: "50 per halaman" },
];

interface AccessoryFilterProps {
  search: string;
  sort: string;
  pageSize: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
}

export function AccessoryFilter({
  search,
  sort,
  pageSize,
  dateRangeFrom,
  dateRangeTo,
}: AccessoryFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      if (!("page" in updates)) {
        params.delete("page");
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const [date, setDate] = useState<DateRange | undefined>({
    from: dateRangeFrom ? new Date(dateRangeFrom) : undefined,
    to: dateRangeTo ? new Date(dateRangeTo) : undefined,
  });

  const handleDateSelect = (selectedDateRange: DateRange | undefined) => {
    setDate(selectedDateRange);
    if (selectedDateRange?.from) {
      if (selectedDateRange.to) {
        updateParams({
          dateRangeFrom: format(selectedDateRange.from, "yyyy-MM-dd"),
          dateRangeTo: format(selectedDateRange.to, "yyyy-MM-dd"),
        });
      } else {
        updateParams({
          dateRangeFrom: format(selectedDateRange.from, "yyyy-MM-dd"),
          dateRangeTo: "",
        });
      }
    } else {
      updateParams({ dateRangeFrom: "", dateRangeTo: "" });
    }
  };

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchValue = formData.get("search") as string;
    updateParams({ search: searchValue });
  }

  function handleClearFilters() {
    router.push(pathname);
  }

  const hasActiveFilters =
    search ||
    (sort && sort !== "createdAt-desc") ||
    dateRangeFrom;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex flex-1 max-w-sm items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Cari nama aksesoris..."
            defaultValue={search}
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="secondary">Cari</Button>
      </form>

      {/* Sort */}
      <Select
        defaultValue={sort || "createdAt-desc"}
        onValueChange={(val) => {
          const parts = val.split("-");
          const sortOrder = parts.pop();
          const sortBy = parts.join("-");
          updateParams({ sortBy, sortOrder: sortOrder ?? "desc" });
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Dibuat Terbaru" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !date?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "d LLL, y", { locale: id })} –{" "}
                  {format(date.to, "d LLL, y", { locale: id })}
                </>
              ) : (
                format(date.from, "d LLL, y", { locale: id })
              )
            ) : (
              <span>Pilih Rentang Tanggal</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Page Size */}
      <Select
        defaultValue={pageSize || "10"}
        onValueChange={(val) => updateParams({ pageSize: val })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="10 per halaman" />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          onClick={handleClearFilters}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          Reset Filter
          <X className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// ============================================================
// Pagination
// ============================================================

interface AccessoryPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export function AccessoryPagination({
  page,
  totalPages,
  total,
  pageSize,
}: AccessoryPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", newPage.toString());
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Menampilkan {start}–{end} dari {total} aksesoris
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
        >
          Sebelumnya
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
