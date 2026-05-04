import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/access";
import { DashboardSidebar } from "./sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCommonInformation } from "@/actions/common-information";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [userAccess, rawCommonInformation] = await Promise.all([
    getCurrentUserAccess(),
    getCommonInformation(),
  ]);
  const commonInformation = (await rawCommonInformation()).data;
  if (!userAccess) {
    redirect("/login");
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <DashboardSidebar userAccess={userAccess} commonInformation={commonInformation || null} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

