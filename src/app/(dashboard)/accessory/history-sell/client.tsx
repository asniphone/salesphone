"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAccessorySale,
  updateAccessorySale,
  type AccessorySaleHistoryData,
} from "@/actions/accessory";
import { sendAccessorySaleInvoiceWhatsApp } from "@/actions/message";
import type { WorkerData } from "@/actions/worker";
import type { Customer } from "@prisma/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Pencil, Trash2, MessageSquare } from "lucide-react";

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

interface Props {
  sales: AccessorySaleHistoryData[];
  customers: Customer[];
  workers: WorkerData[];
  storeInformation: {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    storeLogo: string | null;
    footNoteReceipt: string | null;
  };
}

import { AccessoryReceiptPrintButton } from "./receipt-print-button";

export function AccessoryHistorySellClient({
  sales,
  customers,
  workers,
  storeInformation,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [detailSale, setDetailSale] = useState<AccessorySaleHistoryData | null>(null);
  const [editingSale, setEditingSale] = useState<AccessorySaleHistoryData | null>(null);
  const [deletingSale, setDeletingSale] = useState<AccessorySaleHistoryData | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [feeWorker, setFeeWorker] = useState("");
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);

  function openEditDialog(sale: AccessorySaleHistoryData) {
    setEditingSale(sale);
    setCustomerId(sale.customerId.toString());
    setWorkerId(sale.workerId.toString());
    setFeeWorker(sale.feeWorker.toString());
  }

  function handleSendInvoice(saleId: number) {
    setIsSendingInvoice(true);
    startTransition(async () => {
      const result = await sendAccessorySaleInvoiceWhatsApp(saleId);
      setIsSendingInvoice(false);
      if (result.success) {
        toast.success("Invoice WhatsApp berhasil dikirim.");
      } else {
        toast.error(result.error ?? "Gagal mengirim invoice.");
      }
    });
  }

  function handleUpdateSale() {
    if (!editingSale) return;
    if (!customerId) {
      toast.error("Customer wajib dipilih.");
      return;
    }
    if (!workerId) {
      toast.error("Worker wajib dipilih.");
      return;
    }

    const parsedFeeWorker = parseInt(feeWorker, 10);
    if (Number.isNaN(parsedFeeWorker) || parsedFeeWorker < 0) {
      toast.error("Fee worker wajib diisi dengan angka 0 atau lebih.");
      return;
    }

    if (
      customerId === editingSale.customerId.toString() &&
      workerId === editingSale.workerId.toString() &&
      parsedFeeWorker === editingSale.feeWorker
    ) {
      toast.info("Tidak ada perubahan.");
      return;
    }

    startTransition(async () => {
      const result = await updateAccessorySale({
        saleId: editingSale.id,
        customerId: parseInt(customerId, 10),
        workerId: parseInt(workerId, 10),
        feeWorker: parsedFeeWorker,
      });

      if (result.success) {
        toast.success(`Penjualan #${editingSale.id} berhasil diperbarui.`);
        setEditingSale(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal memperbarui penjualan.");
      }
    });
  }

  function handleDeleteSale() {
    if (!deletingSale) return;

    startTransition(async () => {
      const result = await deleteAccessorySale(deletingSale.id);

      if (result.success) {
        toast.success(`Penjualan #${deletingSale.id} berhasil dihapus.`);
        setDeletingSale(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menghapus penjualan.");
      }
    });
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Transaksi</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead>Daftar Barang</TableHead>
              <TableHead className="text-right">Total Harga</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium text-muted-foreground">
                  #{sale.id}
                </TableCell>
                <TableCell>{formatDateTime(sale.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{sale.customer.name}</span>
                    {sale.customer.phone && (
                      <span className="text-xs text-muted-foreground">
                        {sale.customer.phone}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{sale.worker.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Fee: {formatCurrency(sale.feeWorker)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {sale.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <Badge variant="secondary" className="px-1.5 py-0">
                          {item.quantity}x
                        </Badge>
                        <span>{item.accessory.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({formatCurrency(item.sellPricePerUnit)})
                        </span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  {formatCurrency(sale.totalPrice)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailSale(sale)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Detail
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(sale)}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeletingSale(sale)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Hapus
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailSale !== null} onOpenChange={(open) => !open && setDetailSale(null)}>
        <DialogContent >
          <DialogHeader>
            <div className="flex items-center justify-between mt-2 mr-6">
              <DialogTitle>
                Detail Penjualan {detailSale ? `#${detailSale.id}` : ""}
              </DialogTitle>
              {detailSale && (
                <div className="flex items-center gap-2">
                  {detailSale.customer?.phone && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSendInvoice(detailSale.id)}
                      disabled={isSendingInvoice}
                    >
                      <MessageSquare className="mr-1 h-4 w-4" />
                      {isSendingInvoice ? "Mengirim..." : "Kirim Invoice WA"}
                    </Button>
                  )}
                  <AccessoryReceiptPrintButton
                    sale={detailSale}
                    storeInformation={storeInformation}
                  />
                </div>
              )}
            </div>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-4 w-full overflow-x-auto">
              <div className="grid gap-4 md:grid-cols-2 w-full">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{formatDateTime(detailSale.createdAt)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{detailSale.customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {detailSale.customer.phone || "Tanpa nomor telepon"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Worker</p>
                  <p className="font-medium">{detailSale.worker.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {detailSale.worker.phone}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Fee Worker</p>
                  <p className="font-medium">{formatCurrency(detailSale.feeWorker)}</p>
                </div>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barang</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Harga Jual</TableHead>
                      <TableHead className="text-right">Profit / Unit</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailSale.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.accessory.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.sellPricePerUnit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.profitPerUnit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.sellPricePerUnit * item.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Harga</span>
                  <span className="font-medium">{formatCurrency(detailSale.totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Profit Kotor</span>
                  <span className="font-medium">{formatCurrency(detailSale.totalProfit)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Profit Bersih Setelah Fee Worker</span>
                  <span className="font-semibold">
                    {formatCurrency(detailSale.totalProfit - detailSale.feeWorker)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editingSale !== null} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Penjualan {editingSale ? `#${editingSale.id}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Worker</Label>
              <Select value={workerId} onValueChange={setWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih worker" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id.toString()}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fee Worker (Rp)</Label>
              <Input
                type="number"
                min={0}
                value={feeWorker}
                onChange={(e) => setFeeWorker(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSale(null)}>
              Batal
            </Button>
            <Button onClick={handleUpdateSale} disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingSale !== null}
        onOpenChange={(open) => !open && setDeletingSale(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi penjualan?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingSale
                ? `Penjualan #${deletingSale.id} akan dihapus, stok barang akan dikembalikan, dan log tetap tercatat.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSale} disabled={isPending}>
              {isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
