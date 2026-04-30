"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createAccessory } from "@/actions/accessory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ui/image-uploader";

export function AccessoryCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);

  function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    const sellPriceStr = formData.get("sellPrice") as string;
    const initialBuyPriceStr = formData.get("initialBuyPrice") as string;
    const initialStockStr = formData.get("initialStock") as string;
    const initialNote = (formData.get("initialNote") as string) || undefined;

    if (!name.trim()) {
      setError("Nama aksesoris wajib diisi.");
      return;
    }
    if (!sellPriceStr || parseInt(sellPriceStr, 10) <= 0) {
      setError("Harga jual wajib diisi dan lebih dari 0.");
      return;
    }

    const sellPrice = parseInt(sellPriceStr, 10);
    const initialBuyPrice = initialBuyPriceStr ? parseInt(initialBuyPriceStr, 10) : 0;
    const initialStock = initialStockStr ? parseInt(initialStockStr, 10) : 0;

    setError(null);
    startTransition(async () => {
      const result = await createAccessory({
        name,
        images,
        sellPrice,
        initialBuyPrice,
        initialStock,
        initialNote,
      });
      if (result.success) {
        toast.success("Aksesoris berhasil ditambahkan.");
        router.push("/accessory");
      } else {
        setError(result.error ?? "Gagal menambahkan aksesoris.");
      }
    });
  }

  return (
    <Card>
      <form action={handleSubmit}>
        <CardContent className="space-y-6 pt-6 my-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Info Dasar */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Foto Aksesoris</Label>
              <ImageUploader images={images} setImages={setImages} maxUploads={5} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Aksesoris *</Label>
              <Input
                id="name"
                name="name"
                placeholder="cth: Charger Samsung 25W"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellPrice">Harga Jual (Rp) *</Label>
              <Input
                id="sellPrice"
                name="sellPrice"
                type="number"
                placeholder="0"
                min={1}
                required
              />
            </div>
          </div>

          <Separator />

          {/* Stok Awal */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Stok Awal (Opsional)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Jika diisi, akan otomatis tercatat sebagai pembelian pertama.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initialStock">Jumlah Stok</Label>
                <Input
                  id="initialStock"
                  name="initialStock"
                  type="number"
                  placeholder="0"
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialBuyPrice">Harga Modal per Unit (Rp)</Label>
                <Input
                  id="initialBuyPrice"
                  name="initialBuyPrice"
                  type="number"
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="initialNote">Catatan Pembelian Awal</Label>
              <Textarea
                id="initialNote"
                name="initialNote"
                placeholder="cth: Stok dari supplier A, batch pertama"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
