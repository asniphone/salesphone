"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { upsertCommonInformation } from "@/actions/common-information";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUploader } from "@/components/ui/image-uploader";

interface CommonInformationFormValue {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeLogo: string | null;
  footNoteReceipt: string | null;
  unitFeePercentage: number;
}

interface Props {
  initialData: CommonInformationFormValue;
}

export function CommonInformationClient({ initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [logoImages, setLogoImages] = useState<string[]>(
    initialData.storeLogo ? [initialData.storeLogo] : [],
  );

  function handleSave(formData: FormData) {
    const storeName = (formData.get("storeName") as string) ?? "";
    const storeAddress = (formData.get("storeAddress") as string) ?? "";
    const storePhone = (formData.get("storePhone") as string) ?? "";
    const footNoteReceipt = (formData.get("footNoteReceipt") as string) ?? "";
    const unitFeePercentageValue = (formData.get("unitFeePercentage") as string) ?? "";
    const storeLogo = logoImages[0] ?? null;

    const normalizedStoreName = storeName.trim();
    const normalizedStoreAddress = storeAddress.trim();
    const normalizedStorePhone = storePhone.trim();
    const normalizedFootNote = footNoteReceipt.trim();
    const normalizedInitialFootNote = initialData.footNoteReceipt?.trim() ?? "";
    const normalizedUnitFeePercentage = Number.parseInt(unitFeePercentageValue, 10);

    if (Number.isNaN(normalizedUnitFeePercentage)) {
      setError("Persentase fee unit wajib diisi.");
      return;
    }

    if (
      normalizedStoreName === initialData.storeName.trim() &&
      normalizedStoreAddress === initialData.storeAddress.trim() &&
      normalizedStorePhone === initialData.storePhone.trim() &&
      normalizedFootNote === normalizedInitialFootNote &&
      normalizedUnitFeePercentage === initialData.unitFeePercentage &&
      storeLogo === initialData.storeLogo
    ) {
      toast.info("Tidak ada perubahan.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await upsertCommonInformation({
        storeName: normalizedStoreName,
        storeAddress: normalizedStoreAddress,
        storePhone: normalizedStorePhone,
        storeLogo,
        footNoteReceipt: normalizedFootNote || null,
        unitFeePercentage: normalizedUnitFeePercentage,
      });

      if (result.success) {
        toast.success("Informasi toko berhasil disimpan.");
        router.refresh();
      } else {
        setError(result.error ?? "Gagal menyimpan informasi toko.");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <form action={handleSave}>
          <CardHeader>
            <CardTitle>Profil Toko</CardTitle>
            <CardDescription>
              Data ini akan dipakai pada kebutuhan dokumen transaksi seperti receipt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 my-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="storeName">Nama Toko *</Label>
              <Input
                id="storeName"
                name="storeName"
                placeholder="Contoh: Toko ABC"
                defaultValue={initialData.storeName}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storePhone">Nomor Telepon Toko *</Label>
              <Input
                id="storePhone"
                name="storePhone"
                placeholder="08xxxxxxxxxx"
                defaultValue={initialData.storePhone}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeAddress">Alamat Toko *</Label>
              <Textarea
                id="storeAddress"
                name="storeAddress"
                placeholder="Alamat lengkap toko"
                defaultValue={initialData.storeAddress}
                rows={3}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footNoteReceipt">Catatan Receipt</Label>
              <Textarea
                id="footNoteReceipt"
                name="footNoteReceipt"
                placeholder="Contoh: Barang yang sudah dibeli tidak dapat ditukar/dikembalikan."
                defaultValue={initialData.footNoteReceipt ?? ""}
                rows={4}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitFeePercentage">Persentase Fee Unit (%) *</Label>
              <Input
                id="unitFeePercentage"
                name="unitFeePercentage"
                type="number"
                min={0}
                max={100}
                placeholder="30"
                defaultValue={initialData.unitFeePercentage}
                disabled={isPending}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-muted/50 py-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan Informasi"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo Toko</CardTitle>
          <CardDescription>
            Upload 1 gambar logo yang akan dipakai untuk kebutuhan branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ImageUploader
            images={logoImages}
            setImages={(images) => setLogoImages(images.slice(0, 1))}
            maxUploads={1}
          />
        </CardContent>
      </Card>
    </div>
  );
}
