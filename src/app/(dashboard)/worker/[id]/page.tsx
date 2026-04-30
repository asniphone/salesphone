import { notFound } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getWorkerById } from "@/actions/worker";
import { WorkerDetailClient } from "./client";

interface WorkerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkerDetailPage({ params }: WorkerDetailPageProps) {
  const resolvedParams = await params;
  const idRaw = parseInt(resolvedParams.id, 10);

  if (isNaN(idRaw)) {
    notFound();
  }

  const result = await getWorkerById(idRaw);
  const worker = result.data;

  if (!worker) {
    notFound();
  }

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Worker / Detail</h1>
      </header>

      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Detail Worker: {worker.name}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Lihat profil, edit informasi, dan pantau riwayat penjualan unit oleh worker ini.
          </p>
        </div>

        <WorkerDetailClient worker={worker} />
      </div>
    </>
  );
}
