"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPdfUnitReportData, getPdfAccessoryReportData } from "@/actions/report";
import { generateUnitPdf, generateAccessoryPdf } from "@/lib/pdf-report";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PdfExportButtonsProps {
  storeName: string;
  dateRangeFrom: string;
  dateRangeTo: string;
  dateLabel: string;
}

export function PdfExportButtons({ storeName, dateRangeFrom, dateRangeTo, dateLabel }: PdfExportButtonsProps) {
  const [loadingUnit, setLoadingUnit] = useState(false);
  const [loadingAccessory, setLoadingAccessory] = useState(false);

  async function exportUnitPdf() {
    setLoadingUnit(true);
    try {
      const result = await getPdfUnitReportData(dateRangeFrom, dateRangeTo);
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Gagal mengambil data laporan unit.");
        return;
      }
      const blob = generateUnitPdf(storeName, dateLabel, result.data.rows, result.data.summary);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Unit_${dateRangeFrom}_${dateRangeTo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Laporan unit berhasil diunduh.");
    } catch {
      toast.error("Gagal membuat PDF laporan unit.");
    } finally {
      setLoadingUnit(false);
    }
  }

  async function exportAccessoryPdf() {
    setLoadingAccessory(true);
    try {
      const result = await getPdfAccessoryReportData(dateRangeFrom, dateRangeTo);
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Gagal mengambil data laporan aksesoris.");
        return;
      }
      const blob = generateAccessoryPdf(storeName, dateLabel, result.data.sales, result.data.summary);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Aksesoris_${dateRangeFrom}_${dateRangeTo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Laporan aksesoris berhasil diunduh.");
    } catch {
      toast.error("Gagal membuat PDF laporan aksesoris.");
    } finally {
      setLoadingAccessory(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <FileDown className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportUnitPdf} disabled={loadingUnit}>
          {loadingUnit ? "Mengunduh Unit..." : "Laporan Unit"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAccessoryPdf} disabled={loadingAccessory}>
          {loadingAccessory ? "Mengunduh Aksesoris..." : "Laporan Aksesoris"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
