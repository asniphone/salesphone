import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/access";
import { DashboardSidebar } from "./sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userAccess = await getCurrentUserAccess();
  if (!userAccess) {
    redirect("/login");
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <DashboardSidebar userAccess={userAccess} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

