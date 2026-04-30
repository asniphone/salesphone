"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { WorkerRankingBy, WorkerReportData } from "@/actions/report";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  Trophy,
  HardHat,
  ShoppingCart,
  Package,
  Coins,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}Jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}Rb`;
  return value.toString();
}

const leaderboardChartConfig = {
  skorPerforma: {
    label: "Skor Performa",
    color: "hsl(221, 83%, 53%)",
  },
} satisfies ChartConfig;

const RANKING_OPTIONS: { value: WorkerRankingBy; label: string }[] = [
  { value: "laba-bersih", label: "Laba Bersih" },
  { value: "pendapatan", label: "Pendapatan" },
  { value: "jumlah-transaksi", label: "Jumlah Transaksi" },
];

interface Props {
  data: WorkerReportData;
}

export function WorkerReportClient({ data }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rankingLabel =
    RANKING_OPTIONS.find((option) => option.value === data.rankingBy)?.label ??
    "Laba Bersih";
  const chartDataKey =
    data.rankingBy === "pendapatan"
      ? "totalPendapatan"
      : data.rankingBy === "jumlah-transaksi"
        ? "totalTransaksi"
        : "skorPerforma";

  function handleRankingChange(value: WorkerRankingBy) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("rankingBy", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const topPerformer = data.leaderboard[0] ?? null;
  const chartData = data.leaderboard.slice(0, 8).map((row) => ({
    name: row.name,
    skorPerforma: row.skorPerforma,
    totalPendapatan: row.totalPendapatan,
    totalTransaksi: row.totalTransaksi,
    fill:
      row.rank === 1
        ? "hsl(45, 93%, 47%)"
        : row.rank === 2
          ? "hsl(215, 20%, 65%)"
          : row.rank === 3
            ? "hsl(24, 95%, 53%)"
            : "var(--color-skorPerforma)",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Urutkan leaderboard berdasarkan</p>
          <p className="text-xs text-muted-foreground">
            Pilih metrik utama untuk menentukan worker paling perform.
          </p>
        </div>
        <Select value={data.rankingBy} onValueChange={(value) => handleRankingChange(value as WorkerRankingBy)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Pilih basis ranking" />
          </SelectTrigger>
          <SelectContent>
            {RANKING_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Worker</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalWorker}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.workerAktif} worker aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unit Terjual</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUnitTerjual}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total dari semua worker
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transaksi Aksesoris</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTransaksiAksesoris}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total transaksi penjualan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendapatan Gabungan</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalPendapatanGabungan)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unit + aksesoris
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-amber-200 dark:border-amber-900/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Performer
            </CardTitle>
            <CardDescription>
              Peringkat utama berdasarkan {rankingLabel.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topPerformer ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-amber-500">#{topPerformer.rank}</span>
                    <div>
                      <p className="text-lg font-semibold">{topPerformer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {topPerformer.isActive ? "Worker aktif" : "Worker nonaktif"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{rankingLabel}</span>
                    <span className="font-semibold">
                      {data.rankingBy === "jumlah-transaksi"
                        ? `${topPerformer.totalTransaksi} transaksi`
                        : formatCurrency(
                            data.rankingBy === "pendapatan"
                              ? topPerformer.totalPendapatan
                              : topPerformer.skorPerforma,
                          )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Laba Kotor</span>
                    <span>{formatCurrency(topPerformer.totalLabaKotor)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Fee Worker</span>
                    <span>{formatCurrency(topPerformer.totalFeeWorker)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pendapatan</span>
                    <span>{formatCurrency(topPerformer.totalPendapatan)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Belum ada data transaksi worker pada rentang waktu ini.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Leaderboard Performa
            </CardTitle>
            <CardDescription>
              Saat ini diurutkan berdasarkan {rankingLabel.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Belum ada data leaderboard pada rentang waktu ini.
              </div>
            ) : (
              <ChartContainer config={leaderboardChartConfig} className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCompact(value)}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            data.rankingBy === "jumlah-transaksi"
                              ? `${value as number} transaksi`
                              : formatCurrency(value as number)
                          }
                        />
                      }
                    />
                    <Bar dataKey={chartDataKey} radius={[6, 6, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Laba Kotor Gabungan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalLabaKotorGabungan)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fee Worker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(data.totalFeeWorkerGabungan)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Laba Bersih untuk Toko</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(data.totalLabaBersihUntukToko)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tabel Leaderboard</CardTitle>
          <CardDescription>
            Rincian performa setiap worker pada rentang waktu terpilih.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.leaderboard.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Belum ada data worker yang bisa diranking pada rentang waktu ini.
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                    <TableHead className="text-right">Trx Aksesoris</TableHead>
                    <TableHead className="text-right">Item Aksesoris</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                    <TableHead className="text-right">Laba Kotor</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">{rankingLabel}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.leaderboard.map((row) => (
                    <TableRow key={row.workerId}>
                      <TableCell className="font-semibold">
                        {row.rank <= 3 ? (
                          <Badge
                            variant={row.rank === 1 ? "default" : "secondary"}
                            className={row.rank === 1 ? "bg-amber-500 hover:bg-amber-500" : ""}
                          >
                            #{row.rank}
                          </Badge>
                        ) : (
                          `#${row.rank}`
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{row.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {row.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{row.unitTerjual}</TableCell>
                      <TableCell className="text-right">{row.transaksiAksesoris}</TableCell>
                      <TableCell className="text-right">{row.itemAksesorisTerjual}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(row.totalPendapatan)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(row.totalLabaKotor)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-amber-600">
                        {formatCurrency(row.totalFeeWorker)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {data.rankingBy === "jumlah-transaksi"
                          ? `${row.totalTransaksi} transaksi`
                          : formatCurrency(
                              data.rankingBy === "pendapatan"
                                ? row.totalPendapatan
                                : row.skorPerforma,
                            )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
