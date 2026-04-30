"use client";

import { useTransition, useState } from "react";
import { updateProfile, updatePassword } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Key } from "lucide-react";

interface ProfileFormProps {
  initialData: {
    name: string;
    phone: string;
    email: string;
  };
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [isPendingProfile, startTransitionProfile] = useTransition();
  const [isPendingPassword, startTransitionPassword] = useTransition();

  const [name, setName] = useState(initialData.name);
  const [phone, setPhone] = useState(initialData.phone);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nama tidak boleh kosong.");
      return;
    }
    if (!phone.startsWith("0")) {
      toast.error("Nomor telepon harus diawali dengan 0.");
      return;
    }

    startTransitionProfile(async () => {
      const result = await updateProfile({ name, phone });
      if (result.success) {
        toast.success("Profil berhasil diperbarui!");
      } else {
        toast.error(result.error ?? "Gagal memperbarui profil.");
      }
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!oldPassword) {
      toast.error("Password lama wajib diisi.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password baru tidak cocok.");
      return;
    }

    startTransitionPassword(async () => {
      const result = await updatePassword({ oldPasswordRaw: oldPassword, newPasswordRaw: newPassword });
      if (result.success) {
        toast.success("Password berhasil diperbarui!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.error ?? "Gagal memperbarui password.");
      }
    });
  }

  return (
    <div className="space-y-6 flex flex-col md:flex-row gap-4 w-full">
      {/* Profil Form */}
      <Card className="w-full md:w-1/2 lg:w-3/5">
        <form onSubmit={handleProfileSubmit}>
          <CardHeader>
            <CardTitle className="text-lg">Informasi Profil</CardTitle>
            <CardDescription>
              Perbarui nama dan nomor telepon Anda. Email tidak dapat diubah karena merupakan identitas login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 my-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={initialData.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Anda"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxx"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-3 flex justify-end">
            <Button type="submit" disabled={isPendingProfile}>
              <Save className="mr-2 h-4 w-4" />
              {isPendingProfile ? "Menyimpan..." : "Simpan Profil"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Password Form */}
      <Card className="w-full md:w-1/2 lg:w-2/5">
        <form onSubmit={handlePasswordSubmit}>
          <CardHeader>
            <CardTitle className="text-lg">Ubah Password</CardTitle>
            <CardDescription>
              Pastikan Anda menggunakan kata sandi yang kuat (minimal 6 karakter).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 my-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Password Lama</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-3 flex justify-end">
            <Button type="submit" variant="secondary" disabled={isPendingPassword}>
              <Key className="mr-2 h-4 w-4" />
              {isPendingPassword ? "Menyimpan..." : "Ubah Password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
