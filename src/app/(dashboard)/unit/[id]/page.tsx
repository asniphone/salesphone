import { notFound } from "next/navigation";
import { getUnitWithLogs } from "@/actions/unit";
import { getCustomers } from "@/actions/customer";
import { getActiveWorkers } from "@/actions/worker";
import { getCommonInformation } from "@/actions/common-information";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { UnitDetailClient } from "./client";
import { UnitReceiptPrintButton } from "./receipt-print-button";

interface UnitDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UnitDetailPage({ params }: UnitDetailPageProps) {
  const { id } = await params;
  const unitId = parseInt(id, 10);

  if (isNaN(unitId)) {
    notFound();
  }

  const [unitResult, customerResult, workerResult, commonInformationResult] = await Promise.all([
    getUnitWithLogs(unitId),
    getCustomers(),
    getActiveWorkers(),
    getCommonInformation(),
  ]);

  if (!unitResult.success || !unitResult.data) {
    notFound();
  }

  const canPrintReceipt =
    unitResult.data.status === "SOLD" && unitResult.data.customer !== null;

  const storeInformation = commonInformationResult.data ?? {
    storeName: "POS Internal",
    storeAddress: "-",
    storePhone: "-",
    storeLogo: null,
    footNoteReceipt: null,
    unitFeePercentage: 30,
  };

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-sm font-semibold">Detail Unit</h1>
        </div>
        {canPrintReceipt && (
          <UnitReceiptPrintButton
            unit={{
              id: unitResult.data.id,
              name: unitResult.data.name,
              imei: unitResult.data.imei,
              soldAt: unitResult.data.soldAt
                ? new Date(unitResult.data.soldAt).toISOString()
                : null,
              soldPrice: unitResult.data.soldPrice,
              dpAmount: unitResult.data.dpAmount,
              paymentType: unitResult.data.paymentType,
              customer: {
                name: unitResult.data.customer!.name,
                phone: unitResult.data.customer!.phone,
              },
              worker: unitResult.data.worker
                ? { name: unitResult.data.worker.name }
                : null,
              workerFee: unitResult.data.workerFee,
            }}
            storeInformation={{
              storeName: storeInformation.storeName,
              storeAddress: storeInformation.storeAddress,
              storePhone: storeInformation.storePhone,
              storeLogo: storeInformation.storeLogo,
              footNoteReceipt: storeInformation.footNoteReceipt,
            }}
          />
        )}
      </header>

      <div className="p-4 md:p-6">
        <UnitDetailClient
          unit={unitResult.data}
          customers={customerResult.data ?? []}
          workers={workerResult.data ?? []}
          unitFeePercentage={storeInformation.unitFeePercentage}
        />
      </div>
    </>
  );
}
