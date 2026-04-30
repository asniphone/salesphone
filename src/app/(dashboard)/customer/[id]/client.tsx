"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateCustomer, deleteCustomer } from "@/actions/customer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import type { Status, Unit, Customer } from "@prisma/client";

const statusLabels: Record<Status, string> = {
  AVAILABLE: "Tersedia",
  BOOKED: "Dipesan",
  SOLD: "Terjual",
  RETURNED: "Dikembalikan",
};

const statusVariants: Record<Status, "default" | "secondary" | "destructive" | "outline"> = {
  AVAILABLE: "default",
  BOOKED: "secondary",
  SOLD: "outline",
  RETURNED: "destructive",
};

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

interface CustomerWithUnits extends Customer {
  units: Unit[];
}

interface Props {
  customer: CustomerWithUnits;
}

export function CustomerDetailClient({ customer }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");

  function handleSaveEdit() {
    startTransition(async () => {
      const result = await updateCustomer({
        id: customer.id,
        name,
        phone: phone || undefined,
      });
      if (result.success) {
        toast.success("Customer berhasil diperbarui.");
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal memperbarui customer.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCustomer(customer.id);
      if (result.success) {
        toast.success("Customer berhasil dihapus.");
        router.push("/customer");
      } else {
        toast.error(result.error ?? "Gagal menghapus customer.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{customer.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {customer.phone ?? "Nomor telepon belum diisi"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Pencil className="mr-1 h-3 w-3" />
            {isEditing ? "Batal Edit" : "Edit"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 h-3 w-3" />
                Hapus
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Customer?</AlertDialogTitle>
                <AlertDialogDescription>
                  Customer &quot;{customer.name}&quot; akan dihapus. Tindakan ini
                  tidak dapat dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                  {isPending ? "Menghapus..." : "Hapus"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Detail / Edit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Customer</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nomor Telepon</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <Button onClick={handleSaveEdit} disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nama</p>
                <p className="font-medium">{customer.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Telepon</p>
                <p className="font-medium">{customer.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Terdaftar</p>
                <p className="font-medium">
                  {new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(customer.createdAt))}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Unit</p>
                <p className="font-medium">{customer.units.length}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Pembelian */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Pembelian</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.units.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada riwayat pembelian.
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Unit</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Harga Jual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.units.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>
                        <Link
                          href={`/unit/${unit.id}`}
                          className="font-medium hover:underline"
                        >
                          {unit.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {unit.imei ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[unit.status]}>
                          {statusLabels[unit.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(unit.soldPrice)}
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
  );
}
