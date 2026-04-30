import Link from "next/link";
import { getDashboardSummary } from "@/actions/report";
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
  Activity
} from "lucide-react";

export default async function DashboardPage() {
  const summaryResult = await getDashboardSummary();
  const data = summaryResult.data ?? {
    unit: { available: 0, soldThisMonth: 0, pendapatanThisMonth: 0, keuntunganThisMonth: 0 },
    accessory: { terjualThisMonth: 0, pendapatanThisMonth: 0, keuntunganThisMonth: 0 },
    customer: { total: 0, newThisMonth: 0 },
    worker: { active: 0 },
    cashflow: { saldoAkhir: 0 },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Helper date for labels
  const currentMonthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date());

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Dashboard</h1>
      </header>

      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ikhtisar Penjualan </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Ringkasan data transaksi, inventaris, dan pelanggan untuk bulan {currentMonthLabel}.
          </p>
        </div>

        {/* TOP LEVEL METRICS */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <Card className="border-green-200 dark:border-green-900/40 col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Kas</CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(data.cashflow.saldoAkhir)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total uang saat ini
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
                    Laba Bersih <TrendingUp className="w-3 h-3 text-green-500" />
                  </span>
                  <span className="font-mono font-bold text-green-600">{formatCurrency(data.unit.keuntunganThisMonth)}</span>
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
                    Laba Kotor <TrendingUp className="w-3 h-3 text-green-500" />
                  </span>
                  <span className="font-mono font-bold text-green-600">{formatCurrency(data.accessory.keuntunganThisMonth)}</span>
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
