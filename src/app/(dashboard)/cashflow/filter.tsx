"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  { value: "ALL", label: "Semua Tipe" },
  { value: "INCOME", label: "Pemasukan" },
  { value: "EXPENSE", label: "Pengeluaran" },
];

const SORT_OPTIONS = [
  { value: "transactionDate-desc", label: "Transaksi Terbaru" },
  { value: "transactionDate-asc", label: "Transaksi Terlama" },
  { value: "createdAt-desc", label: "Input Terbaru" },
  { value: "createdAt-asc", label: "Input Terlama" },
  { value: "amount-desc", label: "Nominal Terbesar" },
  { value: "amount-asc", label: "Nominal Terkecil" },
  { value: "note-asc", label: "Catatan A-Z" },
  { value: "note-desc", label: "Catatan Z-A" },
];

const DATE_TARGET_OPTIONS = [
  { value: "transactionDate", label: "Tanggal Transaksi" },
  { value: "createdAt", label: "Tanggal Input" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "5", label: "5 per halaman" },
  { value: "10", label: "10 per halaman" },
  { value: "25", label: "25 per halaman" },
  { value: "50", label: "50 per halaman" },
];

interface CashflowFilterProps {
  search: string;
  type: string;
  sort: string;
  pageSize: string;
  dateTarget?: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
}

export function CashflowFilter({
  search,
  type,
  sort,
  pageSize,
  dateTarget,
  dateRangeFrom,
  dateRangeTo,
}: CashflowFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [date, setDate] = useState<DateRange | undefined>({
    from: dateRangeFrom ? new Date(dateRangeFrom) : undefined,
    to: dateRangeTo ? new Date(dateRangeTo) : undefined,
  });

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "" && value !== "ALL") {
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
    [pathname, router, searchParams],
  );

  function handleSearchSubmit(formData: FormData) {
    const searchValue = ((formData.get("search") as string) ?? "").trim();
    updateParams({ search: searchValue });
  }

  function handleDateSelect(selectedDateRange: DateRange | undefined) {
    setDate(selectedDateRange);

    if (!selectedDateRange?.from) {
      updateParams({ dateRangeFrom: "", dateRangeTo: "" });
      return;
    }

    updateParams({
      dateRangeFrom: format(selectedDateRange.from, "yyyy-MM-dd"),
      dateRangeTo: selectedDateRange.to
        ? format(selectedDateRange.to, "yyyy-MM-dd")
        : "",
    });
  }

  function handleClearFilters() {
    router.push(pathname);
  }

  const hasActiveFilters =
    search ||
    (type && type !== "ALL") ||
    (sort && sort !== "transactionDate-desc") ||
    (dateTarget && dateTarget !== "transactionDate") ||
    dateRangeFrom;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <form action={handleSearchSubmit} className="flex flex-1 max-w-sm items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Cari catatan cashflow..."
            defaultValue={search}
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="secondary">
          Cari
        </Button>
      </form>

      <Select
        defaultValue={type || "ALL"}
        onValueChange={(value) => updateParams({ type: value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Semua Tipe" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={sort || "transactionDate-desc"}
        onValueChange={(value) => {
          const parts = value.split("-");
          const sortOrder = parts.pop() ?? "desc";
          const sortBy = parts.join("-");
          updateParams({ sortBy, sortOrder });
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Transaksi Terbaru" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !date?.from && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "d LLL, y", { locale: id })} -{" "}
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
          <div className="border-b p-3">
            <Select
              defaultValue={dateTarget || "transactionDate"}
              onValueChange={(value) => updateParams({ dateTarget: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Jenis Tanggal" />
              </SelectTrigger>
              <SelectContent>
                {DATE_TARGET_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

      <Select
        defaultValue={pageSize || "10"}
        onValueChange={(value) => updateParams({ pageSize: value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="10 per halaman" />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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

interface CashflowPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export function CashflowPagination({
  page,
  totalPages,
  total,
  pageSize,
}: CashflowPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", nextPage.toString());
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Menampilkan {start}-{end} dari {total} transaksi
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
        <span className="px-2 text-sm text-muted-foreground">
          {page} / {Math.max(totalPages, 1)}
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
