"use client";

import { Button } from "@/components/ui/button";
import { UNIT_PAYMENT_TYPE_CONFIG } from "@/constants/unit";
import type { PaymentType } from "@prisma/client";
import { Printer } from "lucide-react";
import styles from "./receipt-print-button.module.css";

interface StoreInformation {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeLogo: string | null;
  footNoteReceipt: string | null;
}

interface ReceiptUnitData {
  id: number;
  name: string;
  imei: string | null;
  soldAt: string | null;
  soldPrice: number | null;
  dpAmount: number | null;
  paymentType: PaymentType | null;
  customer: { name: string; phone: string | null };
  worker: { name: string } | null;
  workerFee: number | null;
}

interface Props {
  unit: ReceiptUnitData;
  storeInformation: StoreInformation;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function UnitReceiptPrintButton({ unit, storeInformation }: Props) {
  const soldPrice = unit.soldPrice ?? 0;
  const dpAmount = unit.dpAmount ?? 0;
  const remaining = Math.max(soldPrice - dpAmount, 0);
  const paymentTypeLabel = unit.paymentType
    ? UNIT_PAYMENT_TYPE_CONFIG[unit.paymentType].label
    : "-";
  const footNote = storeInformation.footNoteReceipt?.trim();

  return (
    <div className={styles.root}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={styles.noPrint}
        onClick={() => window.print()}
      >
        <Printer className="mr-2 h-4 w-4" />
        Cetak Receipt
      </Button>

      <div id="unit-receipt-print-area" className={styles.printArea} aria-hidden>
        <article className={styles.receipt}>
          <div className={styles.center}>
            {storeInformation.storeLogo && (
              <img
                src={storeInformation.storeLogo}
                alt="Logo toko"
                className={styles.logo}
              />
            )}
            <h3 className={styles.storeName}>{storeInformation.storeName}</h3>
            <p className={styles.textMuted}>{storeInformation.storeAddress}</p>
            <p className={styles.textMuted}>Telp: {storeInformation.storePhone}</p>
          </div>

          <div className={styles.divider} />

          <div className={styles.tableHeader}>
            <span className={styles.tableLabel}>No. Faktur</span>
            <span>:</span>
            <span className={styles.tableValue}>SE{unit.id.toString().padStart(8, "0")}</span>
          </div>
          <div className={styles.tableHeader}>
            <span className={styles.tableLabel}>Tanggal</span>
            <span>:</span>
            <span className={styles.tableValue}>{formatDateTime(unit.soldAt)}</span>
          </div>

          <div className={styles.tableHeader}>
            <span className={styles.tableLabel}>Customer</span>
            <span>:</span>
            <span className={styles.tableValue}>{unit.customer.name}</span>
          </div>
          <div className={styles.tableHeader}>
            <span className={styles.tableLabel}>Email</span>
            <span>:</span>
            <span className={styles.tableValue}>-</span>
          </div>
          <div className={styles.tableHeader}>
            <span className={styles.tableLabel}>HP</span>
            <span>:</span>
            <span className={styles.tableValue}>{unit.customer.phone || "-"}</span>
          </div>
          {/* <div className={styles.tableHeader}>
            <span className={styles.tableLabel}>ID Card</span>
            <span>:</span>
            <span className={styles.tableValue}>-</span>
          </div> */}

          <div className={styles.divider} />

          <div className={styles.itemGrid}>
            <span className={styles.itemNumber}>1 .</span>
            <div className={styles.itemDetails}>
              {/* <span className={styles.textMuted}>{unit.imei || unit.id.toString().padStart(10, "0")}</span> */}
              <p className={styles.itemName}>{unit.name}</p>
              <div className={styles.itemPriceRow}>
                <span className={styles.itemQty}>1 Pcs</span>
                {/* <span className={styles.itemPrice}>{formatCurrency(soldPrice)}</span> */}
                <span className={styles.itemTotal}>{formatCurrency(soldPrice)}</span>
              </div>
              {/* <span className={styles.textMuted}>Disc: 0,00</span> */}
              {unit.imei && (
                <>
                  <span className={styles.textMuted}>Serial number:</span>
                  <span className={styles.textMuted}>{unit.imei}</span>
                </>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.rowFlex}>
            <span>Total Item = 1</span>
            <span>Total Qty = 1</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.totalsGrid}>
            <span className={styles.totalsLabel}>Grand Total</span>
            <span>:</span>
            <span className={styles.totalsValue}>{formatCurrency(soldPrice)}</span>
          </div>
          <div className={styles.totalsGrid}>
            <span className={styles.totalsLabel}>DP</span>
            <span>:</span>
            <span className={styles.totalsValue}>{formatCurrency(dpAmount > 0 ? dpAmount : soldPrice)}</span>
          </div>
          <div className={styles.totalsGrid}>
            <span className={styles.totalsLabel}>Uang Kembalian</span>
            <span>:</span>
            <span className={styles.totalsValue}>0,00</span>
          </div>

          <div className={styles.totalsGrid}>
            <span className={styles.totalsLabel}>Pembayaran</span>
            <span>:</span>
            <span className={styles.totalsValue}>{paymentTypeLabel}</span>
          </div>

          <div className={styles.divider} />
          <p className={styles.footer}>
            {footNote || "Terima kasih sudah berbelanja."}
          </p>
        </article>
      </div>
    </div>
  );
}
