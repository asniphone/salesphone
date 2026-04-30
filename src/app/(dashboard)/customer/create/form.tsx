"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomer } from "@/actions/customer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";

export function CustomerCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    const phone = (formData.get("phone") as string) || undefined;

    if (!name) {
      setError("Nama customer wajib diisi.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createCustomer({ name, phone });
      if (result.success) {
        toast.success("Customer berhasil ditambahkan.");
        router.push("/customer");
      } else {
        setError(result.error ?? "Gagal menambahkan customer.");
      }
    });
  }

  return (
    <Card>
      <form action={handleSubmit}>
        <CardContent className="space-y-4 pt-6 my-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nama *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Nama pelanggan"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Nomor Telepon</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="08xxxxxxxxxx (opsional)"
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
  );
}
