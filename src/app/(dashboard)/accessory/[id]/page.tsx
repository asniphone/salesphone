import { notFound } from "next/navigation";
import { getAccessoryById } from "@/actions/accessory";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AccessoryDetailClient } from "./client";

interface AccessoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccessoryDetailPage({ params }: AccessoryDetailPageProps) {
  const { id } = await params;
  const accessoryId = parseInt(id, 10);

  if (isNaN(accessoryId)) {
    notFound();
  }

  const result = await getAccessoryById(accessoryId);

  if (!result.success || !result.data) {
    notFound();
  }

  const accessory = result.data;

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
        <h1 className="text-sm font-semibold truncate">{accessory.name}</h1>
      </header>

      <div className="p-4 md:p-6 max-w-3xl">
        <AccessoryDetailClient accessory={accessory} />
      </div>
    </>
  );
}
