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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ACTION_OPTIONS = [
  { value: "ALL", label: "Semua Aksi" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
];

const REFERENCE_OPTIONS = [
  { value: "ALL", label: "Semua Referensi" },
  { value: "UNIT_SALE", label: "Unit Sale" },
  { value: "UNIT_PURCHASE", label: "Unit Purchase" },
  { value: "ACCESSORY_SALE", label: "Accessory Sale" },
  { value: "ACCESSORY_PURCHASE", label: "Accessory Purchase" },
  { value: "CASHFLOW", label: "Cashflow" },
  { value: "IMBURSEMENT", label: "Imbursement" },
];

const SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Input Terbaru" },
  { value: "createdAt-asc", label: "Input Terlama" },
  { value: "transactionDate-desc", label: "Transaksi Terbaru" },
  { value: "transactionDate-asc", label: "Transaksi Terlama" },
  { value: "id-desc", label: "ID Terbesar" },
  { value: "id-asc", label: "ID Terkecil" },
  { value: "gapAmount-desc", label: "Gap Terbesar" },
  { value: "gapAmount-asc", label: "Gap Terkecil" },
];

const DATE_TARGET_OPTIONS = [
  { value: "createdAt", label: "Tanggal Input" },
  { value: "transactionDate", label: "Tanggal Transaksi" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "5", label: "5 per halaman" },
  { value: "10", label: "10 per halaman" },
  { value: "25", label: "25 per halaman" },
  { value: "50", label: "50 per halaman" },
];

interface LedgerFilterProps {
  search: string;
  actionType: string;
  referenceType: string;
  sort: string;
  pageSize: string;
  dateTarget: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
}

export function LedgerFilter(props: LedgerFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [date, setDate] = useState<DateRange | undefined>({
    from: props.dateRangeFrom ? new Date(props.dateRangeFrom) : undefined,
    to: props.dateRangeTo ? new Date(props.dateRangeTo) : undefined,
  });

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "" && value !== "ALL") params.set(key, value);
        else params.delete(key);
      });
      if (!("page" in updates)) params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  function handleDateSelect(selected: DateRange | undefined) {
    setDate(selected);
    if (!selected?.from) {
      updateParams({ dateRangeFrom: "", dateRangeTo: "" });
      return;
    }
    updateParams({
      dateRangeFrom: format(selected.from, "yyyy-MM-dd"),
      dateRangeTo: selected.to ? format(selected.to, "yyyy-MM-dd") : "",
    });
  }

  const hasActiveFilters =
    props.search ||
    (props.actionType && props.actionType !== "ALL") ||
    (props.referenceType && props.referenceType !== "ALL") ||
    (props.sort && props.sort !== "createdAt-desc") ||
    (props.dateTarget && props.dateTarget !== "createdAt") ||
    props.dateRangeFrom;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <form
        action={(formData) =>
          updateParams({ search: ((formData.get("search") as string) ?? "").trim() })
        }
        className="flex flex-1 max-w-sm items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="search" placeholder="Cari catatan ledger..." defaultValue={props.search} className="pl-8" />
        </div>
        <Button type="submit" variant="secondary">Cari</Button>
      </form>

      <Select defaultValue={props.actionType || "ALL"} onValueChange={(value) => updateParams({ actionType: value })}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Semua Aksi" /></SelectTrigger>
        <SelectContent>{ACTION_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
      </Select>

      <Select defaultValue={props.referenceType || "ALL"} onValueChange={(value) => updateParams({ referenceType: value })}>
        <SelectTrigger className="w-[190px]"><SelectValue placeholder="Semua Referensi" /></SelectTrigger>
        <SelectContent>{REFERENCE_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
      </Select>

      <Select
        defaultValue={props.sort || "createdAt-desc"}
        onValueChange={(value) => {
          const parts = value.split("-");
          const sortOrder = parts.pop() ?? "desc";
          const sortBy = parts.join("-");
          updateParams({ sortBy, sortOrder });
        }}
      >
        <SelectTrigger className="w-[190px]"><SelectValue placeholder="Input Terbaru" /></SelectTrigger>
        <SelectContent>{SORT_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-[260px] justify-start text-left font-normal", !date?.from && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>{format(date.from, "d LLL, y", { locale: id })} - {format(date.to, "d LLL, y", { locale: id })}</>
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
            <Select defaultValue={props.dateTarget || "createdAt"} onValueChange={(value) => updateParams({ dateTarget: value })}>
              <SelectTrigger><SelectValue placeholder="Pilih Jenis Tanggal" /></SelectTrigger>
              <SelectContent>{DATE_TARGET_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={handleDateSelect} numberOfMonths={2} />
        </PopoverContent>
      </Popover>

      <Select defaultValue={props.pageSize || "10"} onValueChange={(value) => updateParams({ pageSize: value })}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="10 per halaman" /></SelectTrigger>
        <SelectContent>{PAGE_SIZE_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button type="button" variant="ghost" size="icon" onClick={() => router.push(pathname)} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface LedgerPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export function LedgerPagination({ page, totalPages, total, pageSize }: LedgerPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (totalPages <= 1) return null;

  function goTo(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Menampilkan {start}-{end} dari {total} data</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => goTo(page - 1)} disabled={page <= 1}>Sebelumnya</Button>
        <span className="text-sm text-muted-foreground">Halaman {page} / {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => goTo(page + 1)} disabled={page >= totalPages}>Berikutnya</Button>
      </div>
    </div>
  );
}

