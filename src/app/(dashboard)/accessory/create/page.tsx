import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AccessoryCreateForm } from "./form";

export default function AccessoryCreatePage() {
  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Tambah Aksesoris</h1>
      </header>

      <div className="p-4 md:p-6 max-w-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Tambah Aksesoris Baru</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Isi data aksesoris yang ingin ditambahkan ke inventaris.
          </p>
        </div>
        <AccessoryCreateForm />
      </div>
    </>
  );
}
