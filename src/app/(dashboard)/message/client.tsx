"use client";

import type { PaginatedBlastMessages } from "@/actions/message";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface Props {
  data: PaginatedBlastMessages;
}

export function MessageListClient({ data }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", newPage.toString());
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function changePageSize(size: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", size);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const start = (data.page - 1) * data.pageSize + 1;
  const end = Math.min(data.page * data.pageSize, data.total);

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="max-w-[300px]">Isi Pesan</TableHead>
              <TableHead className="text-center">Penerima</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Pengirim</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.messages.map((msg) => (
              <TableRow key={msg.id}>
                <TableCell className="font-medium">#{msg.id}</TableCell>
                <TableCell>
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(msg.createdAt))}
                </TableCell>
                <TableCell className="max-w-[300px] truncate" title={msg.content}>
                  {msg.content}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{msg._count.customers} Customer</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {msg.status === "SUCCESS" && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Berhasil
                    </Badge>
                  )}
                  {msg.status === "FAILED" && (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" /> Gagal
                    </Badge>
                  )}
                  {msg.status === "PENDING" && (
                    <Badge variant="outline">
                      <Clock className="mr-1 h-3 w-3" /> Diproses
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {msg.user.email}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Rows per page:</p>
          <Select
            value={data.pageSize.toString()}
            onValueChange={changePageSize}
          >
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 25, 50].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {start} - {end} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(data.page - 1)}
              disabled={data.page <= 1}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(data.page + 1)}
              disabled={data.page >= data.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
