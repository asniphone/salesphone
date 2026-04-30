"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateAccessory,
  deleteAccessory,
  addAccessoryPurchase,
  updateAccessoryPurchase,
  deleteAccessoryPurchase,
} from "@/actions/accessory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader } from "@/components/ui/image-uploader";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Pencil, Trash2, Plus, ShoppingCart } from "lucide-react";
import type { Prisma } from "@prisma/client";

type AccessoryData = Prisma.AccessoryGetPayload<{
  include: {
    purchases: { where: { deletedAt: null } };
    logs: {
      include: {
        user: { omit: { password: true } };
        purchase: true;
        sale: true;
      };
    };
  };
}>;

type PurchaseRow = AccessoryData["purchases"][number];

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

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

interface Props {
  accessory: AccessoryData;
}

// ============================================================
// Edit Purchase Dialog
// ============================================================
interface EditPurchaseDialogProps {
  purchase: PurchaseRow;
  accessoryId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditPurchaseDialog({
  purchase,
  accessoryId,
  open,
  onOpenChange,
}: EditPurchaseDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [qty, setQty] = useState(purchase.quantity.toString());
  const [price, setPrice] = useState(purchase.buyPricePerUnit.toString());
  const [note, setNote] = useState(purchase.note ?? "");

  function handleSave() {
    const qtyNum = parseInt(qty, 10);
    const priceNum = parseInt(price, 10);
    if (!qtyNum || qtyNum <= 0) {
      toast.error("Jumlah harus lebih dari 0.");
      return;
    }
    if (!priceNum || priceNum < 0) {
      toast.error("Harga harus 0 atau lebih.");
      return;
    }
    startTransition(async () => {
      const result = await updateAccessoryPurchase({
        purchaseId: purchase.id,
        accessoryId,
        quantity: qtyNum,
        buyPricePerUnit: priceNum,
        note: note || undefined,
      });
      if (result.success) {
        toast.success("Data pembelian berhasil diperbarui.");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal memperbarui data pembelian.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Data Pembelian</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jumlah</Label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Harga per Unit (Rp)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min={0}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan pembelian (opsional)"
              rows={2}
            />
          </div>
          <p className="text-xs text-muted-foreground rounded-md bg-muted p-2">
            ⚠️ Mengubah qty atau harga akan merecalculate Moving Average Cost (MAC) secara otomatis.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Main Component
// ============================================================
export function AccessoryDetailClient({ accessory }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseRow | null>(null);

  // Edit accessory fields
  const [name, setName] = useState(accessory.name);
  const [sellPrice, setSellPrice] = useState(accessory.sellPrice.toString());
  const [images, setImages] = useState<string[]>(accessory.images);

  // Add purchase fields
  const [purchaseQty, setPurchaseQty] = useState("");
  const [purchaseBuyPrice, setPurchaseBuyPrice] = useState("");
  const [purchaseNote, setPurchaseNote] = useState("");

  function handleSaveEdit() {
    if (!name.trim()) {
      toast.error("Nama aksesoris wajib diisi.");
      return;
    }
    startTransition(async () => {
      const result = await updateAccessory({
        id: accessory.id,
        name,
        sellPrice: parseInt(sellPrice, 10) || accessory.sellPrice,
        images,
      });
      if (result.success) {
        toast.success("Aksesoris berhasil diperbarui.");
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal memperbarui aksesoris.");
      }
    });
  }

  function handleDeleteAccessory() {
    startTransition(async () => {
      const result = await deleteAccessory(accessory.id);
      if (result.success) {
        toast.success("Aksesoris berhasil dihapus.");
        router.push("/accessory");
      } else {
        toast.error(result.error ?? "Gagal menghapus aksesoris.");
      }
    });
  }

  function handleAddPurchase() {
    const qty = parseInt(purchaseQty, 10);
    const price = parseInt(purchaseBuyPrice, 10);
    if (!qty || qty <= 0) {
      toast.error("Jumlah pembelian harus lebih dari 0.");
      return;
    }
    if (!price || price <= 0) {
      toast.error("Harga beli per unit harus lebih dari 0.");
      return;
    }
    startTransition(async () => {
      const result = await addAccessoryPurchase({
        accessoryId: accessory.id,
        quantity: qty,
        buyPricePerUnit: price,
        note: purchaseNote || undefined,
      });
      if (result.success) {
        toast.success(`Berhasil menambah ${qty} unit stok.`);
        setPurchaseDialogOpen(false);
        setPurchaseQty("");
        setPurchaseBuyPrice("");
        setPurchaseNote("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menambah stok.");
      }
    });
  }

  function handleDeletePurchase(purchaseId: number) {
    startTransition(async () => {
      const result = await deleteAccessoryPurchase(purchaseId, accessory.id);
      if (result.success) {
        toast.success("Data pembelian berhasil dihapus.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menghapus data pembelian.");
      }
    });
  }

  const isLowStock = accessory.recordedStock <= 5;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{accessory.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={isLowStock ? "destructive" : "secondary"}
              className={
                isLowStock
                  ? ""
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
              }
            >
              Stok: {accessory.recordedStock} unit
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPurchaseDialogOpen(true)}
          >
            <ShoppingCart className="mr-1 h-3 w-3" />
            Tambah Stok
          </Button>
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
                <AlertDialogTitle>Hapus Aksesoris?</AlertDialogTitle>
                <AlertDialogDescription>
                  Aksesoris &quot;{accessory.name}&quot; akan dihapus dari inventaris. Tindakan ini
                  tidak dapat dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccessory}
                  disabled={isPending}
                >
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
          <CardTitle className="text-base">Informasi Aksesoris</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Foto Aksesoris</Label>
                <ImageUploader images={images} setImages={setImages} maxUploads={5} />
              </div>
              <div className="space-y-2">
                <Label>Nama Aksesoris</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Harga Jual (Rp)</Label>
                <Input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  min={1}
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
                <p className="font-medium">{accessory.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Stok Tercatat</p>
                <p className="font-medium">{accessory.recordedStock} unit</p>
              </div>
              <div>
                <p className="text-muted-foreground">Harga Modal (MAC)</p>
                <p className="font-medium">{formatCurrency(accessory.recordedBuyPrice)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Harga Jual</p>
                <p className="font-medium">{formatCurrency(accessory.sellPrice)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ditambahkan</p>
                <p className="font-medium">{formatDate(accessory.createdAt)}</p>
              </div>
              {accessory.images.length > 0 && (
                <div className="col-span-2 space-y-2 mt-2">
                  <p className="text-muted-foreground">Foto</p>
                  <div className="flex flex-wrap gap-2">
                    {accessory.images.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative h-20 w-20 rounded-md border overflow-hidden cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                        onClick={() => setFullscreenImage(url)}
                      >
                        <Image
                          src={url}
                          alt="Aksesoris"
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Riwayat Pembelian Stok */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Riwayat Pembelian Stok</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setPurchaseDialogOpen(true)}>
              <Plus className="mr-1 h-3 w-3" />
              Tambah Stok
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accessory.purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat pembelian.</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Harga/Unit</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessory.purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(purchase.createdAt)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        +{purchase.quantity}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {formatCurrency(purchase.buyPricePerUnit)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-medium">
                        {formatCurrency(purchase.buyPriceTotal)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {purchase.note ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingPurchase(purchase)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Data Pembelian?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Pembelian {purchase.quantity} unit @{formatCurrency(purchase.buyPricePerUnit)} akan dihapus.
                                  Stok dan harga modal akan direcalculate secara otomatis.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePurchase(purchase.id)}
                                  disabled={isPending}
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Riwayat Perubahan (Log) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Perubahan</CardTitle>
        </CardHeader>
        <CardContent>
          {accessory.logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat perubahan.</p>
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
                  {accessory.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {log.type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {log.kind}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.logNote ?? "—"}
                        {log.beforeRecordedStock !== null &&
                          log.afterRecordedStock !== null && (
                            <span className="text-xs text-muted-foreground block">
                              Stok: {log.beforeRecordedStock} → {log.afterRecordedStock}
                            </span>
                          )}
                        {log.beforeRecordedBuyPrice !== null &&
                          log.afterRecordedBuyPrice !== null &&
                          log.beforeRecordedBuyPrice !== log.afterRecordedBuyPrice && (
                            <span className="text-xs text-muted-foreground block">
                              MAC: {formatCurrency(log.beforeRecordedBuyPrice)} →{" "}
                              {formatCurrency(log.afterRecordedBuyPrice)}
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

      {/* Dialog Tambah Stok */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Stok Aksesoris</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Stok saat ini:{" "}
              <span className="font-medium text-foreground">{accessory.recordedStock} unit</span>
            </p>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jumlah Pembelian</Label>
                <Input
                  type="number"
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(e.target.value)}
                  placeholder="Contoh: 10"
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Harga Beli per Unit (Rp)</Label>
                <Input
                  type="number"
                  value={purchaseBuyPrice}
                  onChange={(e) => setPurchaseBuyPrice(e.target.value)}
                  placeholder="Contoh: 50000"
                  min={1}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                value={purchaseNote}
                onChange={(e) => setPurchaseNote(e.target.value)}
                placeholder="cth: Dari supplier B, batch Mei 2025"
                rows={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Harga modal (MAC) akan direcalculate secara otomatis.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddPurchase} disabled={isPending}>
              {isPending ? "Menyimpan..." : "Konfirmasi Pembelian"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Purchase */}
      {editingPurchase && (
        <EditPurchaseDialog
          purchase={editingPurchase}
          accessoryId={accessory.id}
          open={!!editingPurchase}
          onOpenChange={(open) => {
            if (!open) setEditingPurchase(null);
          }}
        />
      )}

      {/* Fullscreen Image Dialog */}
      <Dialog
        open={!!fullscreenImage}
        onOpenChange={(open) => !open && setFullscreenImage(null)}
      >
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
    </div>
  );
}
