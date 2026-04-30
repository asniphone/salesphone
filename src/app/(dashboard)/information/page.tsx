import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getCommonInformation } from "@/actions/common-information";
import { CommonInformationClient } from "./client";

export default async function InformationPage() {
  const result = await getCommonInformation();

  const information = result.data ?? {
    storeName: "",
    storeAddress: "",
    storePhone: "",
    storeLogo: null,
    footNoteReceipt: null,
    unitFeePercentage: 30,
  };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Informasi</h1>
      </header>

      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Informasi Toko</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola nama toko, alamat, kontak, catatan receipt, dan persentase fee unit.
          </p>
        </div>

        <CommonInformationClient initialData={information} />
      </div>
    </>
  );
}
