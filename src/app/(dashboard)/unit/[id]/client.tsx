"use client";

import { useEffect, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { updateUnit, deleteUnit } from "@/actions/unit";
import { sendUnitInvoiceWhatsApp } from "@/actions/message";
import { createCustomer } from "@/actions/customer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useGlobalScanner } from "@/hooks/useGlobalScanner";
import { CameraScanner } from "@/components/ui/camera-scanner";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash2, Plus, MessageSquare } from "lucide-react";
import type { Status, Customer, PaymentType } from "@prisma/client";
import type { WorkerData } from "@/actions/worker";
import { UNIT_PAYMENT_TYPE_CONFIG, UNIT_STATUS_CONFIG } from "@/constants/unit";

interface UnitLog {
  id: number;
  type: string;
  statusBefore: Status | null;
  statusAfter: Status | null;
  buyPriceBefore: number | null;
  buyPriceAfter: number | null;
  soldPriceBefore: number | null;
  soldPriceAfter: number | null;
  dpAmountBefore: number | null;
  dpAmountAfter: number | null;
  noteBefore: string | null;
  noteAfter: string | null;
  logActionNote: string | null;
  customerBefore: Customer | null;
  customerAfter: Customer | null;
  user: { id: number; email: string };
  createdAt: Date;
}

interface UnitData {
  id: number;
  name: string;
  imei: string | null;
  note: string | null;
  images: string[];
  status: Status;
  buyAt: Date | null;
  buyPrice: number | null;
  soldAt: Date | null;
  soldPrice: number | null;
  dpAmount: number | null;
  customerId: number | null;
  customer: Customer | null;
  workerId: number | null;
  worker: { id: number; name: string; phone: string } | null;
  workerFee: number | null;
  paymentType: PaymentType | null;
  unitLogs: UnitLog[];
  createdAt: Date;
  updatedAt: Date;
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
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
  unit: UnitData;
  customers: Customer[];
  workers: WorkerData[];
  unitFeePercentage: number;
}

export function UnitDetailClient({
  unit,
  customers: initialCustomers,
  workers,
  unitFeePercentage,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status | "">("");

  // Edit fields
  const [name, setName] = useState(unit.name);
  const [imei, setImei] = useState(unit.imei ?? "");
  const [note, setNote] = useState(unit.note ?? "");
  const [buyPrice, setBuyPrice] = useState(unit.buyPrice?.toString() ?? "");
  const [buyAt, setBuyAt] = useState(
    unit.buyAt ? new Date(unit.buyAt).toISOString().split("T")[0] : ""
  );
  const [images, setImages] = useState<string[]>(unit.images);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Global scanner listener for Edit Mode
  useGlobalScanner((scannedCode) => {
    if (isEditing) {
      setImei(scannedCode);
      toast.success("IMEI berhasil di-scan!");
    }
  });

  // Status change fields
  const [customerId, setCustomerId] = useState(unit.customerId?.toString() ?? "");
  const [soldPrice, setSoldPrice] = useState(unit.soldPrice?.toString() ?? "");
  const [dpAmount, setDpAmount] = useState(unit.dpAmount?.toString() ?? "");
  const [paymentType, setPaymentType] = useState<PaymentType>(
    unit.paymentType ?? "CASH"
  );

  // Inline tambah customer baru
  const [customerList, setCustomerList] = useState(initialCustomers);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Worker fields for SOLD status
  const [workerId, setWorkerId] = useState(unit.workerId?.toString() ?? "");
  const [workerFee, setWorkerFee] = useState(unit.workerFee?.toString() ?? "");

  useEffect(() => {
    if (selectedStatus !== "SOLD") return;

    const parsedSoldPrice = Number.parseInt(soldPrice, 10);
    const buyPriceValue = unit.buyPrice ?? 0;

    if (Number.isNaN(parsedSoldPrice)) {
      setWorkerFee("");
      return;
    }

    const profit = Math.max(parsedSoldPrice - buyPriceValue, 0);
    const nextWorkerFee = Math.round((profit * unitFeePercentage) / 100);
    setWorkerFee(nextWorkerFee.toString());
  }, [selectedStatus, soldPrice, unit.buyPrice, unitFeePercentage]);

  function handleSaveEdit() {
    startTransition(async () => {
      const result = await updateUnit({
        id: unit.id,
        name,
        imei: imei || undefined,
        note: note || undefined,
        buyPrice: buyPrice ? parseInt(buyPrice, 10) : undefined,
        buyAt: buyAt ? new Date(buyAt) : undefined,
        images,
      });
      if (result.success) {
        toast.success("Unit berhasil diperbarui.");
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal memperbarui unit.");
      }
    });
  }

  function handleStatusChange() {
    if (!selectedStatus) return;

    startTransition(async () => {
      const data: {
        id: number;
        status: Status;
        customerId?: number | null;
        soldPrice?: number;
        soldAt?: Date;
        dpAmount?: number;
        workerId?: number | null;
        workerFee?: number;
        paymentType?: PaymentType | null;
      } = {
        id: unit.id,
        status: selectedStatus as Status,
      };

      if (selectedStatus === "BOOKED" || selectedStatus === "SOLD") {
        data.customerId = customerId ? parseInt(customerId, 10) : null;
        data.dpAmount = dpAmount ? parseInt(dpAmount, 10) : undefined;
      }

      if (selectedStatus === "SOLD") {
        if (!workerId) {
          toast.error("Worker wajib dipilih saat status SOLD!");
          return;
        }
        if (!workerFee || parseInt(workerFee, 10) < 0) {
          toast.error("Fee worker wajib diisi saat status SOLD!");
          return;
        }
        data.soldPrice = soldPrice ? parseInt(soldPrice, 10) : undefined;
        data.soldAt = new Date();
        data.workerId = parseInt(workerId, 10);
        data.workerFee = parseInt(workerFee, 10);
        data.paymentType = paymentType;
      }

      if (selectedStatus !== "SOLD") {
        data.paymentType = null;
      }

      if (selectedStatus === "AVAILABLE" || selectedStatus === "RETURNED") {
        data.customerId = null;
      }

      const result = await updateUnit(data);
      if (result.success) {
        toast.success(`Status berhasil diubah ke ${UNIT_STATUS_CONFIG[selectedStatus as Status].label}.`);
        setStatusDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal mengubah status.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUnit(unit.id);
      if (result.success) {
        toast.success("Unit berhasil dihapus.");
        router.push("/unit");
      } else {
        toast.error(result.error ?? "Gagal menghapus unit.");
      }
    });
  }

  function openStatusDialog(status: Status) {
    setSelectedStatus(status);
    if (status === "SOLD") {
      setPaymentType(unit.paymentType ?? "CASH");
    }
    setShowNewCustomerForm(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setStatusDialogOpen(true);
  }

  function handleCreateNewCustomer() {
    if (!newCustomerName.trim()) {
      toast.error("Nama customer wajib diisi.");
      return;
    }

    setIsCreatingCustomer(true);
    startTransition(async () => {
      const result = await createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
      });
      setIsCreatingCustomer(false);

      if (result.success && result.data) {
        toast.success(`Customer "${result.data.name}" berhasil ditambahkan.`);
        setCustomerList((prev) => [result.data!, ...prev]);
        setCustomerId(result.data.id.toString());
        setShowNewCustomerForm(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
      } else {
        toast.error(result.error ?? "Gagal menambahkan customer.");
      }
    });
  }

  function handleSendInvoice() {
    setIsSendingInvoice(true);
    startTransition(async () => {
      const result = await sendUnitInvoiceWhatsApp(unit.id);
      setIsSendingInvoice(false);
      if (result.success) {
        toast.success("Invoice WhatsApp berhasil dikirim.");
      } else {
        toast.error(result.error ?? "Gagal mengirim invoice.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{unit.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={UNIT_STATUS_CONFIG[unit.status].variant} className={UNIT_STATUS_CONFIG[unit.status].className}>
              {UNIT_STATUS_CONFIG[unit.status].label}
            </Badge>
            {unit.imei && (
              <span className="text-xs text-muted-foreground font-mono">
                IMEI: {unit.imei}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {unit.status === "SOLD" && unit.customerId && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSendInvoice}
              disabled={isSendingInvoice}
            >
              <MessageSquare className="mr-1 h-3 w-3" />
              {isSendingInvoice ? "Mengirim..." : "Kirim Invoice WA"}
            </Button>
          )}
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
                <AlertDialogTitle>Hapus Unit?</AlertDialogTitle>
                <AlertDialogDescription>
                  Unit &quot;{unit.name}&quot; akan dihapus. Tindakan ini tidak
                  dapat dibatalkan.
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

      {/* Detail / Edit Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Unit</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Foto Unit</Label>
                <ImageUploader images={images} setImages={setImages} />
              </div>
              <div className="space-y-2">
                <Label>Nama Unit</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>IMEI</Label>
                <div className="flex items-center gap-2">
                  <Input value={imei} onChange={(e) => setImei(e.target.value)} className="flex-1" />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setIsScannerOpen(true)}
                  >
                    Scan Kamera
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Harga Beli (Rp)</Label>
                  <Input
                    type="number"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Beli</Label>
                  <Input
                    type="date"
                    value={buyAt}
                    onChange={(e) => setBuyAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
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
                <p className="font-medium">{unit.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">IMEI</p>
                <p className="font-medium">{unit.imei ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Harga Beli</p>
                <p className="font-medium">{formatCurrency(unit.buyPrice)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tanggal Beli</p>
                <p className="font-medium">{formatDate(unit.buyAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Harga Jual</p>
                <p className="font-medium">{formatCurrency(unit.soldPrice)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tanggal Jual</p>
                <p className="font-medium">{formatDate(unit.soldAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">DP</p>
                <p className="font-medium">{formatCurrency(unit.dpAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Customer</p>
                <p className="font-medium">{unit.customer?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipe Pembayaran</p>
                <p className="font-medium">
                  {unit.paymentType
                    ? UNIT_PAYMENT_TYPE_CONFIG[unit.paymentType].label
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Worker</p>
                <p className="font-medium">{unit.worker?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fee Worker</p>
                <p className="font-medium">{formatCurrency(unit.workerFee)}</p>
              </div>
              {unit.note && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Catatan</p>
                  <p className="font-medium whitespace-pre-wrap">{unit.note}</p>
                </div>
              )}
              {unit.images.length > 0 && (
                <div className="col-span-2 space-y-2 mt-2">
                  <p className="text-muted-foreground">Foto Unit</p>
                  <div className="flex flex-wrap gap-2">
                    {unit.images.map((url, idx) => (
                      <div 
                        key={idx} 
                        className="relative h-20 w-20 rounded-md border overflow-hidden cursor-pointer opacity-90 transition-opacity hover:opacity-100 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                        onClick={() => setFullscreenImage(url)}
                      >
                        <Image src={url} alt="Unit" fill className="object-cover" sizes="80px" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ubah Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(["AVAILABLE", "BOOKED", "SOLD", "RETURNED"] as Status[])
              .filter((s) => s !== unit.status)
              .map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  onClick={() => openStatusDialog(status)}
                >
                  Ubah ke {UNIT_STATUS_CONFIG[status].label}
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ubah Status ke {selectedStatus ? UNIT_STATUS_CONFIG[selectedStatus as Status].label : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(selectedStatus === "BOOKED" || selectedStatus === "SOLD") && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Customer</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 text-xs"
                      onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {showNewCustomerForm ? "Pilih yang ada" : "Tambah baru"}
                    </Button>
                  </div>

                  {showNewCustomerForm ? (
                    <div className="rounded-md border p-3 space-y-3 bg-muted/30">
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
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        onClick={handleCreateNewCustomer}
                        disabled={isCreatingCustomer || isPending}
                      >
                        {isCreatingCustomer ? "Menyimpan..." : "Simpan Customer"}
                      </Button>
                    </div>
                  ) : (
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customerList.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Separator />
                <div className="space-y-2">
                  <Label>Uang Muka / DP (Rp)</Label>
                  <Input
                    type="number"
                    value={dpAmount}
                    onChange={(e) => setDpAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </>
            )}
            {selectedStatus === "SOLD" && (
              <>
                <div className="space-y-2">
                  <Label>Harga Jual (Rp)</Label>
                  <Input
                    type="number"
                    value={soldPrice}
                    onChange={(e) => setSoldPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Tipe Pembayaran (Wajib) *</Label>
                  <Select
                    value={paymentType}
                    onValueChange={(value) => setPaymentType(value as PaymentType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe pembayaran" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIT_PAYMENT_TYPE_CONFIG).map(
                        ([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Worker (Wajib) *</Label>
                  <Select value={workerId} onValueChange={setWorkerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={w.id.toString()}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fee Worker (Rp) *</Label>
                  <Input
                    type="number"
                    value={workerFee}
                    onChange={(e) => setWorkerFee(e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Otomatis {unitFeePercentage}% dari laba
                    {unit.buyPrice != null ? ` (harga jual - ${formatCurrency(unit.buyPrice)})` : ""}.
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
            >
              Batal
            </Button>
            <Button onClick={handleStatusChange} disabled={isPending}>
              {isPending ? "Memproses..." : "Konfirmasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Perubahan</CardTitle>
        </CardHeader>
        <CardContent>
          {unit.unitLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada riwayat perubahan.
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Oleh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unit.unitLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.logActionNote ?? "—"}
                        {log.statusBefore && log.statusAfter && (
                          <span className="text-xs text-muted-foreground block">
                            {UNIT_STATUS_CONFIG[log.statusBefore].label} →{" "}
                            {UNIT_STATUS_CONFIG[log.statusAfter].label}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.user.email}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Image Dialog */}
      <Dialog open={!!fullscreenImage} onOpenChange={(open) => !open && setFullscreenImage(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-5xl h-[90vh] p-4 border-none bg-black/60 shadow-none [&>button]:text-white [&>button]:right-6 [&>button]:top-6 [&>button]:bg-black/40 hover:[&>button]:bg-black/60 [&>button]:rounded-md [&>button]:p-1.5 [&>button>svg]:h-5 [&>button>svg]:w-5 backdrop-blur-sm">
          <DialogTitle className="sr-only">Fullscreen Image</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center">
            {fullscreenImage && (
              <Image 
                src={fullscreenImage} 
                alt="Fullscreen" 
                fill 
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 1024px" 
                quality={100}
                priority
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <CameraScanner 
        open={isScannerOpen} 
        onOpenChange={setIsScannerOpen} 
        onScan={(code) => {
          setImei(code);
          toast.success("IMEI berhasil di-scan dari kamera!");
        }} 
      />
    </div>
  );
}
