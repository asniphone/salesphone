"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/constants/cache-tag";
import { hashPassword, verifyPassword } from "@/lib/auth";

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function updateProfile(input: {
  name: string;
  phone: string;
}): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (!input.name.trim()) {
      return { success: false, error: "Nama tidak boleh kosong." };
    }

    const cleanPhone = input.phone.trim();
    if (!cleanPhone.startsWith("0")) {
      return { success: false, error: "Nomor telepon harus diawali dengan 0." };
    }

    // Check uniqueness
    const existingPhone = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (existingPhone && existingPhone.id !== session.userId) {
      return {
        success: false,
        error: "Nomor telepon sudah digunakan oleh akun lain.",
      };
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: input.name.trim(),
        phone: cleanPhone,
      },
    });

    revalidateTag(CACHE_TAG.USER);
    return { success: true };
  } catch (error) {
    console.error("updateProfile error:", error);
    return {
      success: false,
      error: "Terjadi kesalahan saat memperbarui profil.",
    };
  }
}

export async function updatePassword(input: {
  oldPasswordRaw: string;
  newPasswordRaw: string;
}): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (input.newPasswordRaw.length < 6) {
      return { success: false, error: "Password baru minimal 6 karakter." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return { success: false, error: "User tidak ditemukan." };
    }

    const isMatch = await verifyPassword(input.oldPasswordRaw, user.password);
    if (!isMatch) {
      return { success: false, error: "Password lama tidak sesuai." };
    }

    const hashedPassword = await hashPassword(input.newPasswordRaw);

    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("updatePassword error:", error);
    return {
      success: false,
      error: "Terjadi kesalahan saat memperbarui password.",
    };
  }
}
