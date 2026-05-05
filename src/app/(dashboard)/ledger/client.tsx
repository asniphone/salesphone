"use client";

import { useState } from "react";
import { Eye, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getLedgerReferenceDetail, type LedgerListItem, type LedgerReferenceDetail } from "@/actions/ledger-read";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  ledgers: LedgerListItem[];
  summary: {
    currentBalance: string;
    totalIn: string;
    totalOut: string;
  };
}

function formatCurrencyFromString(value: string): string {
  // if (!value || isNaN(Number(value))) {
  //   return value;
  // }
  // if (Number(value) < 999) {
  //   return value
  // }
  const amount = BigInt(value);
  const abs = amount < BigInt(0) ? -amount : amount;
  const sign = amount < BigInt(0) ? "-" : "";
  return `${sign}Rp ${abs.toLocaleString("id-ID")}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function LedgerListClient({ ledgers, summary }: Props) {
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LedgerReferenceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function openDetail(id: string) {
    setSelectedLedgerId(id);
    setLoadingDetail(true);
    const result = await getLedgerReferenceDetail(id);
    if (result.success) {
      setDetail(result.data ?? null);
    } else {
      toast.error(result.error ?? "Gagal mengambil detail ledger.");
      setSelectedLedgerId(null);
    }
    setLoadingDetail(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo Saat Ini</CardTitle>
            <CardDescription>Saldo terbaru berdasarkan baris ledger terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">{formatCurrencyFromString(summary.currentBalance)}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Akumulasi Masuk</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-300">
              {formatCurrencyFromString(summary.totalIn)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200/70 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Akumulasi Keluar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-red-700 dark:text-red-300">
              {formatCurrencyFromString(summary.totalOut)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tanggal Transaksi</TableHead>
              <TableHead>Jenis Referensi</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Saldo Akhir</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledgers.map((ledger) => (
              <TableRow key={ledger.id}>
                <TableCell className="font-mono text-xs">#{ledger.id}</TableCell>
                <TableCell>{formatDateTime(ledger.transactionDate)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{ledger.referenceType}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={ledger.actionType === "DELETE" ? "destructive" : "secondary"}>
                    {ledger.actionType}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[340px] truncate">{ledger.actionNote}</TableCell>
                <TableCell className="text-right font-mono">
                  <span className={BigInt(ledger.gapAmount) >= BigInt(0) ? "text-emerald-600" : "text-red-600"}>
                    {formatCurrencyFromString(ledger.gapAmount)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">{formatCurrencyFromString(ledger.afterAmount)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openDetail(ledger.id)}>
                    <Eye className="mr-1 h-3 w-3" />
                    Detail
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={selectedLedgerId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLedgerId(null);
            setDetail(null);
            setLoadingDetail(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Referensi</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <p className="text-sm text-muted-foreground">Memuat detail...</p>
          ) : !detail ? (
            <div className="rounded-lg border p-6 text-center">
              <Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Data referensi tidak ditemukan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold">{detail.reference.title}</p>
                {detail.reference.description && (
                  <p className="text-xs text-muted-foreground">{detail.reference.description}</p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Jumlah</p>
                  <p className="font-medium">{formatCurrencyFromString(detail.ledger.gapAmount)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Saldo Setelah Transaksi</p>
                  <p className="font-medium">{formatCurrencyFromString(detail.ledger.afterAmount)}</p>
                </div>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableBody>
                    {detail.reference.items.map((item) => (
                      <TableRow key={item.label}>
                        <TableCell className="w-[45%] text-muted-foreground">{item.label}</TableCell>
                        <TableCell>{(item.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

