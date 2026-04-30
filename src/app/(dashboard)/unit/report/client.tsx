"use client";

import type { UnitReportData } from "@/actions/report";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  Line,
  LineChart,
} from "recharts";
import {
  Smartphone,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  RotateCcw,
  Bookmark,
  HardHat,
  Receipt,
  CreditCard,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

const barChartConfig = {
  pendapatan: { label: "Pendapatan", color: "hsl(221, 83%, 53%)" },
  modal: { label: "Modal", color: "hsl(0, 84%, 60%)" },
  keuntunganKotor: { label: "Laba Kotor", color: "hsl(142, 71%, 45%)" },
  workerFee: { label: "Fee Worker", color: "hsl(38, 92%, 50%)" },
  keuntunganBersih: { label: "Laba Bersih", color: "hsl(262, 83%, 58%)" },
} satisfies ChartConfig;

const lineChartConfig = {
  terjual: { label: "Unit Terjual", color: "hsl(262, 83%, 58%)" },
} satisfies ChartConfig;

const pieChartConfig = {
  available: { label: "Tersedia", color: "hsl(142, 71%, 45%)" },
  booked: { label: "Dipesan", color: "hsl(45, 93%, 47%)" },
  sold: { label: "Terjual", color: "hsl(221, 83%, 53%)" },
  returned: { label: "Dikembalikan", color: "hsl(0, 84%, 60%)" },
} satisfies ChartConfig;

interface Props {
  data: UnitReportData;
}

export function UnitReportClient({ data }: Props) {
  const marginKotorPersen =
    data.totalPendapatan > 0
      ? ((data.totalKeuntunganKotor / data.totalPendapatan) * 100).toFixed(1)
      : "0";

  const marginBersihPersen =
    data.totalPendapatan > 0
      ? ((data.totalKeuntunganBersih / data.totalPendapatan) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Summary Cards — Row 1: Core Metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Unit</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUnit}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.unitAvailable} tersedia · {data.unitBooked} dipesan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unit Terjual</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.unitSold}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.unitReturned} dikembalikan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendapatan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalPendapatan)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Modal: {formatCurrency(data.totalModal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Laba Kotor</CardTitle>
            {data.totalKeuntunganKotor >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.totalKeuntunganKotor >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(data.totalKeuntunganKotor)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Margin: {marginKotorPersen}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards — Row 2: Worker Fee & Net Profit */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-amber-200 dark:border-amber-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fee Worker</CardTitle>
            <HardHat className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(data.totalWorkerFee)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Rata-rata: {formatCurrency(data.avgFeePerUnit)} / unit
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Laba Bersih</CardTitle>
            {data.totalKeuntunganBersih >= 0 ? (
              <TrendingUp className="h-4 w-4 text-purple-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.totalKeuntunganBersih >= 0 ? "text-purple-600" : "text-red-600"}`}>
              {formatCurrency(data.totalKeuntunganBersih)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net margin: {marginBersihPersen}%
            </p>
          </CardContent>
        </Card>

        {/* Breakdown: Pendapatan flow */}
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Ringkasan Alur Keuangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>Pendapatan <b>{formatCurrency(data.totalPendapatan)}</b></span>
              <span className="text-muted-foreground">−</span>
              <span>Modal <b className="text-red-600">{formatCurrency(data.totalModal)}</b></span>
              <span className="text-muted-foreground">=</span>
              <span>Laba Kotor <b className="text-green-600">{formatCurrency(data.totalKeuntunganKotor)}</b></span>
              <span className="text-muted-foreground">−</span>
              <span>Fee <b className="text-amber-600">{formatCurrency(data.totalWorkerFee)}</b></span>
              <span className="text-muted-foreground">=</span>
              <span>Laba Bersih <b className="text-purple-600">{formatCurrency(data.totalKeuntunganBersih)}</b></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar Chart — Financial breakdown per bulan */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pendapatan, Laba & Fee per Bulan</CardTitle>
            <CardDescription>Perbandingan pendapatan, modal, laba kotor, fee worker, dan laba bersih.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.monthlyData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Belum ada data penjualan pada rentang waktu ini.
              </div>
            ) : (
              <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                <BarChart data={data.monthlyData} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(v) => {
                      const parts = v.split(" ");
                      return parts[0]?.substring(0, 3) ?? v;
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCompact(v)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCurrency(value as number)}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="pendapatan" fill="var(--color-pendapatan)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="modal" fill="var(--color-modal)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="keuntunganKotor" fill="var(--color-keuntunganKotor)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="workerFee" fill="var(--color-workerFee)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="keuntunganBersih" fill="var(--color-keuntunganBersih)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart — Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribusi Status</CardTitle>
            <CardDescription>Komposisi status seluruh unit.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.statusBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Belum ada data unit.
              </div>
            ) : (
              <ChartContainer config={pieChartConfig} className="h-[300px] w-full">
                <PieChart accessibilityLayer>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={data.statusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {data.statusBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Chart — Tren Penjualan */}
      {data.monthlyData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tren Penjualan Unit</CardTitle>
            <CardDescription>Jumlah unit terjual per bulan.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={lineChartConfig} className="h-[250px] w-full">
              <LineChart data={data.monthlyData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(v) => {
                    const parts = v.split(" ");
                    return parts[0]?.substring(0, 3) ?? v;
                  }}
                />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="terjual"
                  stroke="var(--color-terjual)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-terjual)" }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Table — Detail Per Bulan (enhanced with fee) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ringkasan Per Bulan</CardTitle>
          <CardDescription>Detail pendapatan, modal, fee worker, dan laba per periode.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.monthlyData.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              Tidak ada data penjualan pada rentang waktu ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bulan</TableHead>
                    <TableHead className="text-right">Terjual</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                    <TableHead className="text-right">Modal</TableHead>
                    <TableHead className="text-right">Laba Kotor</TableHead>
                    <TableHead className="text-right">Fee Worker</TableHead>
                    <TableHead className="text-right">Laba Bersih</TableHead>
                    <TableHead className="text-right">Net Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.monthlyData.map((row) => {
                    const netMargin = row.pendapatan > 0
                      ? ((row.keuntunganBersih / row.pendapatan) * 100).toFixed(1)
                      : "0";
                    return (
                      <TableRow key={row.month}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        <TableCell className="text-right">{row.terjual}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(row.pendapatan)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {formatCurrency(row.modal)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${row.keuntunganKotor >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(row.keuntunganKotor)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-amber-600">
                          {formatCurrency(row.workerFee)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm font-semibold ${row.keuntunganBersih >= 0 ? "text-purple-600" : "text-red-600"}`}>
                          {formatCurrency(row.keuntunganBersih)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {netMargin}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totals */}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{data.unitSold}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(data.totalPendapatan)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatCurrency(data.totalModal)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${data.totalKeuntunganKotor >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(data.totalKeuntunganKotor)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-amber-600">
                      {formatCurrency(data.totalWorkerFee)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm font-semibold ${data.totalKeuntunganBersih >= 0 ? "text-purple-600" : "text-red-600"}`}>
                      {formatCurrency(data.totalKeuntunganBersih)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {marginBersihPersen}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Workers Table */}
      {data.topWorkers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HardHat className="h-4 w-4 text-muted-foreground" />
              Performa Worker
            </CardTitle>
            <CardDescription>Kontribusi masing-masing worker pada penjualan unit.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead className="text-right">Unit Terjual</TableHead>
                  <TableHead className="text-right">Nilai Penjualan</TableHead>
                  <TableHead className="text-right">Total Fee</TableHead>
                  <TableHead className="text-right">Rata-rata Fee / Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topWorkers.map((w) => (
                  <TableRow key={w.name}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-right">{w.unitTerjual}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(w.totalPenjualan)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-amber-600">
                      {formatCurrency(w.totalFee)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatCurrency(w.unitTerjual > 0 ? Math.round(w.totalFee / w.unitTerjual) : 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payment Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Report Tipe Pembayaran
          </CardTitle>
          <CardDescription>Distribusi unit SOLD berdasarkan metode pembayaran.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.paymentTypeBreakdown.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-6">
              Belum ada data unit terjual pada rentang waktu ini.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe Pembayaran</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Persentase</TableHead>
                  <TableHead className="text-right">Total Penjualan</TableHead>
                  <TableHead className="text-right">Rata-rata / Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.paymentTypeBreakdown.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">{row.jumlahUnit}</TableCell>
                    <TableCell className="text-right">{row.persentase}%</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.totalPenjualan)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatCurrency(
                        row.jumlahUnit > 0
                          ? Math.round(row.totalPenjualan / row.jumlahUnit)
                          : 0
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Quick Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-200 dark:border-green-900/40">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Package className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tersedia</p>
                <p className="text-lg font-bold">{data.unitAvailable}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-900/40">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Bookmark className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dipesan</p>
                <p className="text-lg font-bold">{data.unitBooked}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-900/40">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Terjual</p>
                <p className="text-lg font-bold">{data.unitSold}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900/40">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <RotateCcw className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dikembalikan</p>
                <p className="text-lg font-bold">{data.unitReturned}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
