"use client";

import type { AccessoryReportData } from "@/actions/report";
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
  Line,
  LineChart,
} from "recharts";
import {
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Warehouse,
  ArrowDownCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  keuntungan: { label: "Keuntungan", color: "hsl(142, 71%, 45%)" },
} satisfies ChartConfig;

const lineChartConfig = {
  transaksi: { label: "Jumlah Transaksi", color: "hsl(262, 83%, 58%)" },
  itemTerjual: { label: "Item Terjual", color: "hsl(25, 95%, 53%)" },
} satisfies ChartConfig;

const topProductChartConfig = {
  totalTerjual: { label: "Qty Terjual", color: "hsl(221, 83%, 53%)" },
} satisfies ChartConfig;

interface Props {
  data: AccessoryReportData;
}

export function AccessoryReportClient({ data }: Props) {
  const marginPersen =
    data.totalPendapatan > 0
      ? ((data.totalKeuntungan / data.totalPendapatan) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produk Aktif</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalProduk}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Jenis aksesoris terdaftar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transaksi Jual</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTransaksiJual}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalItemTerjual} item terjual
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
              Dari penjualan aksesoris
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Keuntungan</CardTitle>
            {data.totalKeuntungan >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.totalKeuntungan >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(data.totalKeuntungan)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Margin: {marginPersen}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inventaris & Pembelian */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-blue-200 dark:border-blue-900/40">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Warehouse className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nilai Inventaris Saat Ini</p>
                <p className="text-lg font-bold">{formatCurrency(data.nilaiInventaris)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-900/40">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <ArrowDownCircle className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pembelian Stok</p>
                <p className="text-lg font-bold">{data.totalPembelianStok} transaksi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900/40">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <DollarSign className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pengeluaran Stok</p>
                <p className="text-lg font-bold">{formatCurrency(data.totalPengeluaranStok)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart — Pendapatan & Keuntungan per Bulan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendapatan & Keuntungan per Bulan</CardTitle>
            <CardDescription>Perbandingan pendapatan dan keuntungan aksesoris.</CardDescription>
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
                  <Bar dataKey="keuntungan" fill="var(--color-keuntungan)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Line Chart — Tren Transaksi & Item */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tren Penjualan</CardTitle>
            <CardDescription>Jumlah transaksi dan item yang terjual per bulan.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.monthlyData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Belum ada data penjualan pada rentang waktu ini.
              </div>
            ) : (
              <ChartContainer config={lineChartConfig} className="h-[300px] w-full">
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
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="transaksi"
                    stroke="var(--color-transaksi)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-transaksi)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="itemTerjual"
                    stroke="var(--color-itemTerjual)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-itemTerjual)" }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      {data.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produk Terlaris</CardTitle>
            <CardDescription>Top 10 aksesoris berdasarkan jumlah terjual.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartContainer config={topProductChartConfig} className="h-[300px] w-full">
                <BarChart
                  data={data.topProducts}
                  layout="vertical"
                  accessibilityLayer
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={120}
                    tickFormatter={(v) => (v.length > 15 ? v.substring(0, 15) + "…" : v)}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="totalTerjual" fill="var(--color-totalTerjual)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topProducts.map((p, i) => (
                    <TableRow key={p.name}>
                      <TableCell>
                        <Badge variant={i < 3 ? "default" : "secondary"} className="text-xs">
                          {i + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell className="text-right">{p.totalTerjual}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(p.totalPendapatan)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ringkasan Per Bulan</CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyData.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              Tidak ada data penjualan pada rentang waktu ini.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bulan</TableHead>
                  <TableHead className="text-right">Transaksi</TableHead>
                  <TableHead className="text-right">Item Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                  <TableHead className="text-right">Keuntungan</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthlyData.map((row) => {
                  const margin = row.pendapatan > 0
                    ? ((row.keuntungan / row.pendapatan) * 100).toFixed(1)
                    : "0";
                  return (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right">{row.transaksi}</TableCell>
                      <TableCell className="text-right">{row.itemTerjual}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(row.pendapatan)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${row.keuntungan >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(row.keuntungan)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {margin}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals */}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{data.totalTransaksiJual}</TableCell>
                  <TableCell className="text-right">{data.totalItemTerjual}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(data.totalPendapatan)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${data.totalKeuntungan >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(data.totalKeuntungan)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {marginPersen}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
