import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getBlastMessages } from "@/actions/message";
import { MessageListClient } from "./client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

interface MessageListPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
}

export default async function MessageListPage({ searchParams }: MessageListPageProps) {
  const params = await searchParams;

  const pageRaw = parseInt(params.page || "1", 10);
  const page = isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  
  const pageSizeRaw = parseInt(params.pageSize || "10", 10);
  const pageSize = [5, 10, 25, 50].includes(pageSizeRaw)
    ? pageSizeRaw
    : 10;

  const result = await getBlastMessages({ page, pageSize });

  const data = result.data ?? {
    messages: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Pesan / Riwayat</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Riwayat Pesan Broadcast</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Daftar seluruh pesan massal (marketing/announcement) yang telah dikirim.
            </p>
          </div>
          <Button asChild>
            <Link href="/message/create">
              <Plus className="mr-2 h-4 w-4" />
              Kirim Pesan Baru
            </Link>
          </Button>
        </div>

        {data.total === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Belum ada riwayat pesan yang dikirim.
            </p>
          </div>
        ) : (
          <MessageListClient data={data} />
        )}
      </div>
    </>
  );
}
