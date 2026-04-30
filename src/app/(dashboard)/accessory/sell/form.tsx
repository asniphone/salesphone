"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createAccessorySale } from "@/actions/accessory";
import type { AccessoryForSale } from "@/actions/accessory";
import { createCustomer as createCustomerAction } from "@/actions/customer";
import { sendAccessorySaleInvoiceWhatsApp } from "@/actions/message";
import type { WorkerData } from "@/actions/worker";
import type { Customer } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

interface CartItem {
  accessory: AccessoryForSale;
  quantity: number;
}

interface Props {
  accessories: AccessoryForSale[];
  customers: Customer[];
  workers: WorkerData[];
}

export function AccessorySellForm({ accessories, customers, workers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Customer state
  const [customerList, setCustomerList] = useState(customers);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [feeWorker, setFeeWorker] = useState("0");

  // Filtered accessories
  const filteredAccessories = accessories.filter((acc) =>
    acc.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Cart helpers
  function addToCart(accessory: AccessoryForSale) {
    setCart((prev) => {
      const existing = prev.find((item) => item.accessory.id === accessory.id);
      if (existing) {
        if (existing.quantity >= accessory.recordedStock) {
          toast.error(`Stok "${accessory.name}" maksimal ${accessory.recordedStock} unit.`);
          return prev;
        }
        return prev.map((item) =>
          item.accessory.id === accessory.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { accessory, quantity: 1 }];
    });
  }

  function updateQty(accessoryId: number, newQty: number) {
    const acc = accessories.find((a) => a.id === accessoryId);
    if (!acc) return;
    if (newQty < 1) {
      removeFromCart(accessoryId);
      return;
    }
    if (newQty > acc.recordedStock) {
      toast.error(`Stok "${acc.name}" maksimal ${acc.recordedStock} unit.`);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.accessory.id === accessoryId ? { ...item, quantity: newQty } : item,
      ),
    );
  }

  function removeFromCart(accessoryId: number) {
    setCart((prev) => prev.filter((item) => item.accessory.id !== accessoryId));
  }

  // Totals
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.accessory.sellPrice * item.quantity,
    0,
  );
  const totalProfit = cart.reduce(
    (sum, item) =>
      sum +
      (item.accessory.sellPrice - item.accessory.recordedBuyPrice) * item.quantity,
    0,
  );

  // Create new customer inline
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

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Submit sale validation
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

    setIsConfirmOpen(true);
  }

  function processSale(sendInvoice: boolean) {
    setIsConfirmOpen(false);
    startTransition(async () => {
      const parsedFeeWorker = parseInt(feeWorker, 10);
      const result = await createAccessorySale({
        customerId: parseInt(selectedCustomerId, 10),
        workerId: parseInt(selectedWorkerId, 10),
        feeWorker: parsedFeeWorker,
        items: cart.map((item) => ({
          accessoryId: item.accessory.id,
          quantity: item.quantity,
        })),
      });

      if (result.success && result.data) {
        toast.success(
          `Penjualan berhasil! Total: ${formatCurrency(result.data.totalPrice)}`,
        );

        if (sendInvoice) {
          const invoiceResult = await sendAccessorySaleInvoiceWhatsApp(result.data.id);
          if (invoiceResult.success) {
            toast.success("Invoice WA berhasil dikirim!");
          } else {
            toast.error(invoiceResult.error ?? "Penjualan berhasil, namun gagal mengirim Invoice WA.");
          }
        }

        router.push("/accessory");
      } else {
        toast.error(result.error ?? "Gagal memproses penjualan.");
      }
    });
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
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama aksesoris..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Accessory Grid */}
            {filteredAccessories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchQuery ? "Tidak ada aksesoris yang cocok." : "Tidak ada aksesoris dengan stok tersedia."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredAccessories.map((acc) => {
                  const inCart = cart.find((c) => c.accessory.id === acc.id);
                  const isOutOfStock = acc.recordedStock === 0;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(acc)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors w-full ${isOutOfStock
                          ? "opacity-40 cursor-not-allowed bg-muted"
                          : inCart
                            ? "border-primary bg-primary/5 hover:bg-primary/10"
                            : "hover:bg-muted/60 hover:border-muted-foreground/30"
                        }`}
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
                              Di keranjang: {inCart.quantity}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
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
                      className="flex items-center gap-2 rounded-lg border p-2.5"
                    >
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
                          {formatCurrency(item.accessory.sellPrice)} / unit
                        </p>
                      </div>
                      {/* Qty controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQty(item.accessory.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQty(item.accessory.id, parseInt(e.target.value, 10) || 0)
                          }
                          className="h-7 w-12 text-center text-sm px-1"
                          min={1}
                          max={item.accessory.recordedStock}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQty(item.accessory.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive ml-1"
                          onClick={() => removeFromCart(item.accessory.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Ringkasan */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal ({totalItems} item)</span>
                    <span className="font-mono">{formatCurrency(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Estimasi Profit</span>
                    <span
                      className={`font-mono ${totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                    >
                      {formatCurrency(totalProfit)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span className="font-mono">{formatCurrency(totalPrice)}</span>
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
              <strong>{formatCurrency(totalPrice)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => processSale(false)}
              disabled={isPending}
            >
              {isPending ? "Memproses..." : "Proses Saja"}
            </Button>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                processSale(true);
              }}
              disabled={isPending}
            >
              {isPending ? "Memproses..." : "Proses & Kirim Invoice WA"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
