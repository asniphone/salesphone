import type { PaymentType, Status } from "@prisma/client";

export const UNIT_STATUS_CONFIG: Record<
  Status,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  AVAILABLE: {
    label: "Tersedia",
    variant: "default",
    className: "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent",
  },
  BOOKED: {
    label: "Dipesan",
    variant: "secondary",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 border-transparent",
  },
  SOLD: {
    label: "Terjual",
    variant: "outline",
    className: "bg-zinc-800 hover:bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-100",
  },
  RETURNED: {
    label: "Dikembalikan",
    variant: "destructive",
    className: "bg-red-500 hover:bg-red-600 text-white border-transparent",
  },
};

export const UNIT_PAYMENT_TYPE_CONFIG: Record<PaymentType, { label: string }> = {
  CASH: {
    label: "Cash",
  },
  DEBIT: {
    label: "Debit",
  },
  TRANSFER: {
    label: "Transfer",
  },
};
