"use server";

import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/constants/cache-tag";
import { hashPassword } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

// ============================================================
// Types
// ============================================================

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export type UserWithoutPassword = Prisma.UserGetPayload<{
  omit: { password: true };
}>;

interface GetUsersParams {
  search?: string;
  sortBy?: "createdAt" | "name";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  dateRangeFrom?: string;
  dateRangeTo?: string;
}

interface PaginatedUsers {
  users: UserWithoutPassword[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// READ
// ============================================================

export async function getUsers(): Promise<ActionResult<UserWithoutPassword[]>> {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      omit: { password: true },
    });

    return { success: true, data: users };
  } catch (error) {
    console.error("getUsers error:", error);
    return { success: false, error: "Gagal mengambil data user." };
  }
}

export async function getUsersPaginated(
  params: GetUsersParams = {},
): Promise<ActionResult<PaginatedUsers>> {
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

    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
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

        where.createdAt = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
    }

    const total = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      omit: { password: true },
    });

    return {
      success: true,
      data: {
        users,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("getUsersPaginated error:", error);
    return { success: false, error: "Gagal mengambil data paginasi user." };
  }
}

export type UserDetailPayload = Prisma.UserGetPayload<{
  omit: { password: true };
  include: {
    unitLogs: {
      include: {
        unit: { select: { id: true; name: true } };
      };
      orderBy: { createdAt: "desc" };
    };
    accessoryLogs: {
      include: {
        accessory: { select: { id: true; name: true } };
      };
      orderBy: { createdAt: "desc" };
    };
    blastMessages: {
      include: {
        _count: { select: { customers: true } };
      };
      orderBy: { createdAt: "desc" };
    };
    sendInvoiceHistories: {
      include: {
        customer: { select: { id: true; name: true } };
      };
      orderBy: { createdAt: "desc" };
    };
  };
}>;

export async function getUserById(
  id: number,
): Promise<ActionResult<UserDetailPayload | null>> {
  try {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      omit: { password: true },
      include: {
        unitLogs: {
          include: { unit: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        accessoryLogs: {
          include: { accessory: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        blastMessages: {
          include: { _count: { select: { customers: true } } },
          orderBy: { createdAt: "desc" },
        },
        sendInvoiceHistories: {
          include: { customer: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) return { success: true, data: null };

    return { success: true, data: user };
  } catch (error) {
    console.error("getUserById error:", error);
    return { success: false, error: "Gagal mengambil detail user." };
  }
}

// ============================================================
// CREATE
// ============================================================

interface CreateUserInput {
  name: string;
  email: string;
  phone: string;
  passwordRaw: string;
}

export async function createUser(
  input: CreateUserInput,
): Promise<ActionResult<UserWithoutPassword>> {
  try {
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingEmail) {
      if (existingEmail.deletedAt) {
        return {
          success: false,
          error: "Email sudah digunakan oleh user yang dihapus. Coba gunakan email lain.",
        };
      }
      return { success: false, error: "Email sudah terdaftar." };
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phone: input.phone },
    });

    if (existingPhone) {
      if (existingPhone.deletedAt) {
        return {
          success: false,
          error: "Nomor telepon sudah digunakan oleh user yang dihapus.",
        };
      }
      return { success: false, error: "Nomor telepon sudah terdaftar." };
    }

    const hashedPassword = await hashPassword(input.passwordRaw);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        password: hashedPassword,
        isSuperAdmin: false,
      },
      omit: { password: true },
    });

    revalidateTag(CACHE_TAG.USER);

    return { success: true, data: user };
  } catch (error) {
    console.error("createUser error:", error);
    return { success: false, error: "Gagal membuat user baru." };
  }
}

// ============================================================
// UPDATE
// ============================================================

interface UpdateUserInput {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export async function updateUser(
  input: UpdateUserInput,
): Promise<ActionResult<UserWithoutPassword>> {
  try {
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingEmail && existingEmail.id !== input.id) {
      return { success: false, error: "Email sudah terdaftar oleh user lain." };
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phone: input.phone },
    });

    if (existingPhone && existingPhone.id !== input.id) {
      return { success: false, error: "Nomor telepon sudah terdaftar oleh user lain." };
    }

    const updated = await prisma.user.update({
      where: { id: input.id },
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
      },
      omit: { password: true },
    });

    revalidateTag(CACHE_TAG.USER);

    return { success: true, data: updated };
  } catch (error) {
    console.error("updateUser error:", error);
    return { success: false, error: "Gagal mengupdate data user." };
  }
}

export async function resetUserPassword(id: number): Promise<ActionResult> {
  try {
    const hashedPassword = await hashPassword("12345678");

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    revalidateTag(CACHE_TAG.USER);
    return { success: true };
  } catch (error) {
    console.error("resetUserPassword error:", error);
    return { success: false, error: "Gagal mereset password." };
  }
}

// ============================================================
// DELETE
// ============================================================

export async function deleteUser(id: number): Promise<ActionResult> {
  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { email: true, phone: true }
    });

    if (!existing) {
      return { success: false, error: "User tidak ditemukan." };
    }

    const timestamp = Date.now();

    // Soft Delete to prevent cascading removal of unit & accessory logs
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: `deleted-${timestamp}-${existing.email}`,
        phone: `deleted-${timestamp}-${existing.phone}`,
      },
    });

    revalidateTag(CACHE_TAG.USER);
    return { success: true };
  } catch (error) {
    console.error("deleteUser error:", error);
    return { success: false, error: "Gagal menghapus user." };
  }
}
