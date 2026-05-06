import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface UnitRow {
  name: string;
  status: string;
  soldPrice: number;
  buyPrice: number;
  profit: number;
  workerFee: number;
  netProfit: number;
  soldAt: string;
}

export function generateUnitPdf(
  storeName: string,
  dateLabel: string,
  rows: UnitRow[],
  summary: {
    unitSold: number;
    totalPendapatan: number;
    totalKeuntunganBersih: number;
  },
): Blob {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(14);
  doc.text(`Laporan Penjualan ${storeName}`, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Periode: ${dateLabel}`, 14, 22);
  doc.text(`Unit Terjual: ${summary.unitSold} | Total Pendapatan: Rp ${summary.totalPendapatan.toLocaleString("id-ID")} | Laba Bersih: Rp ${summary.totalKeuntunganBersih.toLocaleString("id-ID")}`, 14, 29);

  autoTable(doc, {
    startY: 35,
    head: [["Nama Unit", "Status", "Harga Jual", "Harga Beli", "Laba Kotor", "Fee Worker", "Laba Bersih", "Tanggal Jual"]],
    body: rows.map((r) => [
      r.name,
      r.status,
      `Rp ${r.soldPrice.toLocaleString("id-ID")}`,
      `Rp ${r.buyPrice.toLocaleString("id-ID")}`,
      `Rp ${r.profit.toLocaleString("id-ID")}`,
      `Rp ${r.workerFee.toLocaleString("id-ID")}`,
      `Rp ${r.netProfit.toLocaleString("id-ID")}`,
      r.soldAt ? new Date(r.soldAt).toLocaleDateString("id-ID") : "-",
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 20 },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
      6: { cellWidth: 35, halign: "right" },
      7: { cellWidth: 30 },
    },
  });

  return doc.output("blob");
}

export function generateAccessoryPdf(
  storeName: string,
  dateLabel: string,
  sales: {
    id: number;
    date: string;
    customer: string;
    items: string;
    totalPrice: number;
    totalProfit: number;
    feeWorker: number;
    netProfit: number;
  }[],
  summary: {
    totalTransaksi: number;
    totalPendapatan: number;
    totalKeuntunganKotor: number;
    totalFeeWorker: number;
    totalKeuntunganBersih: number;
  },
): Blob {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(14);
  doc.text(`Laporan Penjualan ${storeName}`, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Periode: ${dateLabel}`, 14, 22);
  doc.text(
    `Transaksi: ${summary.totalTransaksi} | Pendapatan: Rp ${summary.totalPendapatan.toLocaleString("id-ID")} | Laba Kotor: Rp ${summary.totalKeuntunganKotor.toLocaleString("id-ID")} | Fee Worker: Rp ${summary.totalFeeWorker.toLocaleString("id-ID")} | Laba Bersih: Rp ${summary.totalKeuntunganBersih.toLocaleString("id-ID")}`,
    14,
    29,
  );

  autoTable(doc, {
    startY: 35,
    head: [["ID", "Tanggal", "Customer", "Item", "Total Harga", "Laba Kotor", "Fee Worker", "Laba Bersih"]],
    body: sales.map((s) => [
      String(s.id),
      s.date,
      s.customer,
      s.items,
      `Rp ${s.totalPrice.toLocaleString("id-ID")}`,
      `Rp ${s.totalProfit.toLocaleString("id-ID")}`,
      `Rp ${s.feeWorker.toLocaleString("id-ID")}`,
      `Rp ${s.netProfit.toLocaleString("id-ID")}`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 30 },
      2: { cellWidth: 50 },
      3: { cellWidth: "auto" },
      4: { cellWidth: 32, halign: "right" },
      5: { cellWidth: 32, halign: "right" },
      6: { cellWidth: 30, halign: "right" },
      7: { cellWidth: 32, halign: "right" },
    },
  });

  return doc.output("blob");
}
