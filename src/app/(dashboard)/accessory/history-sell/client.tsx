"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAccessorySale,
  updateAccessorySale,
  type AccessorySaleHistoryData,
  type AccessoryForSale,
} from "@/actions/accessory";
import {
  sendAccessorySaleInvoiceWhatsApp,
  sendAccessorySaleWorkerInvoiceWhatsApp,
} from "@/actions/message";
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
import { Eye, Pencil, Trash2, MessageSquare, Search, Plus, Minus, ShoppingCart, Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { IMAGE_PLACEHOLDER } from "@/constants/common";

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

interface CartItem {
  accessory: AccessoryForSale;
  selectedUnitIds: number[];
}

interface Props {
  sales: AccessorySaleHistoryData[];
  customers: Customer[];
  workers: WorkerData[];
  accessories: AccessoryForSale[];
  storeInformation: {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    storeLogo: string | null;
    footNoteReceipt: string | null;
  };
  userAccess: {
    accessAccessoryUpdate: boolean;
    accessAccessoryDelete: boolean;
  };
}

import { AccessoryReceiptPrintButton } from "./receipt-print-button";

export function AccessoryHistorySellClient({
  sales,
  customers,
  workers,
  accessories,
  storeInformation,
  userAccess,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [detailSale, setDetailSale] = useState<AccessorySaleHistoryData | null>(null);
  const [editingSale, setEditingSale] = useState<AccessorySaleHistoryData | null>(null);
  const [deletingSale, setDeletingSale] = useState<AccessorySaleHistoryData | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [feeWorker, setFeeWorker] = useState("");
  const [discount, setDiscount] = useState("");
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [isSendingWorkerInvoice, setIsSendingWorkerInvoice] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAccessoryId, setExpandedAccessoryId] = useState<number | null>(null);

  const filteredAccessories = accessories.filter((acc) =>
    acc.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  function toggleUnit(accessory: AccessoryForSale, unitId: number) {
    setCart((prev) => {
      const existing = prev.find((item) => item.accessory.id === accessory.id);
      if (existing) {
        const isSelected = existing.selectedUnitIds.includes(unitId);
        if (isSelected) {
          const newIds = existing.selectedUnitIds.filter((id) => id !== unitId);
          if (newIds.length === 0) {
            return prev.filter((item) => item.accessory.id !== accessory.id);
          }
          return prev.map((item) =>
            item.accessory.id === accessory.id
              ? { ...item, selectedUnitIds: newIds }
              : item,
          );
        } else {
          return prev.map((item) =>
            item.accessory.id === accessory.id
              ? { ...item, selectedUnitIds: [...item.selectedUnitIds, unitId] }
              : item,
          );
        }
      }
      return [...prev, { accessory, selectedUnitIds: [unitId] }];
    });
  }

  function setNoSnQuantity(accessory: AccessoryForSale, qty: number) {
    const noSnUnits = accessory.availableUnits.filter((u) => !u.serialNumber);
    const snUnits = accessory.availableUnits.filter((u) => u.serialNumber);
    const clampedQty = Math.max(0, Math.min(qty, noSnUnits.length));

    setCart((prev) => {
      const existing = prev.find((item) => item.accessory.id === accessory.id);
      const selectedSnIds = existing
        ? existing.selectedUnitIds.filter((id) =>
          snUnits.some((u) => u.id === id),
        )
        : [];
      const selectedNoSnIds = noSnUnits.slice(0, clampedQty).map((u) => u.id);
      const allIds = [...selectedSnIds, ...selectedNoSnIds];

      if (allIds.length === 0) {
        return prev.filter((item) => item.accessory.id !== accessory.id);
      }
      if (existing) {
        return prev.map((item) =>
          item.accessory.id === accessory.id
            ? { ...item, selectedUnitIds: allIds }
            : item,
        );
      }
      return [...prev, { accessory, selectedUnitIds: allIds }];
    });
  }

  function removeFromCart(accessoryId: number) {
    setCart((prev) => prev.filter((item) => item.accessory.id !== accessoryId));
    if (expandedAccessoryId === accessoryId) setExpandedAccessoryId(null);
  }

  function openEditDialog(sale: AccessorySaleHistoryData) {
    setEditingSale(sale);
    setCustomerId(sale.customerId.toString());
    setWorkerId(sale.workerId.toString());
    setFeeWorker(sale.feeWorker.toString());
    setDiscount(sale.discount.toString());

    // Initialize cart from existing sale items
    // Since AccessoryForSale might not have the units from the sale (because they are SOLD),
    // we need to inject the sold units from the sale into the accessory's availableUnits for the duration of the edit.

    const initialCart: CartItem[] = [];

    // We don't actually mutate accessories globally, just in the cart reference or when rendering.
    // Wait, `accessories` comes from `getAccessoriesForSale()` which only includes `AVAILABLE` units.
    // The units inside the sale are `SOLD`.
    // We need to merge them so the user can see them and unselect them.
    for (const item of sale.items) {
      // Find the corresponding accessory in the `accessories` list
      const acc = accessories.find(a => a.id === item.accessory.id);
      if (acc) {
        // Clone it so we can inject the sold units back in
        const mergedAcc = { ...acc };
        // Add the sold units from this sale item
        const soldUnits = item.units.map(u => ({ ...u, status: "AVAILABLE" as const }));

        // Remove duplicates just in case (though there shouldn't be any)
        const existingUnitIds = new Set(mergedAcc.availableUnits.map(u => u.id));
        const unitsToAdd = soldUnits.filter(u => !existingUnitIds.has(u.id));

        mergedAcc.availableUnits = [...mergedAcc.availableUnits, ...unitsToAdd];

        initialCart.push({
          accessory: mergedAcc,
          selectedUnitIds: item.units.map(u => u.id),
        });
      }
    }

    setCart(initialCart);
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

  function handleSendWorkerInvoice(saleId: number) {
    setIsSendingWorkerInvoice(true);
    startTransition(async () => {
      const result = await sendAccessorySaleWorkerInvoiceWhatsApp(saleId);
      setIsSendingWorkerInvoice(false);
      if (result.success) {
        toast.success("Invoice worker WhatsApp berhasil dikirim.");
      } else {
        toast.error(result.error ?? "Gagal mengirim invoice worker.");
      }
    });
  }

  function handleUpdateSale() {
    if (!editingSale) return;
    if (cart.length === 0) {
      toast.error("Keranjang tidak boleh kosong.");
      return;
    }
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
    const parsedDiscount = parseInt(discount, 10);
    if (Number.isNaN(parsedDiscount) || parsedDiscount < 0) {
      toast.error("Diskon wajib diisi dengan angka 0 atau lebih.");
      return;
    }

    // Subtotal from cart
    const subtotal = cart.reduce(
      (sum, item) => sum + item.accessory.sellPrice * item.selectedUnitIds.length,
      0,
    );

    if (parsedDiscount > subtotal) {
      toast.error("Diskon tidak boleh melebihi subtotal belanja.");
      return;
    }

    startTransition(async () => {
      const itemsPayload = cart.map(item => ({
        accessoryId: item.accessory.id,
        unitIds: item.selectedUnitIds,
      }));

      const result = await updateAccessorySale({
        saleId: editingSale.id,
        customerId: parseInt(customerId, 10),
        workerId: parseInt(workerId, 10),
        feeWorker: parsedFeeWorker,
        discount: parsedDiscount,
        items: itemsPayload,
      });

      if (result.success) {
        toast.success("Data penjualan berhasil diperbarui.");
        setEditingSale(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal memperbarui data penjualan.");
      }
    });
  }

  // Computed values for Edit Dialog
  const editTotalItems = cart.reduce((sum, item) => sum + item.selectedUnitIds.length, 0);
  const editTotalPrice = cart.reduce(
    (sum, item) => sum + item.accessory.sellPrice * item.selectedUnitIds.length,
    0,
  );
  const editTotalProfit = cart.reduce((sum, item) => {
    const units = item.selectedUnitIds.map(
      (id) => item.accessory.availableUnits.find((u) => u.id === id)!,
    );
    return (
      sum +
      units.reduce(
        (s, u) => s + (item.accessory.sellPrice - u.buyPrice),
        0,
      )
    );
  }, 0);
  const editParsedDiscount = Number.parseInt(discount, 10);
  const editEffectiveDiscount = Number.isNaN(editParsedDiscount) || editParsedDiscount < 0
    ? 0
    : Math.min(editParsedDiscount, editTotalPrice);
  const editTotalAfterDiscount = Math.max(editTotalPrice - editEffectiveDiscount, 0);
  const editProfitAfterDiscount = editTotalProfit - editEffectiveDiscount;

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
                      <div key={item.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="px-1.5 py-0">
                            {item.quantity}x
                          </Badge>
                          <span>{item.accessory.name}</span>
                          <span className="text-muted-foreground text-xs">
                            ({formatCurrency(item.sellPricePerUnit)})
                          </span>
                        </div>
                        {item.units && item.units.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5 ml-8">
                            {item.units.map((u) => (
                              <Badge key={u.id} variant="outline" className="text-xs font-mono">
                                {u.serialNumber ?? "Tanpa SN"}
                              </Badge>
                            ))}
                          </div>
                        )}
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
                    {userAccess.accessAccessoryUpdate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(sale)}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    )}
                    {userAccess.accessAccessoryDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingSale(sale)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Hapus
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailSale !== null} onOpenChange={(open) => !open && setDetailSale(null)}>
        <DialogContent className="min-w-[95vw]! max-w-6xl w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-4 gap-4">
          <DialogHeader>
            <div className="flex items-center justify-between mt-2 mr-6">
              <DialogTitle>
                Detail Penjualan {detailSale ? `#${detailSale.id}` : ""}
              </DialogTitle>
            </div>
          </DialogHeader>
          {detailSale && (
            <div className="flex items-center gap-2 flex-wrap">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendWorkerInvoice(detailSale.id)}
                disabled={isSendingWorkerInvoice}
              >
                <MessageSquare className="mr-1 h-4 w-4" />
                {isSendingWorkerInvoice
                  ? "Mengirim..."
                  : "Kirim Invoice Worker"}
              </Button>
              <AccessoryReceiptPrintButton
                sale={detailSale}
                storeInformation={storeInformation}
              />
            </div>
          )}
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
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Diskon</p>
                  <p className="font-medium">{formatCurrency(detailSale.discount)}</p>
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
                        <TableCell>
                          <div>{item.accessory.name}</div>
                          {item.units && item.units.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.units.map((u) => (
                                <Badge key={u.id} variant="outline" className="text-xs font-mono">
                                  {u.serialNumber ?? "Tanpa SN"}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
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
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {formatCurrency(
                      detailSale.items.reduce(
                        (sum, item) => sum + item.sellPricePerUnit * item.quantity,
                        0,
                      ),
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Diskon</span>
                  <span className="font-medium">
                    - {formatCurrency(detailSale.discount)}
                  </span>
                </div>
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
        {/* HAPUS overflow-auto dan ganti dengan overflow-hidden agar modal tidak tembus layar */}
        <DialogContent className="max-w-6xl min-w-[95vw]! h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">

          {/* Tambahkan shrink-0 dan bg-background agar header tetap di posisinya */}
          <div className="p-4 md:p-6 border-b flex items-center justify-between shrink-0 bg-background z-10">
            <DialogTitle>Edit Penjualan #{editingSale?.id}</DialogTitle>
          </div>

          {editingSale && (

            <div className="flex-1 overflow-hidden grid grid-rows-2 lg:grid-rows-1 lg:grid-cols-5 bg-muted/20">

              {/* KIRI: Daftar Aksesoris (Pilih Barang) */}
              {/* Tambahkan overflow-hidden agar scrollbar hanya muncul di area list */}
              <div className="lg:col-span-3 h-full overflow-hidden flex flex-col border-b lg:border-b-0 lg:border-r bg-background">
                <div className="p-4 border-b space-y-3 shrink-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Search className="w-4 h-4" /> Cari Aksesoris
                  </div>
                  <Input
                    placeholder="Ketik nama aksesoris..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {filteredAccessories.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada aksesoris yang cocok.
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {filteredAccessories.map((acc) => {
                        const cartItem = cart.find((item) => item.accessory.id === acc.id);
                        const qtyInCart = cartItem ? cartItem.selectedUnitIds.length : 0;
                        const displayAcc = cartItem ? cartItem.accessory : acc;

                        const noSnUnits = displayAcc.availableUnits.filter((u) => !u.serialNumber);
                        const snUnits = displayAcc.availableUnits.filter((u) => u.serialNumber);
                        const hasNoSn = noSnUnits.length > 0;
                        const hasSn = snUnits.length > 0;
                        const isExpanded = expandedAccessoryId === displayAcc.id;

                        return (
                          <div
                            key={displayAcc.id}
                            className={`relative flex flex-col rounded-xl border bg-card transition-all ${qtyInCart > 0 ? "border-primary/50 shadow-sm" : ""}`}
                          >
                            {qtyInCart > 0 && (
                              <Badge className="absolute -top-2 -right-2 z-10 w-6 h-6 flex items-center justify-center p-0 text-xs">
                                {qtyInCart}
                              </Badge>
                            )}

                            <div className="p-4 flex gap-3">
                              <div className="h-16 w-16 shrink-0 rounded-md border overflow-hidden bg-muted relative">
                                {displayAcc.images[0] ? (
                                  <Image
                                    src={displayAcc.images[0]}
                                    alt={displayAcc.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <Image
                                      src={IMAGE_PLACEHOLDER}
                                      alt="Placeholder"
                                      fill
                                      className="object-cover opacity-50"
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1">
                                  {displayAcc.name}
                                </h3>
                                <p className="text-primary font-semibold text-sm">
                                  {formatCurrency(displayAcc.sellPrice)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Tersedia: {displayAcc.availableUnits.length} unit
                                </p>
                              </div>
                            </div>

                            <div className="mt-auto border-t p-2">
                              {hasSn ? (
                                <Button
                                  variant="secondary"
                                  className="w-full h-8 text-xs"
                                  onClick={() =>
                                    setExpandedAccessoryId(
                                      isExpanded ? null : displayAcc.id,
                                    )
                                  }
                                >
                                  {isExpanded ? "Tutup" : "Pilih Serial Number"}
                                </Button>
                              ) : hasNoSn ? (
                                <div className="flex items-center justify-between px-2 py-1">
                                  <span className="text-xs text-muted-foreground font-medium">
                                    Tanpa SN
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() =>
                                        setNoSnQuantity(displayAcc, Math.max(0, qtyInCart - 1))
                                      }
                                      disabled={qtyInCart === 0}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-4 text-center">
                                      {qtyInCart}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() =>
                                        setNoSnQuantity(
                                          displayAcc,
                                          Math.min(noSnUnits.length, qtyInCart + 1),
                                        )
                                      }
                                      disabled={qtyInCart >= noSnUnits.length}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  className="w-full h-8 text-xs"
                                  disabled
                                >
                                  Habis
                                </Button>
                              )}
                            </div>

                            {/* Panel Serial Number */}
                            {isExpanded && hasSn && (
                              <div className="border-t bg-muted/30 p-3 max-h-48 overflow-y-auto rounded-b-xl">
                                <div className="space-y-2">
                                  {snUnits.map((u) => {
                                    const isSelected = cartItem?.selectedUnitIds.includes(u.id);
                                    return (
                                      <label
                                        key={u.id}
                                        className={`flex items-center justify-between p-2 rounded-lg border text-sm cursor-pointer transition-colors ${isSelected
                                          ? "bg-primary/5 border-primary/30"
                                          : "bg-background hover:bg-muted/50"
                                          }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleUnit(displayAcc, u.id)}
                                          />
                                          <span className="font-medium">
                                            {u.serialNumber}
                                          </span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>

                                {hasNoSn && (
                                  <div className="mt-4 pt-3 border-t">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium">Tanpa SN</span>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => {
                                            const currNoSnQty =
                                              cartItem?.selectedUnitIds.filter((id) =>
                                                noSnUnits.some((u) => u.id === id),
                                              ).length || 0;
                                            setNoSnQuantity(displayAcc, Math.max(0, currNoSnQty - 1));
                                          }}
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-xs font-medium w-4 text-center">
                                          {cartItem?.selectedUnitIds.filter((id) =>
                                            noSnUnits.some((u) => u.id === id),
                                          ).length || 0}
                                        </span>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => {
                                            const currNoSnQty =
                                              cartItem?.selectedUnitIds.filter((id) =>
                                                noSnUnits.some((u) => u.id === id),
                                              ).length || 0;
                                            setNoSnQuantity(
                                              displayAcc,
                                              Math.min(noSnUnits.length, currNoSnQty + 1),
                                            );
                                          }}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-xs text-muted-foreground">
                                          / {noSnUnits.length}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* KANAN: Keranjang & Detail Edit */}
              {/* Tambahkan overflow-hidden dan pastikan h-full mengambil space row */}
              <div className="lg:col-span-2 h-full overflow-hidden flex flex-col bg-card relative shadow-xl">

                {/* Bagian keranjang dibuat scrollable (flex-1 overflow-y-auto) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                  {/* Daftar Item Terpilih */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" /> Item dalam Penjualan
                    </h3>

                    {cart.length === 0 ? (
                      <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground text-sm bg-muted/10">
                        Keranjang kosong
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cart.map((item) => {
                          const itemQty = item.selectedUnitIds.length;
                          const itemTotal = item.accessory.sellPrice * itemQty;
                          return (
                            <div key={item.accessory.id} className="text-sm bg-background border rounded-lg overflow-hidden">
                              <div className="p-3 flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{item.accessory.name}</p>
                                  <p className="text-muted-foreground text-xs mt-0.5">
                                    {itemQty} x {formatCurrency(item.accessory.sellPrice)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{formatCurrency(itemTotal)}</p>
                                  <button
                                    onClick={() => removeFromCart(item.accessory.id)}
                                    className="text-xs text-destructive hover:underline mt-1"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Customer & Worker inputs */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Customer</Label>
                      <Select value={customerId} onValueChange={setCustomerId}>
                        <SelectTrigger className="h-9">
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
                      <Label className="text-xs">Worker</Label>
                      <Select value={workerId} onValueChange={setWorkerId}>
                        <SelectTrigger className="h-9">
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

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Fee Worker (Rp)</Label>
                        <Input
                          type="number"
                          className="h-9"
                          min={0}
                          value={feeWorker}
                          onChange={(e) => setFeeWorker(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Diskon (Rp)</Label>
                        <Input
                          type="number"
                          className="h-9"
                          min={0}
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Summary */}
                  <div className="space-y-2.5 pb-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({editTotalItems} item)</span>
                      <span>{formatCurrency(editTotalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Diskon</span>
                      <span className="text-destructive">
                        - {formatCurrency(editEffectiveDiscount)}
                      </span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total Bayar</span>
                      <span className="text-primary">{formatCurrency(editTotalAfterDiscount)}</span>
                    </div>
                  </div>
                </div>

                {/* 
            PERUBAHAN UTAMA: Tambahkan shrink-0 di tombol
            Ini memastikan area tombol TIDAK TERGENCET oleh scroll
            dan akan memposisikan dirinya statis di area paling bawah modal
          */}
                <div className="shrink-0 p-4 border-t bg-muted/30 grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => setEditingSale(null)} className="w-full">
                    Batal
                  </Button>
                  <Button onClick={handleUpdateSale} disabled={isPending || cart.length === 0} className="w-full">
                    {isPending ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </div>
            </div>
          )}
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
