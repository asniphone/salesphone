"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sendBulkMarketingWhatsApp } from "@/actions/message";
import { toast } from "sonner";
import { Send, Users, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

const TEMPLATES = [
  {
    name: "Promo Diskon",
    content: "Halo Kak,\n\nKhusus minggu ini ada diskon spesial untuk pembelian unit dan aksesoris di toko kami. Yuk mampir sebelum kehabisan!",
  },
  {
    name: "Restock Barang",
    content: "Halo Kak,\n\nBerbagai unit terbaru dan aksesoris keren baru saja restock di toko kami loh. Cek selengkapnya hari ini!",
  },
  {
    name: "Pengumuman Toko",
    content: "Pengumuman: \n\nMohon perhatiannya, toko kami akan libur besok dan buka kembali lusa seperti biasa. Terima kasih atas pengertiannya.",
  },
];

interface Props {
  customers: Customer[];
}

export function MessageCreateForm({ customers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);

  const isAllSelected = selectedIds.length === customers.length && customers.length > 0;

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.id));
    }
  }

  function toggleCustomer(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleUseTemplate(content: string) {
    setMessage(content);
  }

  function handleSubmit() {
    if (selectedIds.length === 0) {
      toast.error("Pilih setidaknya satu customer!");
      return;
    }
    if (!message.trim()) {
      toast.error("Pesan tidak boleh kosong!");
      return;
    }

    startTransition(async () => {
      const result = await sendBulkMarketingWhatsApp({
        customerIds: selectedIds,
        message: message.trim(),
      });

      if (result.success) {
        toast.success(`Berhasil! Terkirim: ${result.data?.successCount}, Gagal: ${result.data?.failureCount}`);
        router.push("/message");
      } else {
        toast.error(result.error ?? "Gagal mengirim pesan.");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Kolom Form Kiri */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Rancang Pesan</CardTitle>
          <CardDescription>Pesan akan dikirim ke customer yang dipilih via Fonnte API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>1. Pilih Target Customer</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between font-normal h-auto py-2.5 min-h-11"
                >
                  <div className="flex flex-wrap items-center gap-1.5 truncate">
                    <Users className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
                    {selectedIds.length === 0 ? (
                      <span className="text-muted-foreground mr-2">Pilih customer...</span>
                    ) : (
                      <>
                        <Badge variant="secondary" className="mr-1">
                          {selectedIds.length} dipilih
                        </Badge>
                        {isAllSelected && <span className="text-muted-foreground text-sm ml-1">(Semua Customer)</span>}
                      </>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari nama atau telepon customer..." />
                  <CommandList>
                    <CommandEmpty>Customer tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      {/* Opsi Select All */}
                      <CommandItem onSelect={toggleSelectAll} className="font-medium cursor-pointer">
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isAllSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Check className={cn("h-4 w-4")} />
                        </div>
                        Pilih Semua Customer ({customers.length})
                      </CommandItem>
                    </CommandGroup>
                    <CommandGroup heading="Daftar Customer">
                      {customers.map((customer) => {
                        const isSelected = selectedIds.includes(customer.id);
                        return (
                          <CommandItem
                            key={customer.id}
                            onSelect={() => toggleCustomer(customer.id)}
                            className="cursor-pointer"
                          >
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible"
                              )}
                            >
                              <Check className={cn("h-4 w-4")} />
                            </div>
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              <span className="text-xs text-muted-foreground">{customer.phone}</span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Hanya menampilkan customer yang memiliki nomor telepon valid (min. 10 digit).
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>2. Isi Pesan</Label>
              <span className="text-xs text-muted-foreground font-mono">
                {message.length} / 2000 chars
              </span>
            </div>
            {/* Tanda Peringatan Untuk Variabel */}
            {/* <div className="bg-muted px-3 py-2 rounded-md text-xs text-muted-foreground">
              Tip: Jika terdapat variabel seperti <code className="bg-background px-1 rounded text-primary">{`{name}`}</code>, pastikan untuk menghapus atau menggantinya secara manual. (Saat ini Blast Message mengirim isi pesan apa adanya tanpa replace otomatis).
            </div> */}
            <Textarea
              placeholder="Tulis pesan Anda di sini..."
              className="min-h-[260px] resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 py-4 flex items-center justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedIds.length === 0 || !message.trim()}
          >
            {isPending ? (
              "Mengirim..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Kirim Pesan
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Kolom Kanan: Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template Cepat</CardTitle>
          <CardDescription>Gunakan template ini untuk mempercepat penulisan pesan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TEMPLATES.map((tmpl, idx) => (
            <div key={idx} className="border rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{tmpl.name}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUseTemplate(tmpl.content)}
                >
                  Gunakan
                </Button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 bg-muted p-2 rounded truncate whitespace-pre-line overflow-hidden max-h-16">
                {tmpl.content}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
