import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAccessoriesForSale } from "@/actions/accessory";
import { getCustomers } from "@/actions/customer";
import { getActiveWorkers } from "@/actions/worker";
import { AccessorySellForm } from "./form";

export default async function AccessorySellPage() {
  const [accessoriesResult, customersResult, workersResult] = await Promise.all([
    getAccessoriesForSale(),
    getCustomers(),
    getActiveWorkers(),
  ]);

  const accessories = accessoriesResult.data ?? [];
  const customers = customersResult.data ?? [];
  const workers = workersResult.data ?? [];

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <Button asChild variant="ghost" size="sm" className="gap-1 text-sm font-normal">
          <Link href="/accessory">
            <ChevronLeft className="h-4 w-4" />
            Aksesoris
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Jual Aksesoris</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Jual Aksesoris</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Pilih aksesoris, customer, worker, lalu proses penjualan.
          </p>
        </div>

        <AccessorySellForm
          accessories={accessories}
          customers={customers}
          workers={workers}
        />
      </div>
    </>
  );
}
