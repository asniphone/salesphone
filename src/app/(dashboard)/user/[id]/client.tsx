"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateUser, resetUserPassword, deleteUser, type UserDetailPayload } from "@/actions/user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, UserCircle, KeyRound, Trash2, Smartphone, Package, MessageSquare, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  user: UserDetailPayload;
}

export function UserDetailClient({ user }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorProfile, setErrorProfile] = useState<string | null>(null);

  function onUpdateProfile(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    if (!name.trim()) {
      setErrorProfile("Nama tidak boleh kosong");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorProfile("Email tidak valid");
      return;
    }
    if (!phone.startsWith("0")) {
      setErrorProfile("Nomor telepon harus diawali dengan 0");
      return;
    }

    if (name === user.name && email === user.email && phone === user.phone) {
      toast.info("Tidak ada perubahan.");
      return;
    }

    setErrorProfile(null);
    startTransition(async () => {
      const result = await updateUser({
        id: user.id,
        name,
        email,
        phone,
      });

      if (result.success) {
        toast.success("Profil user diperbarui!");
        router.refresh();
      } else {
        setErrorProfile(result.error ?? "Terjadi kesalahan.");
      }
    });
  }

  function onResetPassword() {
    startTransition(async () => {
      const result = await resetUserPassword(user.id);
      if (result.success) {
        toast.success("Password direset ke: 12345678");
      } else {
        toast.error(result.error ?? "Gagal mereset password.");
      }
    });
  }

  function onDeleteUser() {
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result.success) {
        toast.success("User berhasil dihapus.");
        router.push("/user");
      } else {
        toast.error(result.error ?? "Gagal menghapus user.");
      }
    });
  }

  return (
    <div className="w-full gap-6 flex flex-col lg:flex-row">
      {/* Kolom Kiri: Form & Actions */}
      <div className="space-y-6 w-full md:w-1/2 lg:w-1/3">
        <Card>
          <form action={onUpdateProfile}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-muted-foreground" />
                Edit Profil
              </CardTitle>
              <CardDescription>Update identitas user / email login.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 my-4">
              {errorProfile && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorProfile}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" name="name" defaultValue={user.name} disabled={isPending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Alamat Email</Label>
                <Input id="email" name="email" type="email" defaultValue={user.email} disabled={isPending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input id="phone" name="phone" defaultValue={user.phone} disabled={isPending} />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 py-3 flex justify-end">
              <Button type="submit" disabled={isPending} size="sm">
                {isPending ? "Menyimpan..." : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Simpan
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Card Reset Password */}
        <Card className="border-yellow-200 dark:border-yellow-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-yellow-600" />
              Reset Password
            </CardTitle>
            <CardDescription className="text-xs">
              Mereset kata sandi kembali ke bawaan sistem: <code className="bg-muted px-1.5 py-0.5 rounded">12345678</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full" disabled={isPending}>
                  Reset ke Default
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Password?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Password user <b>{user.name}</b> akan dikembalikan menjadi <b>12345678</b>. Pastikan menghubungi beliau atas tindakan ini.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={onResetPassword}>Lanjut Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Card Delete User */}
        <Card className="border-red-200 dark:border-red-900/50 ">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />
              Hapus User
            </CardTitle>
            <CardDescription className="text-xs">
              Mencabut akses akun. Data sejarah (logs) yang dibuat oleh user ini akan tetap utuh tersimpan di sistem.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isPending}>
                  Hapus / Nonaktifkan
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Anda yakin ingin menghapus user?</AlertDialogTitle>
                  <AlertDialogDescription>
                    User <b>{user.name}</b> tidak akan dapat login lagi. Seluruh jejak aktivitasnya akan diletakkan dalam status <i>soft-delete</i> dan bisa tetap ditelusuri.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteUser} className="bg-destructive text-destructive-foreground">Ya, Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      {/* Kolom Kanan: Activity Logs */}
      <Card className="lg:col-span-2 flex flex-col max-h-[85vh] w-full md:w-1/2 lg:w-2/3">
        <CardHeader className="border-b pb-4">
          <CardTitle>Riwayat Aktivitas ({user.name})</CardTitle>
          <CardDescription>
            Tinjauan cepat kontribusi dan tindakan yang dilakukan oleh pengguna ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <Tabs defaultValue="unit" className="h-full flex flex-col">
            <div className="px-6 pt-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="unit" className="text-xs">
                  <Smartphone className="w-3 h-3 mr-1" /> Unit
                </TabsTrigger>
                <TabsTrigger value="accessory" className="text-xs">
                  <Package className="w-3 h-3 mr-1" /> Aksesori
                </TabsTrigger>
                <TabsTrigger value="blast" className="text-xs">
                  <MessageSquare className="w-3 h-3 mr-1" /> Blast
                </TabsTrigger>
                <TabsTrigger value="invoice" className="text-xs">
                  <ReceiptText className="w-3 h-3 mr-1" /> Invoice
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 p-6">
              {/* UNIT LOGS */}
              <TabsContent value="unit" className="m-0 space-y-4">
                {user.unitLogs.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Belum ada riwayat Unit dari user ini.</p>
                ) : (
                  user.unitLogs.map(log => (
                    <div key={log.id} className="text-sm border-b pb-3 last:border-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-primary">{log.unit.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{log.type}</Badge>
                        <span className="text-xs line-clamp-1">{log.logActionNote || 'Melakukan perubahan pada unit ini'}</span>
                      </div>
                    </div>
                  ))
                )}
                {user.unitLogs.length === 20 && (
                  <p className="text-xs text-center text-muted-foreground pt-2">Max. 20 log terbaru ditampilkan.</p>
                )}
              </TabsContent>

              {/* ACCESSORY LOGS */}
              <TabsContent value="accessory" className="m-0 space-y-4">
                {user.accessoryLogs.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Belum ada riwayat Aksesoris dari user ini.</p>
                ) : (
                  user.accessoryLogs.map(log => (
                    <div key={log.id} className="text-sm border-b pb-3 last:border-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-primary">{log.accessory.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{log.kind}</Badge>
                        <span className="text-xs line-clamp-1">{log.logNote || 'Melakukan perubahan pada aksesori ini'}</span>
                      </div>
                    </div>
                  ))
                )}
                {user.accessoryLogs.length === 20 && (
                  <p className="text-xs text-center text-muted-foreground pt-2">Max. 20 log terbaru ditampilkan.</p>
                )}
              </TabsContent>

              {/* BLAST MESSAGES */}
              <TabsContent value="blast" className="m-0 space-y-4">
                {user.blastMessages.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Belum ada pengiriman Blast WA.</p>
                ) : (
                  user.blastMessages.map(msg => (
                    <div key={msg.id} className="text-sm border-b pb-3 last:border-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-xs">Pesan Broadcast (#{msg.id})</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 mt-2">
                        <Badge variant={msg.status === "SUCCESS" ? "default" : "destructive"} className="text-[10px] shrink-0">
                          {msg.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground italic bg-muted p-1.5 rounded flex-1 line-clamp-2">
                          &quot;{msg.content}&quot;
                        </p>
                      </div>
                      <p className="text-xs mt-1">Ke: {msg._count.customers} Customers</p>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* INVOICE HISTORIES */}
              <TabsContent value="invoice" className="m-0 space-y-4">
                {user.sendInvoiceHistories.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Belum ada pengiriman Invoice.</p>
                ) : (
                  user.sendInvoiceHistories.map(inv => (
                    <div key={inv.id} className="text-sm border-b pb-3 last:border-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-xs">Invoice to: {inv.customer.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(inv.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={inv.status === "SUCCESS" ? "default" : "destructive"} className="text-[10px]">
                          {inv.status}
                        </Badge>
                        <span className="text-xs line-clamp-1 italic text-muted-foreground">Terkirim via WhatsApp</span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
