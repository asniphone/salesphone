"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createWorker } from "@/actions/worker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, HardHat } from "lucide-react";

export function WorkerCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;

    if (!name.trim()) {
      setError("Nama worker wajib diisi.");
      return;
    }
    if (!phone.trim()) {
      setError("Nomor telepon wajib diisi.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createWorker({ name, phone });

      if (result.success) {
        toast.success("Worker berhasil ditambahkan!");
        router.push("/worker");
      } else {
        setError(result.error ?? "Terjadi kesalahan.");
      }
    });
  }

  return (
    <Card>
      <form action={handleSubmit}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="w-5 h-5 text-muted-foreground" />
            Detail Worker
          </CardTitle>
          <CardDescription>
            Isi data identitas pekerja/sales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 my-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input id="name" name="name" placeholder="cth: Andi Prasetyo" disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Nomor Telepon</Label>
            <Input id="phone" name="phone" placeholder="08xx" disabled={isPending} />
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 py-4 flex justify-end">
          <Button type="button" variant="outline" className="mr-2" onClick={() => router.back()} disabled={isPending}>
            Batal
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Menyimpan..." : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan Worker
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
