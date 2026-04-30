import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { WorkerCreateForm } from "./form";

export default function WorkerCreatePage() {
  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Worker / Tambah</h1>
      </header>

      <div className="p-4 md:p-6 max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Tambah Worker Baru</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Daftarkan pekerja/sales yang membantu penjualan unit.
          </p>
        </div>

        <WorkerCreateForm />
      </div>
    </>
  );
}
