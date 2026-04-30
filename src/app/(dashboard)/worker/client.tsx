"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkerData } from "@/actions/worker";
import { toggleWorkerActive, deleteWorker } from "@/actions/worker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  workers: WorkerData[];
}

export function WorkerListClient({ workers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggleActive(id: number, currentActive: boolean) {
    startTransition(async () => {
      const result = await toggleWorkerActive(id);
      if (result.success) {
        toast.success(currentActive ? "Worker dinonaktifkan." : "Worker diaktifkan kembali.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal mengubah status worker.");
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteWorker(id);
      if (result.success) {
        toast.success("Worker berhasil dihapus.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menghapus worker.");
      }
    });
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Telepon</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead>Terdaftar</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workers.map((worker) => (
            <TableRow key={worker.id}>
              <TableCell className="font-medium">#{worker.id}</TableCell>
              <TableCell className="font-semibold">{worker.name}</TableCell>
              <TableCell>{worker.phone}</TableCell>
              <TableCell className="text-center">
                {worker.isActive ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                    Aktif
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Nonaktif
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(worker.createdAt))}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/worker/${worker.id}`}>
                      <Eye className="mr-1 h-3 w-3" />
                      Detail
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(worker.id, worker.isActive)}
                    disabled={isPending}
                    title={worker.isActive ? "Nonaktifkan" : "Aktifkan"}
                  >
                    <Power className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Worker?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Worker &quot;{worker.name}&quot; akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(worker.id)} disabled={isPending}>
                          {isPending ? "Menghapus..." : "Hapus"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
