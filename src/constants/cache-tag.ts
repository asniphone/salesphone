// Cache tag constants untuk setiap model Prisma
// Digunakan oleh revalidateTag() di Server Actions setelah operasi CRUD

export const CACHE_TAG = {
  UNIT: "unit",
  USER: "user",
  CUSTOMER: "customer",
  UNIT_LOG: "unit-log",
  ACCESSORY: "accessory",
  ACCESSORY_LOG: "accessory-log",
  WORKER: "worker",
  COMMON_INFORMATION: "common-information",
  CASHFLOW: "cashflow",
  CASHFLOW_LOG: "cashflow-log",
} as const;

export type CacheTag = (typeof CACHE_TAG)[keyof typeof CACHE_TAG];
