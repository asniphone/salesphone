"use client";

import { useState, useTransition } from "react";
import type { CashflowType } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  FileText,
  ImageIcon,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  createCashflow,
  deleteCashflow,
  getCashflowDetail,
  updateCashflow,
  type CashflowDetail,
  type CashflowListItem,
} from "@/actions/cashflow";
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
import { ImageUploader } from "@/components/ui/image-uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface CashflowSummary {
  income: number;
  expense: number;
  net: number;
}

interface CashflowListClientProps {
  cashflows: CashflowListItem[];
  summary: CashflowSummary;
}

interface CashflowFormState {
  type: CashflowType;
  amount: string;
  note: string;
  transactionDate: string;
  imageAttachments: string[];
}

const DEFAULT_FORM: CashflowFormState = {
  type: "EXPENSE",
  amount: "",
  note: "",
  transactionDate: new Date().toISOString().slice(0, 10),
  imageAttachments: [],
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

function getTypeConfig(type: CashflowType): {
  label: string;
  badgeClassName: string;
  amountClassName: string;
  icon: typeof ArrowUpRight;
} {
  if (type === "INCOME") {
    return {
      label: "Pemasukan",
      badgeClassName:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
      amountClassName: "text-emerald-600 dark:text-emerald-400",
      icon: ArrowUpRight,
    };
  }

  return {
    label: "Pengeluaran",
    badgeClassName:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
    amountClassName: "text-red-600 dark:text-red-400",
    icon: ArrowDownRight,
  };
}

function mapCashflowToFormValue(cashflow: CashflowListItem): CashflowFormState {
  return {
    type: cashflow.type,
    amount: String(cashflow.amount),
    note: cashflow.note,
    transactionDate: new Date(cashflow.transactionDate).toISOString().slice(0, 10),
    imageAttachments: cashflow.imageAttachments,
  };
}

export function CashflowListClient({
  cashflows,
  summary,
}: CashflowListClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCashflow, setEditingCashflow] = useState<CashflowListItem | null>(null);
  const [viewingCashflowId, setViewingCashflowId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<CashflowDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  async function handleOpenDetail(id: number) {
    setViewingCashflowId(id);
    setIsLoadingDetail(true);

    const result = await getCashflowDetail(id);

    if (result.success) {
      setDetailData(result.data ?? null);
    } else {
      toast.error(result.error ?? "Gagal mengambil detail cashflow.");
      setViewingCashflowId(null);
    }

    setIsLoadingDetail(false);
  }

  const summaryCards = [
    {
      title: "Total Pemasukan",
      value: formatCurrency(summary.income),
      description: "Akumulasi transaksi masuk dari hasil filter aktif.",
      icon: ArrowUpRight,
      className:
        "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20",
      valueClassName: "text-emerald-700 dark:text-emerald-300",
    },
    {
      title: "Total Pengeluaran",
      value: formatCurrency(summary.expense),
      description: "Biaya pengeluaran operasional",
      icon: ArrowDownRight,
      className:
        "border-red-200/70 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/20",
      valueClassName: "text-red-700 dark:text-red-300",
    },
    {
      title: "Saldo Bersih",
      value: formatCurrency(summary.net),
      description: "Selisih pemasukan dan pengeluaran pada hasil saat ini.",
      icon: Wallet,
      className: "border-border bg-card",
      valueClassName:
        summary.net >= 0
          ? "text-emerald-700 dark:text-emerald-300"
          : "text-red-700 dark:text-red-300",
    },
  ];

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteCashflow(id);

      if (result.success) {
        toast.success("Transaksi cashflow berhasil dihapus.");
        router.refresh();
        return;
      }

      toast.error(result.error ?? "Gagal menghapus transaksi cashflow.");
    });
  }

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
          open={viewingCashflowId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setViewingCashflowId(null);
              setDetailData(null);
              setIsLoadingDetail(false);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detail Cashflow</DialogTitle>
              <DialogDescription>
                Menampilkan detail transaksi dan riwayat perubahan secara read-only.
              </DialogDescription>
            </DialogHeader>
            <CashflowDetailContent
              cashflow={detailData}
              isLoading={isLoadingDetail}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Cashflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Cashflow</DialogTitle>
              <DialogDescription>
                Catat pemasukan atau pengeluaran baru tanpa pindah halaman.
              </DialogDescription>
            </DialogHeader>
            <CashflowForm
              mode="create"
              isPending={isPending}
              onCancel={() => setIsCreateOpen(false)}
              onSubmit={(value) => {
                startTransition(async () => {
                  const result = await createCashflow(value);

                  if (result.success) {
                    toast.success("Transaksi cashflow berhasil ditambahkan.");
                    setIsCreateOpen(false);
                    router.refresh();
                    return;
                  }

                  toast.error(result.error ?? "Gagal menambahkan cashflow.");
                });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {cashflows.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <ReceiptText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            Belum ada transaksi cashflow yang sesuai dengan filter.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipe</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead className="text-center">Lampiran</TableHead>
                <TableHead className="text-center">Log</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashflows.map((cashflow) => {
                const config = getTypeConfig(cashflow.type);
                const DirectionIcon = config.icon;

                return (
                  <TableRow key={cashflow.id}>
                    <TableCell>
                      <Badge variant="outline" className={config.badgeClassName}>
                        <DirectionIcon className="mr-1 h-3.5 w-3.5" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <div className="space-y-1">
                        <p className="line-clamp-2 font-medium leading-tight">{cashflow.note}</p>
                        <p className="text-xs text-muted-foreground">
                          Diinput {formatDate(cashflow.createdAt)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(cashflow.transactionDate)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-sm font-semibold tabular-nums",
                        config.amountClassName,
                      )}
                    >
                      {cashflow.type === "EXPENSE" ? "-" : "+"}
                      {formatCurrency(cashflow.amount)}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                        <FileText className="h-3.5 w-3.5" />
                        <span>{cashflow.imageAttachments.length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {cashflow._count.cashflowLogs}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            void handleOpenDetail(cashflow.id);
                          }}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Detail
                        </Button>

                        <Dialog
                          open={editingCashflow?.id === cashflow.id}
                          onOpenChange={(open) =>
                            setEditingCashflow(open ? cashflow : null)
                          }
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCashflow(cashflow)}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Cashflow</DialogTitle>
                              <DialogDescription>
                                Perbarui transaksi cashflow tanpa meninggalkan halaman ini.
                              </DialogDescription>
                            </DialogHeader>
                            <CashflowForm
                              mode="edit"
                              initialValue={mapCashflowToFormValue(cashflow)}
                              isPending={isPending}
                              onCancel={() => setEditingCashflow(null)}
                              onSubmit={(value) => {
                                startTransition(async () => {
                                  const result = await updateCashflow(cashflow.id, value);

                                  if (result.success) {
                                    toast.success("Transaksi cashflow berhasil diperbarui.");
                                    setEditingCashflow(null);
                                    router.refresh();
                                    return;
                                  }

                                  toast.error(result.error ?? "Gagal memperbarui cashflow.");
                                });
                              }}
                            />
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Hapus
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus transaksi cashflow?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Data cashflow akan disembunyikan dari daftar aktif. Tindakan ini
                                tidak dapat dibatalkan dari UI saat ini.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(cashflow.id)}>
                                {isPending ? "Menghapus..." : "Hapus"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

interface CashflowDetailContentProps {
  cashflow: CashflowDetail | null;
  isLoading: boolean;
}

function CashflowDetailContent({
  cashflow,
  isLoading,
}: CashflowDetailContentProps) {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Memuat detail cashflow...
      </div>
    );
  }

  if (!cashflow) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Detail cashflow tidak tersedia.
      </div>
    );
  }

  const typeConfig = getTypeConfig(cashflow.type);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informasi Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Tipe</span>
              <Badge variant="outline" className={typeConfig.badgeClassName}>
                {typeConfig.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Tanggal Transaksi</span>
              <span className="font-medium">{formatDate(cashflow.transactionDate)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Nominal</span>
              <span className={cn("font-semibold", typeConfig.amountClassName)}>
                {cashflow.type === "EXPENSE" ? "-" : "+"}
                {formatCurrency(cashflow.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Dibuat</span>
              <span>{formatDateTime(cashflow.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Terakhir Diubah</span>
              <span>{formatDateTime(cashflow.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Catatan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{cashflow.note}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lampiran Bukti</CardTitle>
          <CardDescription>
            {cashflow.imageAttachments.length} file terlampir pada transaksi ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cashflow.imageAttachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada lampiran bukti.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {cashflow.imageAttachments.map((imageUrl, index) => (
                <a
                  key={`${imageUrl}-${index}`}
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                >
                  <Image
                    src={imageUrl}
                    alt={`Lampiran cashflow ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Log Perubahan</CardTitle>
          <CardDescription>
            Riwayat create, update, dan delete pada transaksi cashflow ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cashflow.cashflowLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada log perubahan.</p>
          ) : (
            cashflow.cashflowLogs.map((log) => {
              const currentType = log.cashflowTypeAfter ?? log.cashflowTypeBefore ?? "EXPENSE";
              const logTypeConfig = getTypeConfig(currentType);

              return (
                <div key={log.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.logType}</Badge>
                        <Badge variant="outline" className={logTypeConfig.badgeClassName}>
                          {logTypeConfig.label}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm font-medium">
                        {log.logActionNote ?? "Perubahan cashflow"}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground md:text-right">
                      <p>{formatDateTime(log.createdAt)}</p>
                      <p>Oleh {log.user.name || log.user.email}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <LogValueRow
                      label="Nominal"
                      beforeValue={
                        log.amountBefore != null ? formatCurrency(log.amountBefore) : null
                      }
                      afterValue={
                        log.amountAfter != null ? formatCurrency(log.amountAfter) : null
                      }
                    />
                    <LogValueRow
                      label="Tanggal"
                      beforeValue={
                        log.transactionDateBefore
                          ? formatDate(log.transactionDateBefore)
                          : null
                      }
                      afterValue={
                        log.transactionDateAfter ? formatDate(log.transactionDateAfter) : null
                      }
                    />
                    <LogValueRow
                      label="Tipe"
                      beforeValue={log.cashflowTypeBefore}
                      afterValue={log.cashflowTypeAfter}
                    />
                    <LogValueRow
                      label="Lampiran"
                      beforeValue={`${log.imageAttachmentsBefore.length} file`}
                      afterValue={`${log.imageAttachmentsAfter.length} file`}
                    />
                  </div>

                  <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Catatan</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Sebelum</p>
                        <p className="whitespace-pre-wrap">{log.noteBefore ?? "—"}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Sesudah</p>
                        <p className="whitespace-pre-wrap">{log.noteAfter ?? "—"}</p>
                      </div>
                    </div>
                  </div>

                  {(log.imageAttachmentsBefore.length > 0 ||
                    log.imageAttachmentsAfter.length > 0) && (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <AttachmentGroup
                          title="Lampiran Sebelum"
                          images={log.imageAttachmentsBefore}
                        />
                        <AttachmentGroup
                          title="Lampiran Sesudah"
                          images={log.imageAttachmentsAfter}
                        />
                      </div>
                    )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface LogValueRowProps {
  label: string;
  beforeValue: string | null;
  afterValue: string | null;
}

function LogValueRow({ label, beforeValue, afterValue }: LogValueRowProps) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="truncate">{beforeValue ?? "—"}</span>
        <span className="text-muted-foreground">→</span>
        <span className="truncate font-medium">{afterValue ?? "—"}</span>
      </div>
    </div>
  );
}

interface AttachmentGroupProps {
  title: string;
  images: string[];
}

function AttachmentGroup({ title, images }: AttachmentGroupProps) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">{title}</p>
      </div>
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada lampiran.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map((imageUrl, index) => (
            <a
              key={`${title}-${imageUrl}-${index}`}
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
            >
              <Image
                src={imageUrl}
                alt={`${title} ${index + 1}`}
                fill
                className="object-cover transition-transform duration-200 group-hover:scale-105"
                sizes="(max-width: 768px) 33vw, 15vw"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

interface CashflowFormProps {
  mode: "create" | "edit";
  initialValue?: CashflowFormState;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (value: {
    type: CashflowType;
    amount: number;
    note: string;
    transactionDate: Date;
    imageAttachments: string[];
  }) => void;
}

function CashflowForm({
  mode,
  initialValue,
  isPending,
  onCancel,
  onSubmit,
}: CashflowFormProps) {
  const [type, setType] = useState<CashflowType>(initialValue?.type ?? DEFAULT_FORM.type);
  const [amountInput, setAmountInput] = useState<string>(
    initialValue?.amount ?? DEFAULT_FORM.amount,
  );
  const [images, setImages] = useState<string[]>(
    initialValue?.imageAttachments ?? DEFAULT_FORM.imageAttachments,
  );

  const amountPreview = Number(amountInput);

  function handleSubmit(formData: FormData) {
    const amountValue = ((formData.get("amount") as string) ?? "").trim();
    const noteValue = ((formData.get("note") as string) ?? "").trim();
    const transactionDateValue = (formData.get("transactionDate") as string) ?? "";
    const amount = Number(amountValue);

    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Nominal harus berupa angka bulat yang lebih besar dari 0.");
      return;
    }

    if (!noteValue) {
      toast.error("Catatan wajib diisi.");
      return;
    }

    const transactionDate = new Date(transactionDateValue);
    if (Number.isNaN(transactionDate.getTime())) {
      toast.error("Tanggal transaksi tidak valid.");
      return;
    }

    onSubmit({
      type,
      amount,
      note: noteValue,
      transactionDate,
      imageAttachments: images,
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${mode}-type`}>Tipe Transaksi *</Label>
          <Select value={type} onValueChange={(value) => setType(value as CashflowType)}>
            <SelectTrigger id={`${mode}-type`}>
              <SelectValue placeholder="Pilih tipe transaksi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INCOME">Pemasukan</SelectItem>
              <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-transactionDate`}>Tanggal Transaksi *</Label>
          <Input
            id={`${mode}-transactionDate`}
            name="transactionDate"
            type="date"
            defaultValue={initialValue?.transactionDate ?? DEFAULT_FORM.transactionDate}
            disabled={isPending}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-amount`}>Nominal *</Label>
        <Input
          id={`${mode}-amount`}
          name="amount"
          type="number"
          min={1}
          step={1}
          placeholder="Contoh: 250000"
          defaultValue={initialValue?.amount ?? DEFAULT_FORM.amount}
          onChange={(event) => setAmountInput(event.target.value)}
          disabled={isPending}
          required
        />
        <p className="text-xs text-muted-foreground">
          Masukkan angka tanpa titik atau koma. Contoh: 250000 untuk Rp250.000.
        </p>
      </div>

      <div
        className={cn(
          "rounded-lg border px-4 py-3 text-sm",
          type === "INCOME"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
            : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300",
        )}
      >
        Transaksi ini akan dicatat sebagai{" "}
        <span className="font-semibold">
          {type === "INCOME" ? "pemasukan" : "pengeluaran"}
        </span>
        . Gunakan pengeluaran untuk biaya seperti listrik, operasional, atau beban lain.
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-note`}>Catatan *</Label>
        <Textarea
          id={`${mode}-note`}
          name="note"
          rows={4}
          placeholder="Contoh: Bayar listrik toko bulan April"
          defaultValue={initialValue?.note ?? DEFAULT_FORM.note}
          disabled={isPending}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Lampiran Bukti</Label>
        <ImageUploader
          images={images}
          setImages={setImages}
          maxUploads={4}
        />
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          Preview nominal:{" "}
          <span className="font-semibold text-foreground">
            {Number.isFinite(amountPreview) && amountPreview > 0
              ? formatCurrency(amountPreview)
              : "Belum diisi"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Batal
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? mode === "create"
                ? "Menyimpan..."
                : "Memperbarui..."
              : mode === "create"
                ? "Simpan"
                : "Simpan Perubahan"}
          </Button>
        </div>
      </div>
    </form>
  );
}
