"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createUnit } from "@/actions/unit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useGlobalScanner } from "@/hooks/useGlobalScanner";
import { CameraScanner } from "@/components/ui/camera-scanner";

export function UnitCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);

  const [imei, setImei] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 1. Scanner Barcode Fisik (Global Listener)
  useGlobalScanner((scannedCode) => {
    setImei(scannedCode);
    toast.success("IMEI berhasil di-scan!");
  });

  function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    const note = (formData.get("note") as string) || undefined;
    const buyPriceStr = formData.get("buyPrice") as string;
    const buyAtStr = formData.get("buyAt") as string;

    if (!name) {
      setError("Nama unit wajib diisi.");
      return;
    }

    const buyPrice = buyPriceStr ? parseInt(buyPriceStr, 10) : undefined;
    const buyAt = buyAtStr ? new Date(buyAtStr) : undefined;

    setError(null);
    startTransition(async () => {
      const result = await createUnit({
        name,
        imei: imei || undefined,
        note,
        buyPrice,
        buyAt,
        images,
      });
      if (result.success) {
        toast.success("Unit berhasil ditambahkan.");
        router.push("/unit");
      } else {
        setError(result.error ?? "Gagal menambahkan unit.");
      }
    });
  }

  return (
    <>
      <Card>
        <form action={handleSubmit}>
          <CardContent className="space-y-4 pt-6 my-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label>Foto Unit</Label>
              <ImageUploader images={images} setImages={setImages} maxUploads={5} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Unit *</Label>
              <Input
                id="name"
                name="name"
                placeholder="cth: iPhone 12 Pro Max"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imei">IMEI</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="imei"
                  name="imei"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  placeholder="Nomor IMEI (opsional)"
                  className="flex-1"
                />
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
                <Label htmlFor="buyPrice">Harga Beli (Rp)</Label>
                <Input
                  id="buyPrice"
                  name="buyPrice"
                  type="number"
                  placeholder="0"
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyAt">Tanggal Beli</Label>
                <Input id="buyAt" name="buyAt" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Catatan</Label>
              <Textarea
                id="note"
                name="note"
                placeholder="Catatan tambahan (opsional)"
                rows={3}
              />
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
      
      <CameraScanner 
        open={isScannerOpen} 
        onOpenChange={setIsScannerOpen} 
        onScan={(code) => {
          setImei(code);
          toast.success("IMEI berhasil di-scan dari kamera!");
        }} 
      />
    </>
  );
}
