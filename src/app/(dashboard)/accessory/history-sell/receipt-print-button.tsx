"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import styles from "./receipt-print-button.module.css";
import type { AccessorySaleHistoryData } from "@/actions/accessory";

interface StoreInformation {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeLogo: string | null;
  footNoteReceipt: string | null;
}

interface Props {
  sale: AccessorySaleHistoryData;
  storeInformation: StoreInformation;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: Date | null | string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AccessoryReceiptPrintButton({ sale, storeInformation }: Props) {
  const footNote = storeInformation.footNoteReceipt?.trim();

  // Accessory sales are assumed to be fully paid via cash (or some default mechanism if not specified)
  const paymentTypeLabel = "CASH";

  // Calculate total items and total qty
  const totalItemCount = sale.items.length;
  const totalQtyCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);

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
            <span className={styles.tableValue}>SA{sale.id.toString().padStart(8, "0")}</span>
          </div>
          <div className={styles.tableHeader}>
            <span className={styles.tableLabel}>Tanggal</span>
            <span>:</span>
            <span className={styles.tableValue}>{formatDateTime(sale.createdAt)}</span>
          </div>
          <div className={styles.tableHeader}>
            <span className={styles.tableLabel}>Kasir</span>
            <span>:</span>
            <span className={styles.tableValue}>Kasir 1</span>
          </div>
          <div className={styles.tableHeader}>
            <span className={styles.tableLabel}>Customer</span>
            <span>:</span>
            <span className={styles.tableValue}>{sale.customer.name}</span>
          </div>
          <div className={styles.tableHeader}>
            <span className={styles.tableLabel}>Email</span>
            <span>:</span>
            <span className={styles.tableValue}>-</span>
          </div>
          <div className={styles.tableHeader}>
            <span className={styles.tableLabel}>HP</span>
            <span>:</span>
            <span className={styles.tableValue}>{sale.customer.phone || "-"}</span>
          </div>
          <div className={styles.tableHeader}>
            <span className={styles.tableLabel}>ID Card</span>
            <span>:</span>
            <span className={styles.tableValue}>-</span>
          </div>

          <div className={styles.divider} />

          {sale.items.map((item, index) => (
            <div key={item.id} className={styles.itemGrid}>
              <span className={styles.itemNumber}>{index + 1} .</span>
              <div className={styles.itemDetails}>
                <p className={styles.itemName}>{item.accessory.name}</p>
                <div className={styles.itemPriceRow}>
                  <span className={styles.itemQty}>{item.quantity} Pcs</span>
                  <span className={styles.itemPrice}>{formatCurrency(item.sellPricePerUnit)}</span>
                  <span className={styles.itemTotal}>{formatCurrency(item.sellPricePerUnit * item.quantity)}</span>
                </div>
                {/* <span className={styles.textMuted}>Disc: 0,00</span> */}
              </div>
            </div>
          ))}

          <div className={styles.divider} />

          <div className={styles.rowFlex}>
            <span>Total Item = {totalItemCount}</span>
            <span>Total Qty = {totalQtyCount}</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.totalsGrid}>
            <span className={styles.totalsLabel}>Grand Total</span>
            <span>:</span>
            <span className={styles.totalsValue}>{formatCurrency(sale.totalPrice)}</span>
          </div>
          <div className={styles.totalsGrid}>
            <span className={styles.totalsLabel}>Bayar</span>
            <span>:</span>
            <span className={styles.totalsValue}>{formatCurrency(sale.totalPrice)}</span>
          </div>
          {/* <div className={styles.totalsGrid}>
            <span className={styles.totalsLabel}>Uang Kembalian</span>
            <span>:</span>
            <span className={styles.totalsValue}>0,00</span>
          </div> */}
          {/* <div className={styles.totalsGrid}>
            <span className={styles.totalsLabel}>Ret Amt</span>
            <span>:</span>
            <span className={styles.totalsValue}>0</span>
          </div> */}

          <div className={styles.paymentSection}>
            <span>Pembayaran</span>
            <div className={styles.itemGrid}>
              <span className={styles.itemNumber}>1</span>
              <div className={styles.itemDetails}>
                <div className={styles.paymentRow}>
                  <span>-</span>
                  <span>{formatCurrency(sale.totalPrice)}</span>
                </div>
                <span className={styles.paymentMethod}>{paymentTypeLabel}</span>
              </div>
            </div>
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
