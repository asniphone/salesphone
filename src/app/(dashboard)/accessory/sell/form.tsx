"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createAccessorySale } from "@/actions/accessory";
import type { AccessoryForSale } from "@/actions/accessory";
import { createCustomer as createCustomerAction } from "@/actions/customer";
import {
  sendAccessorySaleInvoiceWhatsApp,
  sendAccessorySaleWorkerInvoiceWhatsApp,
} from "@/actions/message";
import type { WorkerData } from "@/actions/worker";
import type { Customer } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Image from "next/image";
import { IMAGE_PLACEHOLDER } from "@/constants/common";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Search,
  UserPlus,
  Receipt,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

// Each cart item tracks selected unit IDs
interface CartItem {
  accessory: AccessoryForSale;
  selectedUnitIds: number[];
}

interface Props {
  accessories: AccessoryForSale[];
  customers: Customer[];
  workers: WorkerData[];
}

export function AccessorySellForm({ accessories, customers, workers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAccessoryId, setExpandedAccessoryId] = useState<number | null>(null);

  const [customerList, setCustomerList] = useState(customers);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [feeWorker, setFeeWorker] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [sendInvoiceToCustomer, setSendInvoiceToCustomer] = useState(false);
  const [sendInvoiceToWorker, setSendInvoiceToWorker] = useState(false);

  const filteredAccessories = accessories.filter((acc) =>
    acc.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Toggle a single unit (with SN) selection
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

  // For no-SN units: set quantity (picks first N available no-SN units)
  function setNoSnQuantity(accessory: AccessoryForSale, qty: number) {
    const noSnUnits = accessory.availableUnits.filter((u) => !u.serialNumber);
    const snUnits = accessory.availableUnits.filter((u) => u.serialNumber);
    const clampedQty = Math.max(0, Math.min(qty, noSnUnits.length));

    setCart((prev) => {
      const existing = prev.find((item) => item.accessory.id === accessory.id);
      // Keep any SN-based selections
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

  // Computed values
  const totalItems = cart.reduce((sum, item) => sum + item.selectedUnitIds.length, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.accessory.sellPrice * item.selectedUnitIds.length,
    0,
  );
  const totalProfit = cart.reduce((sum, item) => {
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
  const parsedDiscount = Number.parseInt(discount, 10);
  const effectiveDiscount =
    Number.isNaN(parsedDiscount) || parsedDiscount < 0
      ? 0
      : Math.min(parsedDiscount, totalPrice);
  const totalAfterDiscount = Math.max(totalPrice - effectiveDiscount, 0);
  const profitAfterDiscount = totalProfit - effectiveDiscount;

  function handleCreateCustomer() {
    if (!newCustomerName.trim()) {
      toast.error("Nama customer wajib diisi.");
      return;
    }
    setIsCreatingCustomer(true);
    startTransition(async () => {
      const result = await createCustomerAction({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
      });
      setIsCreatingCustomer(false);
      if (result.success && result.data) {
        toast.success(`Customer "${result.data.name}" ditambahkan.`);
        setCustomerList((prev) => [result.data!, ...prev]);
        setSelectedCustomerId(result.data.id.toString());
        setShowNewCustomerForm(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
      } else {
        toast.error(result.error ?? "Gagal menambahkan customer.");
      }
    });
  }

  function handlePreSubmit() {
    if (cart.length === 0) {
      toast.error("Tambahkan minimal 1 item ke keranjang.");
      return;
    }
    if (!selectedCustomerId) {
      toast.error("Pilih atau tambahkan customer terlebih dahulu.");
      return;
    }
    if (!selectedWorkerId) {
      toast.error("Pilih worker terlebih dahulu.");
      return;
    }
    const parsedFeeWorker = parseInt(feeWorker, 10);
    if (Number.isNaN(parsedFeeWorker) || parsedFeeWorker < 0) {
      toast.error("Fee worker wajib diisi dengan angka 0 atau lebih.");
      return;
    }
    const parsedDiscountValue = parseInt(discount, 10);
    if (Number.isNaN(parsedDiscountValue) || parsedDiscountValue < 0) {
      toast.error("Diskon wajib diisi dengan angka 0 atau lebih.");
      return;
    }
    if (parsedDiscountValue > totalPrice) {
      toast.error("Diskon tidak boleh melebihi subtotal belanja.");
      return;
    }
    setIsConfirmOpen(true);
  }

  function processSale() {
    setIsConfirmOpen(false);
    startTransition(async () => {
      const parsedFeeWorker = parseInt(feeWorker, 10);
      const parsedDiscountValue = parseInt(discount, 10);
      const result = await createAccessorySale({
        customerId: parseInt(selectedCustomerId, 10),
        workerId: parseInt(selectedWorkerId, 10),
        feeWorker: parsedFeeWorker,
        discount: parsedDiscountValue,
        items: cart.map((item) => ({
          accessoryId: item.accessory.id,
          unitIds: item.selectedUnitIds,
        })),
      });

      if (result.success && result.data) {
        toast.success(
          `Penjualan berhasil! Total: ${formatCurrency(result.data.totalPrice)}`,
        );
        if (sendInvoiceToCustomer) {
          const invoiceResult = await sendAccessorySaleInvoiceWhatsApp(result.data.id);
          if (invoiceResult.success) {
            toast.success("Invoice customer WA berhasil dikirim.");
          } else {
            toast.error(invoiceResult.error ?? "Penjualan berhasil, namun gagal mengirim invoice customer.");
          }
        }
        if (sendInvoiceToWorker) {
          const invoiceWorkerResult = await sendAccessorySaleWorkerInvoiceWhatsApp(
            result.data.id,
          );
          if (invoiceWorkerResult.success) {
            toast.success("Invoice worker WA berhasil dikirim.");
          } else {
            toast.error(
              invoiceWorkerResult.error ??
                "Penjualan berhasil, namun gagal mengirim invoice worker.",
            );
          }
        }
        router.push("/accessory");
      } else {
        toast.error(result.error ?? "Gagal memproses penjualan.");
      }
    });
  }

  // Helper: get current no-SN qty in cart for an accessory
  function getNoSnQtyInCart(accessory: AccessoryForSale): number {
    const cartItem = cart.find((c) => c.accessory.id === accessory.id);
    if (!cartItem) return 0;
    const noSnUnits = accessory.availableUnits.filter((u) => !u.serialNumber);
    return cartItem.selectedUnitIds.filter((id) =>
      noSnUnits.some((u) => u.id === id),
    ).length;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* ─── Kiri: Pilih Aksesoris ─── */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Pilih Aksesoris
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama aksesoris..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredAccessories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchQuery ? "Tidak ada aksesoris yang cocok." : "Tidak ada aksesoris dengan stok tersedia."}
              </p>
            ) : (
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {filteredAccessories.map((acc) => {
                  const inCart = cart.find((c) => c.accessory.id === acc.id);
                  const isExpanded = expandedAccessoryId === acc.id;
                  const snUnits = acc.availableUnits.filter((u) => u.serialNumber);
                  const noSnUnits = acc.availableUnits.filter((u) => !u.serialNumber);
                  const noSnQtyInCart = getNoSnQtyInCart(acc);

                  return (
                    <div key={acc.id} className={`rounded-lg border transition-colors ${
                      inCart
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/30"
                    }`}>
                      {/* Header row */}
                      <button
                        type="button"
                        onClick={() => setExpandedAccessoryId(isExpanded ? null : acc.id)}
                        className="flex items-center gap-3 p-3 text-left w-full"
                      >
                        <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden border">
                          <Image
                            src={acc.images[0] ?? IMAGE_PLACEHOLDER}
                            alt={acc.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm leading-tight truncate">{acc.name}</p>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            {formatCurrency(acc.sellPrice)}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge
                              variant={acc.recordedStock <= 5 ? "destructive" : "secondary"}
                              className={`text-xs h-5 ${acc.recordedStock > 5 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : ""}`}
                            >
                              Stok: {acc.recordedStock}
                            </Badge>
                            {inCart && (
                              <Badge variant="outline" className="text-xs h-5 border-primary text-primary">
                                Dipilih: {inCart.selectedUnitIds.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </button>

                      {/* Expanded: Unit selection */}
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2">
                          <Separator />

                          {/* Units with SN */}
                          {snUnits.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground">Pilih Serial Number:</p>
                              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                {snUnits.map((unit) => {
                                  const checked = inCart?.selectedUnitIds.includes(unit.id) ?? false;
                                  return (
                                    <label
                                      key={unit.id}
                                      className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => toggleUnit(acc, unit.id)}
                                      />
                                      <span className="text-sm font-mono flex-1">{unit.serialNumber}</span>
                                      <span className="text-xs text-muted-foreground">
                                        Modal: {formatCurrency(unit.buyPrice)}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Units without SN */}
                          {noSnUnits.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground">
                                Tanpa SN ({noSnUnits.length} tersedia):
                              </p>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setNoSnQuantity(acc, noSnQtyInCart - 1)}
                                  disabled={noSnQtyInCart <= 0}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={noSnQtyInCart}
                                  onChange={(e) =>
                                    setNoSnQuantity(acc, parseInt(e.target.value, 10) || 0)
                                  }
                                  className="h-8 w-16 text-center text-sm"
                                  min={0}
                                  max={noSnUnits.length}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setNoSnQuantity(acc, noSnQtyInCart + 1)}
                                  disabled={noSnQtyInCart >= noSnUnits.length}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                  / {noSnUnits.length}
                                </span>
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
          </CardContent>
        </Card>
      </div>

      {/* ─── Kanan: Keranjang & Customer ─── */}
      <div className="lg:col-span-2 space-y-4">
        {/* Pilih Customer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {showNewCustomerForm ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nama Customer *</Label>
                  <Input
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Nama pelanggan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telepon</Label>
                  <Input
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="08xx (opsional)"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateCustomer}
                    disabled={isCreatingCustomer || isPending}
                    className="flex-1"
                  >
                    {isCreatingCustomer ? "Menyimpan..." : "Simpan Customer"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewCustomerForm(false)}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Select
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customerList.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                        {c.phone && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            ({c.phone})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-8 text-muted-foreground"
                  onClick={() => setShowNewCustomerForm(true)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Tambah Customer Baru
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Worker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Pilih Worker *</Label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih worker..." />
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
            <div className="space-y-1.5">
              <Label className="text-xs">Fee Worker (Rp) *</Label>
              <Input
                type="number"
                min={0}
                value={feeWorker}
                onChange={(e) => setFeeWorker(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Diskon (Rp)</Label>
              <Input
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Diskon akan mengurangi total bayar dan profit transaksi.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Keranjang */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Keranjang
              {cart.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {totalItems} item
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Klik aksesoris di kiri untuk menambahkan.
              </p>
            ) : (
              <>
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.accessory.id}
                      className="rounded-lg border p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative h-9 w-9 shrink-0 rounded overflow-hidden border">
                          <Image
                            src={item.accessory.images[0] ?? IMAGE_PLACEHOLDER}
                            alt={item.accessory.name}
                            fill
                            className="object-cover"
                            sizes="36px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight truncate">
                            {item.accessory.name}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {formatCurrency(item.accessory.sellPrice)} × {item.selectedUnitIds.length}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(item.accessory.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {/* Show selected SNs */}
                      {item.selectedUnitIds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.selectedUnitIds.map((unitId) => {
                            const unit = item.accessory.availableUnits.find(
                              (u) => u.id === unitId,
                            );
                            return (
                              <Badge key={unitId} variant="outline" className="text-xs">
                                {unit?.serialNumber ?? "Tanpa SN"}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal ({totalItems} item)</span>
                    <span className="font-mono">{formatCurrency(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Diskon</span>
                    <span className="font-mono">- {formatCurrency(effectiveDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Estimasi Profit Setelah Diskon</span>
                    <span
                      className={`font-mono ${profitAfterDiscount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                    >
                      {formatCurrency(profitAfterDiscount)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total Bayar</span>
                    <span className="font-mono">{formatCurrency(totalAfterDiscount)}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* CTA */}
        <Button
          className="w-full"
          size="lg"
          onClick={handlePreSubmit}
          disabled={
            isPending ||
            cart.length === 0 ||
            !selectedCustomerId ||
            !selectedWorkerId ||
            feeWorker.trim() === ""
          }
        >
          <Receipt className="mr-2 h-4 w-4" />
          {isPending ? "Memproses..." : "Proses Penjualan"}
        </Button>
        {(!selectedCustomerId || cart.length === 0) && (
          <p className="text-xs text-muted-foreground text-center">
            {!selectedCustomerId && cart.length === 0
              ? "Tambahkan item, pilih customer, dan isi worker untuk melanjutkan."
              : !selectedCustomerId
                ? "Pilih customer untuk melanjutkan."
                : "Tambahkan item ke keranjang."}
          </p>
        )}
        {(selectedCustomerId && (!selectedWorkerId || feeWorker.trim() === "")) && (
          <p className="text-xs text-muted-foreground text-center">
            Pilih worker dan isi fee worker untuk melanjutkan.
          </p>
        )}
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Penjualan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin memproses penjualan ini? Total belanja pelanggan adalah{" "}
              <strong>{formatCurrency(totalAfterDiscount)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 px-1">
            <div className="flex items-start gap-3">
              <Checkbox
                id="sendInvoiceCustomer"
                checked={sendInvoiceToCustomer}
                onCheckedChange={(checked) => setSendInvoiceToCustomer(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="sendInvoiceCustomer" className="font-normal">
                  Kirim invoice ke customer
                </Label>
                <p className="text-xs text-muted-foreground">
                  Membutuhkan nomor WhatsApp customer.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="sendInvoiceWorker"
                checked={sendInvoiceToWorker}
                onCheckedChange={(checked) => setSendInvoiceToWorker(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="sendInvoiceWorker" className="font-normal">
                  Kirim invoice ke worker
                </Label>
                <p className="text-xs text-muted-foreground">
                  Berisi detail transaksi yang ditangani worker.
                </p>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <Button onClick={processSale} disabled={isPending}>
              {isPending ? "Memproses..." : "Proses"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
