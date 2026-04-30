"use client";

import { useTransition, useState, useEffect } from "react";
import { requestPasswordResetOtp, resetPasswordWithOtp } from "@/actions/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Smartphone, KeyRound } from "lucide-react";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);

  // Step 1 State
  const [phone, setPhone] = useState("");

  // Step 2 State
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);

  // Handle countdown effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Try to recover state from session storage on mount
  useEffect(() => {
    const savedCooldown = sessionStorage.getItem("otp_cooldown_end");
    const savedPhone = sessionStorage.getItem("otp_phone");
    if (savedCooldown && savedPhone) {
      const endMs = parseInt(savedCooldown, 10);
      const diffMs = endMs - Date.now();
      if (diffMs > 0) {
        setTimeLeft(Math.ceil(diffMs / 1000));
        setPhone(savedPhone);
        setStep(2);
      } else {
        sessionStorage.removeItem("otp_cooldown_end");
      }
    }
  }, []);

  function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.startsWith("0")) {
      setError("Nomor telepon harus diawali dengan 0.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await requestPasswordResetOtp(phone);
      if (result.success) {
        toast.success("OTP telah dikirim ke WhatsApp Anda.");
        const cooldownEnd = Date.now() + 60 * 1000;
        sessionStorage.setItem("otp_cooldown_end", cooldownEnd.toString());
        sessionStorage.setItem("otp_phone", phone);
        setTimeLeft(60);
        setStep(2);
      } else {
        if (result.cooldownMs) {
          const remainingSec = Math.ceil(result.cooldownMs / 1000);
          setError(`Tunggu ${remainingSec} detik sebelum meminta OTP lagi.`);
          const cooldownEnd = Date.now() + result.cooldownMs;
          sessionStorage.setItem("otp_cooldown_end", cooldownEnd.toString());
          sessionStorage.setItem("otp_phone", phone);
          setTimeLeft(remainingSec);
          setStep(2);
        } else {
          setError(result.error ?? "Terjadi kesalahan.");
        }
      }
    });
  }

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("OTP harus 6 digit angka.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await resetPasswordWithOtp(phone, otp, newPassword);
      if (result.success) {
        toast.success("Password berhasil diubah. Silakan login.");
        sessionStorage.removeItem("otp_cooldown_end");
        sessionStorage.removeItem("otp_phone");
        router.push("/login");
      } else {
        setError(result.error ?? "Gagal mereset password.");
      }
    });
  }

  function handleResend() {
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordResetOtp(phone);
      if (result.success) {
        toast.success("OTP telah dikirim ulang ke WhatsApp Anda.");
        const cooldownEnd = Date.now() + 60 * 1000;
        sessionStorage.setItem("otp_cooldown_end", cooldownEnd.toString());
        setTimeLeft(60);
      } else {
        if (result.cooldownMs) {
          const remainingSec = Math.ceil(result.cooldownMs / 1000);
          setError(`Tunggu ${remainingSec} detik sebelum mengirim ulang.`);
          setTimeLeft(remainingSec);
        } else {
          setError(result.error ?? "Terjadi kesalahan.");
        }
      }
    });
  }

  if (step === 1) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Smartphone className="h-6 w-6" />
          </div>
          <CardTitle>Lupa Password</CardTitle>
          <CardDescription>
            Masukkan nomor WhatsApp Anda yang terdaftar.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRequestOtp}>
          <CardContent className="space-y-4 my-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor WhatsApp</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxx"
                required
                disabled={isPending}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isPending || !phone}>
              {isPending ? "Memproses..." : "Kirim OTP"}
            </Button>
            <div className="text-center text-sm">
              <Link href="/login" className="text-primary hover:underline">
                Kembali ke halaman Login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle>Verifikasi OTP</CardTitle>
        <CardDescription>
          Kode OTP 6 digit telah dikirim ke WA {phone}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleResetPassword}>
        <CardContent className="space-y-4 my-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="otp">Kode OTP</Label>
              {timeLeft > 0 ? (
                <span className="text-xs text-muted-foreground">Kirim ulang dalam {timeLeft}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isPending}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:hover:no-underline"
                >
                  Kirim Ulang OTP
                </button>
              )}
            </div>
            <Input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Password Baru</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              minLength={6}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              minLength={6}
              required
              disabled={isPending}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending || otp.length !== 6}>
            {isPending ? "Memproses..." : "Reset Password"}
          </Button>
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                sessionStorage.removeItem("otp_cooldown_end");
                sessionStorage.removeItem("otp_phone");
                setTimeLeft(0);
                setError(null);
              }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Ganti Nomor Telepon
            </button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
