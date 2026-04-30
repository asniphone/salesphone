"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createUser } from "@/actions/user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, UserCircle } from "lucide-react";

export function UserCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const passwordRaw = formData.get("passwordRaw") as string;
    const passwordConfirm = formData.get("passwordConfirm") as string;

    if (!name.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Email tidak valid.");
      return;
    }
    if (!phone.startsWith("0")) {
      setError("Nomor telepon harus diawali dengan 0.");
      return;
    }
    if (!passwordRaw || passwordRaw.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (passwordRaw !== passwordConfirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createUser({
        name,
        email,
        phone,
        passwordRaw,
      });

      if (result.success) {
        toast.success("User berhasil dibuat!");
        router.push("/user");
      } else {
        setError(result.error ?? "Terjadi kesalahan.");
      }
    });
  }

  return (
    <Card>
      <form action={handleSubmit}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-muted-foreground" />
            Detail Akun
          </CardTitle>
          <CardDescription>
            Pastikan email yang digunakan aktif dan unik.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 my-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input id="name" name="name" placeholder="John Doe" disabled={isPending} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Alamat Email</Label>
              <Input id="email" name="email" type="email" placeholder="john@example.com" disabled={isPending} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input id="phone" name="phone" placeholder="08xxxxxxxxx" disabled={isPending} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="passwordRaw">Password</Label>
              <Input id="passwordRaw" name="passwordRaw" type="password" placeholder="••••••••" disabled={isPending} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Konfirmasi Password</Label>
              <Input id="passwordConfirm" name="passwordConfirm" type="password" placeholder="••••••••" disabled={isPending} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 py-4 flex justify-end">
          <Button type="button" variant="outline" className="mr-2" onClick={() => router.back()} disabled={isPending}>
            Batal
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Menyimpan..." : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan User
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
