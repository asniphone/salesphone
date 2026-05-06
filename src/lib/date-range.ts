export type DateRangePreset = "today" | "7days" | "thisMonth" | "lastMonth" | "custom";

export interface DateRangeResult {
  from: string;
  to: string;
  preset: DateRangePreset;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeDateRange(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string,
): DateRangeResult {
  const now = new Date();

  switch (preset) {
    case "today": {
      const from = toISODate(now);
      const to = toISODate(now);
      return { from, to, preset: "today" };
    }
    case "7days": {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      const to = toISODate(now);
      return { from: toISODate(from), to, preset: "7days" };
    }
    case "thisMonth": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = toISODate(now);
      return { from: toISODate(from), to, preset: "thisMonth" };
    }
    case "lastMonth": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toISODate(from), to: toISODate(to), preset: "lastMonth" };
    }
    case "custom": {
      const from = customFrom
        ? (() => {
            const d = new Date(customFrom);
            return Number.isNaN(d.getTime()) ? toISODate(new Date(now.getFullYear(), now.getMonth(), 1)) : toISODate(d);
          })()
        : toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
      const to = customTo
        ? (() => {
            const d = new Date(customTo);
            return Number.isNaN(d.getTime()) ? toISODate(now) : toISODate(d);
          })()
        : toISODate(now);
      return { from, to, preset: "custom" };
    }
    default:
      return { from: toISODate(now), to: toISODate(now), preset: "today" };
  }
}

export const PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Hari Ini",
  "7days": "7 Hari Terakhir",
  thisMonth: "Bulan Ini",
  lastMonth: "1 Bulan Terakhir",
  custom: "Custom",
};
