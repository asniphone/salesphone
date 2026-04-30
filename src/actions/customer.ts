"use server";

import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/constants/cache-tag";
import type { Customer, Prisma } from "@prisma/client";

// ============================================================
// Types
// ============================================================

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

interface GetCustomersParams {
  search?: string;
  sortBy?: "createdAt" | "name";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  dateRangeFrom?: string;
  dateRangeTo?: string;
}

interface PaginatedCustomers {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// READ
// ============================================================

export async function getCustomers(): Promise<ActionResult<Customer[]>> {
  try {
    const customers = await prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: customers };
  } catch (error) {
    console.error("getCustomers error:", error);
    return { success: false, error: "Gagal mengambil data customer." };
  }
}

export async function getCustomersPaginated(
  params: GetCustomersParams = {},
): Promise<ActionResult<PaginatedCustomers>> {
  try {
    const {
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      pageSize = 10,
      dateRangeFrom,
      dateRangeTo,
    } = params;

    const where: Prisma.CustomerWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateRangeFrom) {
      const fromDate = new Date(dateRangeFrom);
      if (!isNaN(fromDate.getTime())) {
        const startOfDay = new Date(fromDate.setHours(0, 0, 0, 0));
        let endOfDay = new Date(fromDate);
        endOfDay.setHours(23, 59, 59, 999);

        if (dateRangeTo) {
          const toDate = new Date(dateRangeTo);
          if (!isNaN(toDate.getTime())) {
            endOfDay = new Date(toDate.setHours(23, 59, 59, 999));
          }
        }

        where.createdAt = { gte: startOfDay, lte: endOfDay };
      }
    }

    const total = await prisma.customer.count({ where });
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      success: true,
      data: {
        customers,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("getCustomersPaginated error:", error);
    return { success: false, error: "Gagal mengambil data customer." };
  }
}

export async function getCustomerById(
  id: number
): Promise<ActionResult<Customer | null>> {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    return { success: true, data: customer };
  } catch (error) {
    console.error("getCustomerById error:", error);
    return { success: false, error: "Gagal mengambil data customer." };
  }
}

type CustomerWithUnits = Prisma.CustomerGetPayload<{
  include: { units: true };
}>;

export async function getCustomerWithUnits(
  id: number
): Promise<ActionResult<CustomerWithUnits | null>> {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        units: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return { success: true, data: customer };
  } catch (error) {
    console.error("getCustomerWithUnits error:", error);
    return { success: false, error: "Gagal mengambil detail customer." };
  }
}

// ============================================================
// CREATE
// ============================================================

interface CreateCustomerInput {
  name: string;
  phone?: string;
}

export async function createCustomer(
  input: CreateCustomerInput
): Promise<ActionResult<Customer>> {
  try {
    const customer = await prisma.customer.create({
      data: {
        name: input.name,
        phone: input.phone,
      },
    });

    revalidateTag(CACHE_TAG.CUSTOMER);
    return { success: true, data: customer };
  } catch (error) {
    console.error("createCustomer error:", error);
    return { success: false, error: "Gagal membuat customer baru." };
  }
}

// ============================================================
// UPDATE
// ============================================================

interface UpdateCustomerInput {
  id: number;
  name?: string;
  phone?: string;
}

export async function updateCustomer(
  input: UpdateCustomerInput
): Promise<ActionResult<Customer>> {
  try {
    const { id, ...data } = input;

    const customer = await prisma.customer.update({
      where: { id },
      data,
    });

    revalidateTag(CACHE_TAG.CUSTOMER);
    return { success: true, data: customer };
  } catch (error) {
    console.error("updateCustomer error:", error);
    return { success: false, error: "Gagal memperbarui customer." };
  }
}

// ============================================================
// DELETE (Soft Delete)
// ============================================================

export async function deleteCustomer(id: number): Promise<ActionResult> {
  try {
    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidateTag(CACHE_TAG.CUSTOMER);
    return { success: true };
  } catch (error) {
    console.error("deleteCustomer error:", error);
    return { success: false, error: "Gagal menghapus customer." };
  }
}
