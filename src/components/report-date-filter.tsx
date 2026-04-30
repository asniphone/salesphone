"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useCallback, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Preset waktu
function getPresetRange(preset: string): { from: Date; to: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today": {
      return { from: today, to: today };
    }
    case "7d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: today };
    }
    case "30d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from, to: today };
    }
    case "this-week": {
      const day = today.getDay();
      const from = new Date(today);
      from.setDate(from.getDate() - (day === 0 ? 6 : day - 1)); // Monday
      return { from, to: today };
    }
    case "this-month": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from, to: today };
    }
    case "last-month": {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from, to };
    }
    case "this-year": {
      const from = new Date(today.getFullYear(), 0, 1);
      return { from, to: today };
    }
    case "all": {
      return null;
    }
    default:
      return null;
  }
}

const PRESET_OPTIONS = [
  { value: "all", label: "Semua Waktu" },
  { value: "today", label: "Hari Ini" },
  { value: "7d", label: "7 Hari Terakhir" },
  { value: "this-week", label: "Minggu Ini" },
  { value: "30d", label: "30 Hari Terakhir" },
  { value: "this-month", label: "Bulan Ini" },
  { value: "last-month", label: "Bulan Lalu" },
  { value: "this-year", label: "Tahun Ini" },
];

interface ReportDateFilterProps {
  dateRangeFrom?: string;
  dateRangeTo?: string;
}

export function ReportDateFilter({ dateRangeFrom, dateRangeTo }: ReportDateFilterProps) {
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

  const handlePresetChange = (preset: string) => {
    const range = getPresetRange(preset);
    if (range) {
      setDate(range);
      updateParams({
        dateRangeFrom: format(range.from, "yyyy-MM-dd"),
        dateRangeTo: format(range.to, "yyyy-MM-dd"),
      });
    } else {
      setDate(undefined);
      updateParams({ dateRangeFrom: "", dateRangeTo: "" });
    }
  };

  const handleClear = () => {
    setDate(undefined);
    router.push(pathname);
  };

  const hasFilter = dateRangeFrom;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Preset */}
      <Select onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Pilih Preset Waktu" />
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom Date Range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal",
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
              <span>Atau Pilih Tanggal Manual</span>
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

      {/* Clear */}
      {hasFilter && (
        <Button
          variant="ghost"
          onClick={handleClear}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          Reset
          <X className="ml-1 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
