"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type DateRangePreset, PRESET_LABELS } from "@/lib/date-range";

interface ReportFilterProps {
  preset: DateRangePreset;
  dateFrom?: string;
  dateTo?: string;
}

export function ReportFilter({ preset, dateFrom, dateTo }: ReportFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [date, setDate] = useState<DateRange | undefined>({
    from: dateFrom ? new Date(dateFrom) : undefined,
    to: dateTo ? new Date(dateTo) : undefined,
  });

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "today") params.set(key, value);
        else params.delete(key);
      });
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  function handlePresetChange(value: string) {
    updateParams({ preset: value });
  }

  function handleDateSelect(selected: DateRange | undefined) {
    setDate(selected);
    if (!selected?.from) {
      updateParams({ from: "", to: "" });
      return;
    }
    updateParams({
      from: format(selected.from, "yyyy-MM-dd"),
      to: selected.to ? format(selected.to, "yyyy-MM-dd") : "",
      preset: "custom",
    });
  }

  const showCalendar = preset === "custom";

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(PRESET_LABELS) as [DateRangePreset, string][]).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showCalendar && (
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
            <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={handleDateSelect} numberOfMonths={2} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
