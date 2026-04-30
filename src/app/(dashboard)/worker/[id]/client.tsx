"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateWorker, deleteWorker, toggleWorkerActive, type WorkerWithUnits } from "@/actions/worker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Save, HardHat, Trash2, Power, Smartphone, TrendingUp, DollarSign } from "lucide-react";
import Link from "next/link";

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

interface Props {
  worker: WorkerWithUnits;
}

export function WorkerDetailClient({ worker }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorProfile, setErrorProfile] = useState<string | null>(null);

  // Mini report calculations
  const soldUnits = worker.units.filter((u) => u.status === "SOLD");
  const totalFeeEarned = soldUnits.reduce((sum, u) => sum + (u.workerFee ?? 0), 0);
  const totalSalesValue = soldUnits.reduce((sum, u) => sum + (u.soldPrice ?? 0), 0);

  function onUpdateProfile(formData: FormData) {
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;

    if (!name.trim()) {
      setErrorProfile("Nama tidak boleh kosong");
      return;
    }
    if (!phone.trim()) {
      setErrorProfile("Telepon tidak boleh kosong");
      return;
    }

    if (name === worker.name && phone === worker.phone) {
      toast.info("Tidak ada perubahan.");
      return;
    }

    setErrorProfile(null);
    startTransition(async () => {
      const result = await updateWorker({ id: worker.id, name, phone });
      if (result.success) {
        toast.success("Data worker diperbarui!");
        router.refresh();
      } else {
        setErrorProfile(result.error ?? "Terjadi kesalahan.");
      }
    });
  }

  function onToggleActive() {
    startTransition(async () => {
      const result = await toggleWorkerActive(worker.id);
      if (result.success) {
        toast.success(worker.isActive ? "Worker dinonaktifkan." : "Worker diaktifkan.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal mengubah status.");
      }
    });
  }

  function onDeleteWorker() {
    startTransition(async () => {
      const result = await deleteWorker(worker.id);
      if (result.success) {
        toast.success("Worker berhasil dihapus.");
        router.push("/worker");
      } else {
        toast.error(result.error ?? "Gagal menghapus worker.");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Kolom Kiri: Info & Actions */}
      <div className="space-y-6">
        {/* Edit Card */}
        <Card>
          <form action={onUpdateProfile}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardHat className="w-5 h-5 text-muted-foreground" />
                Edit Profil
              </CardTitle>
              <CardDescription>
                Update identitas worker.
                {worker.isActive ? (
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Aktif</Badge>
                ) : (
                  <Badge variant="outline" className="ml-2 text-muted-foreground">Nonaktif</Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorProfile && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorProfile}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" name="name" defaultValue={worker.name} disabled={isPending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input id="phone" name="phone" defaultValue={worker.phone} disabled={isPending} />
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

        {/* Toggle Active Card */}
        <Card className="border-yellow-200 dark:border-yellow-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Power className="w-4 h-4 text-yellow-600" />
              {worker.isActive ? "Nonaktifkan Worker" : "Aktifkan Worker"}
            </CardTitle>
            <CardDescription className="text-xs">
              {worker.isActive
                ? "Worker yang dinonaktifkan tidak akan muncul sebagai opsi saat menjual unit."
                : "Aktifkan kembali agar worker dapat dipilih saat penjualan unit."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full" disabled={isPending}>
                  {worker.isActive ? "Nonaktifkan" : "Aktifkan Kembali"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{worker.isActive ? "Nonaktifkan" : "Aktifkan"} Worker?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Worker <b>{worker.name}</b> akan {worker.isActive ? "dinonaktifkan" : "diaktifkan kembali"}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={onToggleActive}>Lanjutkan</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Delete Card */}
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />
              Hapus Worker
            </CardTitle>
            <CardDescription className="text-xs">
              Menghapus worker dari sistem secara permanen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isPending}>
                  Hapus Worker
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Anda yakin ingin menghapus worker?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Worker <b>{worker.name}</b> akan dihapus dari sistem. Data unit yang sudah terjual olehnya akan tetap tercatat.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteWorker} className="bg-destructive text-destructive-foreground">
                    Ya, Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      {/* Kolom Kanan: Report & History */}
      <div className="lg:col-span-2 space-y-6">
        {/* Mini Report Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unit Terjual</p>
                  <p className="text-2xl font-bold">{soldUnits.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Fee</p>
                  <p className="text-xl font-bold">{formatCurrency(totalFeeEarned)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nilai Penjualan</p>
                  <p className="text-xl font-bold">{formatCurrency(totalSalesValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unit History */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Penjualan Unit</CardTitle>
            <CardDescription>
              Daftar unit yang telah ditangani oleh {worker.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {worker.units.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Belum ada unit yang ditangani oleh worker ini.</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Harga Jual</TableHead>
                      <TableHead className="text-right">Fee</TableHead>
                      <TableHead>Tanggal Jual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worker.units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell>
                          <Link href={`/unit/${unit.id}`} className="font-medium text-primary hover:underline">
                            {unit.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{unit.status}</Badge>
                        </TableCell>
                        <TableCell>{unit.customer?.name ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(unit.soldPrice)}</TableCell>
                        <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(unit.workerFee)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {unit.soldAt
                            ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(unit.soldAt))
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
