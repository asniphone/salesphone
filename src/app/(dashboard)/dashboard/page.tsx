import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardSummary } from "@/actions/report";
import { getCurrentUserAccess } from "@/lib/access";
import { getCommonInformation } from "@/actions/common-information";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  Package,
  Users,
  HardHat,
  Wallet,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity
} from "lucide-react";
import { ReportFilter } from "./report-filter";
import { PdfExportButtons } from "./pdf-export-buttons";
import { computeDateRange, type DateRangePreset } from "@/lib/date-range";

interface DashboardPageProps {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const userAccess = await getCurrentUserAccess();
  if (!userAccess) redirect("/login");
  if (!userAccess.accessDashboardGeneralRead) redirect("/profile?forbidden=1");

  const params = await searchParams;
  const preset = (params.preset as DateRangePreset | undefined) ?? "thisMonth";
  const dateRange = computeDateRange(preset, params.from, params.to);

  const [summaryResult, ciResult] = await Promise.all([
    getDashboardSummary(),
    getCommonInformation(),
  ]);
  const storeName = ciResult.data?.storeName ?? "POS Internal";
  const data = summaryResult.data ?? {
    unit: { available: 0, soldThisMonth: 0, pendapatanThisMonth: 0, keuntunganThisMonth: 0 },
    accessory: { terjualThisMonth: 0, pendapatanThisMonth: 0, keuntunganThisMonth: 0 },
    customer: { total: 0, newThisMonth: 0 },
    worker: { active: 0 },
    cashflow: { saldoAkhir: "0" },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  function formatCurrencyFromString(value: string): string {
    const amount = BigInt(value);
    const abs = amount < BigInt(0) ? -amount : amount;
    const sign = amount < BigInt(0) ? "-" : "";
    return `${sign}Rp ${abs.toLocaleString("id-ID")}`;
  }

  // Helper untuk warna text berdasarkan nilai (merah jika minus, hijau jika plus, abu/default jika 0)
  const getTextColorClass = (value: number) => {
    if (value < 0) return "text-red-600 dark:text-red-500";
    if (value > 0) return "text-green-600 dark:text-green-500";
    return "text-foreground";
  };

  // Helper untuk warna border — untuk BigInt string
  const getBorderColorClassFromString = (value: string) => {
    const n = BigInt(value);
    if (n < BigInt(0)) return "border-red-200 dark:border-red-900/40";
    if (n > BigInt(0)) return "border-green-200 dark:border-green-900/40";
    return "border-border";
  };

  const getTextColorClassFromString = (value: string) => {
    const n = BigInt(value);
    if (n < BigInt(0)) return "text-red-600 dark:text-red-500";
    if (n > BigInt(0)) return "text-green-600 dark:text-green-500";
    return "text-foreground";
  };

  // Helper date for labels

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Dashboard</h1>
      </header>

      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Ikhtisar Penjualan</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Ringkasan data transaksi, inventaris, dan pelanggan — {preset === "custom" ? `${dateRange.from} s/d ${dateRange.to}` : preset === "today" ? "Hari Ini" : preset === "7days" ? "7 Hari Terakhir" : preset === "thisMonth" ? "Bulan Ini" : "1 Bulan Terakhir"}.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ReportFilter preset={preset} dateFrom={params.from} dateTo={params.to} />
            <PdfExportButtons
              storeName={storeName}
              dateRangeFrom={dateRange.from}
              dateRangeTo={dateRange.to}
              dateLabel={
                preset === "custom"
                  ? `${dateRange.from} s/d ${dateRange.to}`
                  : preset === "today"
                    ? "Hari Ini"
                    : preset === "7days"
                      ? "7 Hari Terakhir"
                      : preset === "thisMonth"
                        ? "Bulan Ini"
                        : "1 Bulan Terakhir"
              }
            />
          </div>
        </div>

        {/* TOP LEVEL METRICS */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <Card className={`${getBorderColorClassFromString(data.cashflow.saldoAkhir)} col-span-2 lg:col-span-1`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
              <Wallet className={`h-4 w-4 ${BigInt(data.cashflow.saldoAkhir) < BigInt(0) ? "text-red-600" : "text-green-600"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getTextColorClassFromString(data.cashflow.saldoAkhir)}`}>
                {formatCurrencyFromString(data.cashflow.saldoAkhir)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo Terdata
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stok Unit HP</CardTitle>
              <Smartphone className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.unit.available}</div>
              <p className="text-xs text-muted-foreground mt-1">Status Tersedia</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Customer</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.customer.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-500 font-medium">+{data.customer.newThisMonth}</span> pelanggan bulan ini
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Worker Aktif</CardTitle>
              <HardHat className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.worker.active}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Sales/Pekerja aktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status Sistem</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Terhubung</div>
              <p className="text-xs text-muted-foreground mt-1">Sinkronisasi Database Aktif</p>
            </CardContent>
          </Card>
        </div>

        {/* MAIN DASHBOARD WIDGETS */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* UNIT METRICS */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Performa Unit Handphone
              </CardTitle>
              <CardDescription>
                Penjualan khusus barang satuan ID/IMEI unik bulan ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Unit Terjual</span>
                  <span className="font-medium text-lg">{data.unit.soldThisMonth} pcs</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Nilai Penjualan</span>
                  <span className="font-mono font-medium">{formatCurrency(data.unit.pendapatanThisMonth)}</span>
                </div>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Laba Bersih
                    {data.unit.keuntunganThisMonth < 0 ? (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    ) : data.unit.keuntunganThisMonth > 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <Minus className="w-3 h-3 text-muted-foreground" />
                    )}
                  </span>
                  <span className={`font-mono font-bold ${getTextColorClass(data.unit.keuntunganThisMonth)}`}>
                    {formatCurrency(data.unit.keuntunganThisMonth)}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t bg-muted/20">
              <Button asChild variant="ghost" className="w-full justify-between" size="sm">
                <Link href="/unit/report">
                  Buka Laporan Terperinci Unit <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* ACCESSORY METRICS */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Performa Aksesoris / Stok Massal
              </CardTitle>
              <CardDescription>
                Penjualan barang non-satuan (Charger, Case, dll) bulan ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Quantity Terjual</span>
                  <span className="font-medium text-lg">{data.accessory.terjualThisMonth} item</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Nilai Penjualan</span>
                  <span className="font-mono font-medium">{formatCurrency(data.accessory.pendapatanThisMonth)}</span>
                </div>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Laba Kotor
                    {data.accessory.keuntunganThisMonth < 0 ? (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    ) : data.accessory.keuntunganThisMonth > 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <Minus className="w-3 h-3 text-muted-foreground" />
                    )}
                  </span>
                  <span className={`font-mono font-bold ${getTextColorClass(data.accessory.keuntunganThisMonth)}`}>
                    {formatCurrency(data.accessory.keuntunganThisMonth)}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t bg-muted/20">
              <Button asChild variant="ghost" className="w-full justify-between" size="sm">
                <Link href="/accessory/report">
                  Buka Laporan Terperinci Aksesoris <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

        </div>

        {/* BOTTOM METRICS */}
        <div className="grid gap-6 md:grid-cols-2">

          <Card className="flex flex-col border-blue-200 dark:border-blue-900/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Wallet className="h-5 w-5" />
                Buku Kas Umum (Cashflow)
              </CardTitle>
              <CardDescription>
                Rekap dana masuk dan keluar untuk operasional yang tak terhubung langsung dengan Unit/Aksesoris.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">
                Pantau sirkulasi keuangan agar operasional dapat dipantau dari satu tempat.
              </p>
            </CardContent>
            <CardFooter className="pt-4 border-t bg-blue-50 dark:bg-blue-900/10">
              <Button asChild variant="ghost" className="w-full justify-between text-blue-700 hover:text-blue-800" size="sm">
                <Link href="/cashflow">
                  Kelola Cashflow <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col border-amber-200 dark:border-amber-900/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <HardHat className="h-5 w-5" />
                Performa Pekerja (Worker)
              </CardTitle>
              <CardDescription>
                Pantau fee, total penjulan, dan performa dari masing-masing sales / pekerja.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">
                Hitungan total upah dan nilai penjualan detail per individu agar pembagian fee dapat terpantau transparan.
              </p>
            </CardContent>
            <CardFooter className="pt-4 border-t bg-amber-50 dark:bg-amber-900/10">
              <Button asChild variant="ghost" className="w-full justify-between text-amber-700 hover:text-amber-800" size="sm">
                <Link href="/worker/report">
                  Buka Laporan Performa Worker <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

        </div>

      </div>
    </>
  );
}