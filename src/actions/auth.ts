"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { sendFonnteMessage } from "./message";

// ============================================================
// Types
// ============================================================

interface ActionResult {
  success: boolean;
  error?: string;
}

// ============================================================
// Register (First Time Setup)
// ============================================================

interface RegisterInput {
  email: string;
  phone: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<ActionResult> {
  try {
    // Cek apakah sudah ada user
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return { success: false, error: "Setup awal sudah dilakukan." };
    }

    if (input.password.length < 6) {
      return {
        success: false,
        error: "Password harus minimal 6 karakter.",
      };
    }

    if (input.phone.length < 10) {
      return {
        success: false,
        error: "No telepon harus minimal 10 karakter.",
      };
    }

    if (!input.phone.startsWith("0")) {
      return {
        success: false,
        error: "No telepon harus diawali dengan 0",
      };
    }

    const hashedPassword = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: "Superadmin",
        email: input.email,
        phone: input.phone,
        password: hashedPassword,
        isSuperAdmin: true,
      },
    });

    await createSession({ userId: user.id, email: user.email });
  } catch (error) {
    console.error("register error:", error);
    return { success: false, error: "Gagal membuat akun." };
  }

  redirect("/dashboard");
}

// ============================================================
// Login
// ============================================================

interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput): Promise<ActionResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || user.deletedAt) {
      return { success: false, error: "Email atau password salah." };
    }

    const isValid = await verifyPassword(input.password, user.password);
    if (!isValid) {
      return { success: false, error: "Email atau password salah." };
    }

    await createSession({ userId: user.id, email: user.email });
  } catch (error) {
    console.error("login error:", error);
    return { success: false, error: "Gagal masuk. Coba lagi." };
  }

  redirect("/dashboard");
}

// ============================================================
// Logout
// ============================================================

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

// ============================================================
// OTP & Forgot Password
// ============================================================

export interface RequestOtpResult extends ActionResult {
  cooldownMs?: number; // Sisa waktu cooldown (dalam ms) jika sedang dalam cooldown
}

export async function requestPasswordResetOtp(phone: string): Promise<RequestOtpResult> {
  try {
    const cleanPhone = phone.trim();

    // 1. Cari user berdasarkan phone
    const user = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (!user || user.deletedAt) {
      // Demi keamanan, lebih baik memberi pesan general atau error spesifik
      return { success: false, error: "Nomor telepon tidak terdaftar." };
    }

    // 2. Cek histori OTP terakhir
    const lastOtp = await prisma.oTP.findFirst({
      where: { identifier: cleanPhone },
      orderBy: { createdAt: "desc" },
    });

    if (lastOtp) {
      const now = new Date();
      const diffMs = now.getTime() - lastOtp.createdAt.getTime();
      const cooldownMs = 60 * 1000; // 1 menit
      
      if (diffMs < cooldownMs) {
        return {
          success: false,
          error: "Tunggu sebelum mengirim ulang OTP.",
          cooldownMs: cooldownMs - diffMs,
        };
      }
    }

    // 3. Buat kode 6 digit
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Simpan ke database
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // + 5 menit
    await prisma.oTP.create({
      data: {
        identifier: cleanPhone,
        code,
        expiresAt,
        userId: user.id,
      },
    });

    // 5. Kirim via WA
    const message = `Halo ${user.name},\n\nKode OTP Anda untuk reset password adalah: *${code}*\n\nKode ini akan kedaluwarsa dalam 5 menit. Jangan berikan kode ini kepada siapa pun.`;
    const sent = await sendFonnteMessage([cleanPhone], message);

    if (!sent) {
      return { success: false, error: "Gagal mengirim pesan WhatsApp. Coba lagi nanti." };
    }

    return { success: true };
  } catch (error) {
    console.error("requestPasswordResetOtp error:", error);
    return { success: false, error: "Terjadi kesalahan saat memproses OTP." };
  }
}

export async function resetPasswordWithOtp(phone: string, otp: string, newPasswordRaw: string): Promise<ActionResult> {
  try {
    const cleanPhone = phone.trim();

    if (newPasswordRaw.length < 6) {
      return { success: false, error: "Password minimal 6 karakter." };
    }

    // Cari OTP valid
    const validOtp = await prisma.oTP.findFirst({
      where: {
        identifier: cleanPhone,
        code: otp,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!validOtp) {
      return { success: false, error: "Kode OTP salah atau sudah kedaluwarsa." };
    }

    // Hash password baru
    const hashedPassword = await hashPassword(newPasswordRaw);

    // Transaksi update password dan tandai OTP terpakai
    await prisma.$transaction([
      prisma.user.update({
        where: { id: validOtp.userId },
        data: { password: hashedPassword },
      }),
      prisma.oTP.update({
        where: { id: validOtp.id },
        data: { used: true },
      }),
    ]);

    // Opsional: Hapus semua OTP user ini agar bersih
    await prisma.oTP.deleteMany({
      where: { userId: validOtp.userId },
    });

    return { success: true };
  } catch (error) {
    console.error("resetPasswordWithOtp error:", error);
    return { success: false, error: "Terjadi kesalahan saat mereset password." };
  }
}
