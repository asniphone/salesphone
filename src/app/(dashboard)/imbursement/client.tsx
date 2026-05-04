"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createImbursement,
  deleteImbursement,
  getImbursementDetail,
  updateImbursement,
  type ImbursementDetail,
  type ImbursementListItem,
  type ImbursementMutationInput,
  type WorkerImbursementOption,
} from "@/actions/imbursement";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Banknote,
  CircleDollarSign,
  Clock,
  Eye,
  HandCoins,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface ImbursementSummary {
  writtenFee: number;
  reimbursed: number;
  remaining: number;
}

interface ImbursementListClientProps {
  imbursements: ImbursementListItem[];
  workers: WorkerImbursementOption[];
  summary: ImbursementSummary;
  userAccess: {
    accessImbursementCreate: boolean;
    accessImbursementUpdate: boolean;
    accessImbursementDelete: boolean;
  };
}

interface FormState {
  workerId: string;
  amount: string;
  note: string;
}

const DEFAULT_FORM: FormState = {
  workerId: "",
  amount: "",
  note: "",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function mapToFormValue(imbursement: ImbursementListItem): FormState {
  return {
    workerId: String(imbursement.workerId),
    amount: String(imbursement.amount),
    note: imbursement.note,
  };
}

function getWorkerRemainingText(worker?: WorkerImbursementOption): string {
  if (!worker) return "Pilih worker untuk melihat sisa fee.";
  return `Sisa belum cair: ${formatCurrency(worker.remaining)} dari total tertulis ${formatCurrency(worker.writtenFee)}.`;
}

export function ImbursementListClient({
  imbursements,
  workers,
  summary,
  userAccess,
}: ImbursementListClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingImbursement, setEditingImbursement] =
    useState<ImbursementListItem | null>(null);
  const [viewingImbursementId, setViewingImbursementId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<ImbursementDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  async function handleOpenDetail(id: number) {
    setViewingImbursementId(id);
    setIsLoadingDetail(true);

    const result = await getImbursementDetail(id);

    if (result.success) {
      setDetailData(result.data ?? null);
    } else {
      toast.error(result.error ?? "Gagal mengambil detail pencairan fee.");
      setViewingImbursementId(null);
    }

    setIsLoadingDetail(false);
  }

  function submitCreate(value: ImbursementMutationInput) {
    startTransition(async () => {
      const result = await createImbursement(value);

      if (result.success) {
        toast.success("Pencairan fee berhasil ditambahkan.");
        setIsCreateOpen(false);
        router.refresh();
        return;
      }

      toast.error(result.error ?? "Gagal menambahkan pencairan fee.");
    });
  }

  function submitUpdate(id: number, value: ImbursementMutationInput) {
    startTransition(async () => {
      const result = await updateImbursement(id, value);

      if (result.success) {
        toast.success("Pencairan fee berhasil diperbarui.");
        setEditingImbursement(null);
        router.refresh();
        return;
      }

      toast.error(result.error ?? "Gagal memperbarui pencairan fee.");
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteImbursement(id);

      if (result.success) {
        toast.success("Pencairan fee berhasil dihapus.");
        router.refresh();
        return;
      }

      toast.error(result.error ?? "Gagal menghapus pencairan fee.");
    });
  }

  const summaryCards = [
    {
      title: "Fee Tertulis",
      value: formatCurrency(summary.writtenFee),
      description: "Akumulasi fee dari penjualan unit dan aksesoris.",
      icon: CircleDollarSign,
      className:
        "border-sky-200/70 bg-sky-50/70 dark:border-sky-900/40 dark:bg-sky-950/20",
      valueClassName: "text-sky-700 dark:text-sky-300",
    },
    {
      title: "Sudah Dicairkan",
      value: formatCurrency(summary.reimbursed),
      description: "Total pencairan yang tercatat aktif.",
      icon: Banknote,
      className:
        "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20",
      valueClassName: "text-emerald-700 dark:text-emerald-300",
    },
    {
      title: "Belum Dicairkan",
      value: formatCurrency(summary.remaining),
      description: "Sisa fee yang masih perlu dicairkan.",
      icon: Clock,
      className:
        summary.remaining >= 0
          ? "border-amber-200/70 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20"
          : "border-red-200/70 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/20",
      valueClassName:
        summary.remaining >= 0
          ? "text-amber-700 dark:text-amber-300"
          : "text-red-700 dark:text-red-300",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((item) => (
          <Card key={item.title} className={item.className}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  {item.description}
                </CardDescription>
              </div>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-semibold tracking-tight", item.valueClassName)}>
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-end">
        <Dialog
          open={viewingImbursementId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setViewingImbursementId(null);
              setDetailData(null);
              setIsLoadingDetail(false);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detail Pencairan Fee</DialogTitle>
              <DialogDescription>
                Detail transaksi pencairan dan riwayat perubahannya.
              </DialogDescription>
            </DialogHeader>
            <ImbursementDetailContent
              imbursement={detailData}
              isLoading={isLoadingDetail}
            />
          </DialogContent>
        </Dialog>

        {userAccess.accessImbursementCreate && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Pencairan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tambah Pencairan Fee</DialogTitle>
                <DialogDescription>
                  Catat nominal fee worker yang sudah dicairkan.
                </DialogDescription>
              </DialogHeader>
              <ImbursementForm
                workers={workers}
                isPending={isPending}
                onCancel={() => setIsCreateOpen(false)}
                onSubmit={submitCreate}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {imbursements.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <HandCoins className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            Belum ada pencairan fee yang sesuai dengan filter.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead className="text-center">Log</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imbursements.map((imbursement) => (
                <TableRow key={imbursement.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{imbursement.worker.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {imbursement.worker.phone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[360px]">
                    <p className="line-clamp-2 font-medium leading-tight">
                      {imbursement.note}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Diinput {formatDate(imbursement.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(imbursement.createdAt)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(imbursement.amount)}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {imbursement._count.imbursementLogs}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          void handleOpenDetail(imbursement.id);
                        }}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Detail
                      </Button>

                      {userAccess.accessImbursementUpdate && (
                        <Dialog
                          open={editingImbursement?.id === imbursement.id}
                          onOpenChange={(open) =>
                            setEditingImbursement(open ? imbursement : null)
                          }
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingImbursement(imbursement)}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Pencairan Fee</DialogTitle>
                              <DialogDescription>
                                Perbarui worker, nominal, atau catatan pencairan.
                              </DialogDescription>
                            </DialogHeader>
                            <ImbursementForm
                              initialValue={mapToFormValue(imbursement)}
                              workers={workers}
                              existingAmount={imbursement.amount}
                              isPending={isPending}
                              onCancel={() => setEditingImbursement(null)}
                              onSubmit={(value) => submitUpdate(imbursement.id, value)}
                            />
                          </DialogContent>
                        </Dialog>
                      )}

                      {userAccess.accessImbursementDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Hapus
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus pencairan fee?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Data pencairan akan disembunyikan dari daftar aktif dan log
                                penghapusan tetap dicatat.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(imbursement.id)}>
                                {isPending ? "Menghapus..." : "Hapus"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

interface ImbursementFormProps {
  workers: WorkerImbursementOption[];
  initialValue?: FormState;
  existingAmount?: number;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (value: ImbursementMutationInput) => void;
}

function ImbursementForm({
  workers,
  initialValue = DEFAULT_FORM,
  existingAmount = 0,
  isPending,
  onCancel,
  onSubmit,
}: ImbursementFormProps) {
  const [form, setForm] = useState<FormState>(initialValue);
  const selectedWorker = workers.find((worker) => String(worker.id) === form.workerId);
  const remainingForSelected =
    selectedWorker && initialValue.workerId === form.workerId
      ? selectedWorker.remaining + existingAmount
      : selectedWorker?.remaining;

  function handleSubmit() {
    const amount = Number.parseInt(form.amount, 10);

    if (!form.workerId) {
      toast.error("Worker wajib dipilih.");
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Nominal pencairan harus lebih besar dari 0.");
      return;
    }

    if (!form.note.trim()) {
      toast.error("Catatan wajib diisi.");
      return;
    }

    onSubmit({
      workerId: Number.parseInt(form.workerId, 10),
      amount,
      note: form.note.trim(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Worker *</Label>
        <Select
          value={form.workerId}
          onValueChange={(value) => setForm((prev) => ({ ...prev, workerId: value }))}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih worker" />
          </SelectTrigger>
          <SelectContent>
            {workers.map((worker) => (
              <SelectItem key={worker.id} value={String(worker.id)}>
                {worker.name} - sisa {formatCurrency(worker.remaining)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {selectedWorker
            ? `Sisa yang bisa dicairkan: ${formatCurrency(remainingForSelected ?? 0)}.`
            : getWorkerRemainingText(selectedWorker)}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Nominal Pencairan (Rp) *</Label>
        <Input
          type="number"
          min={1}
          value={form.amount}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, amount: event.target.value }))
          }
          placeholder="0"
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label>Catatan *</Label>
        <Textarea
          value={form.note}
          onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
          placeholder="Contoh: Pencairan fee minggu pertama"
          rows={4}
          disabled={isPending}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Batal
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </div>
  );
}

interface ImbursementDetailContentProps {
  imbursement: ImbursementDetail | null;
  isLoading: boolean;
}

function ImbursementDetailContent({
  imbursement,
  isLoading,
}: ImbursementDetailContentProps) {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Memuat detail pencairan fee...
      </div>
    );
  }

  if (!imbursement) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Detail pencairan fee tidak tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Worker</p>
          <p className="font-medium">{imbursement.worker.name}</p>
          <p className="text-sm text-muted-foreground">{imbursement.worker.phone}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Nominal</p>
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(imbursement.amount)}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Tanggal Input</p>
          <p className="font-medium">{formatDateTime(imbursement.createdAt)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Terakhir Diubah</p>
          <p className="font-medium">{formatDateTime(imbursement.updatedAt)}</p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <p className="mb-2 text-xs text-muted-foreground">Catatan</p>
        <p className="whitespace-pre-wrap text-sm">{imbursement.note}</p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Perubahan</TableHead>
              <TableHead>Oleh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imbursement.imbursementLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateTime(log.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{log.logType}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="space-y-1">
                    {log.amountBefore !== log.amountAfter && (
                      <p>
                        Nominal: {log.amountBefore == null ? "-" : formatCurrency(log.amountBefore)} {"->"}{" "}
                        {log.amountAfter == null ? "-" : formatCurrency(log.amountAfter)}
                      </p>
                    )}
                    {log.workerIdBefore !== log.workerIdAfter && (
                      <p>
                        Worker: {log.workerBefore?.name ?? "-"} {"->"} {log.workerAfter?.name ?? "-"}
                      </p>
                    )}
                    {log.noteBefore !== log.noteAfter && (
                      <p>Catatan diperbarui</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {log.logActionNote ?? "-"}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{log.user.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
