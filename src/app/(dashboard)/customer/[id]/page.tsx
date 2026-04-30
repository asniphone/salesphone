import { notFound } from "next/navigation";
import { getCustomerWithUnits } from "@/actions/customer";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { CustomerDetailClient } from "./client";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { id } = await params;
  const customerId = parseInt(id, 10);

  if (isNaN(customerId)) {
    notFound();
  }

  const result = await getCustomerWithUnits(customerId);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Detail Customer</h1>
      </header>

      <div className="p-4 md:p-6">
        <CustomerDetailClient customer={result.data} />
      </div>
    </>
  );
}
