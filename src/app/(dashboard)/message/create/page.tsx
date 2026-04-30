import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getCustomers } from "@/actions/customer";
import { MessageCreateForm } from "./form";

export default async function MessageCreatePage() {
  const result = await getCustomers();
  const customers = result.data ?? [];

  // Hanya ambil customer yang punya nomor valid
  const validCustomers = customers.filter(
    (c) => c.phone && c.phone.trim().length >= 10
  );

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Pesan / Kirim Baru</h1>
      </header>

      <div className="p-4 md:p-6 max-w-5xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Kirim Pesan Broadcast</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Kirim pesan promosi, pengumuman, atau penawaran ke target customer Anda melalui WhatsApp.
          </p>
        </div>

        <MessageCreateForm customers={validCustomers} />
      </div>
    </>
  );
}
