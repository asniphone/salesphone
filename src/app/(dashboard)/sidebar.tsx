"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Smartphone,
  Users,
  LogOut,
  Package,
  ChevronRight,
  MessageSquare,
  UserCircle,
  HardHat,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/actions/auth";
import type { UserAccess } from "@/lib/access";

type SubMenuItem = { title: string; url: string };

type MenuItem = {
  title: string;
  icon: LucideIcon;
  url?: string;
  items?: SubMenuItem[];
};

interface DashboardSidebarProps {
  userAccess: UserAccess;
}

export function DashboardSidebar({ userAccess }: DashboardSidebarProps) {
  const pathname = usePathname();

  // Build menu items based on access
  const menuItems: MenuItem[] = [];

  if (userAccess.accessDashboardGeneralRead) {
    menuItems.push({
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    });
  }

  // Unit group
  const unitSubItems: SubMenuItem[] = [];
  if (userAccess.accessUnitRead) unitSubItems.push({ title: "Daftar Unit", url: "/unit" });
  if (userAccess.accessUnitReport) unitSubItems.push({ title: "Laporan", url: "/unit/report" });
  if (unitSubItems.length > 0) {
    menuItems.push({ title: "Unit", icon: Smartphone, items: unitSubItems });
  }

  // Accessory group
  const accSubItems: SubMenuItem[] = [];
  if (userAccess.accessAccessoryRead) accSubItems.push({ title: "Daftar Aksesoris", url: "/accessory" });
  if (userAccess.accessAccessorySell) accSubItems.push({ title: "Jual Aksesoris", url: "/accessory/sell" });
  if (userAccess.accessAccessoryHistory) accSubItems.push({ title: "Riwayat Penjualan", url: "/accessory/history-sell" });
  if (userAccess.accessAccessoryReport) accSubItems.push({ title: "Laporan", url: "/accessory/report" });
  if (accSubItems.length > 0) {
    menuItems.push({ title: "Aksesoris", icon: Package, items: accSubItems });
  }

  // Message group
  const msgSubItems: SubMenuItem[] = [];
  if (userAccess.accessMessageHistory) msgSubItems.push({ title: "Riwayat Pesan", url: "/message" });
  if (userAccess.accessMessageSend) msgSubItems.push({ title: "Kirim Pesan", url: "/message/create" });
  if (msgSubItems.length > 0) {
    menuItems.push({ title: "Pesan", icon: MessageSquare, items: msgSubItems });
  }

  // Customer
  if (userAccess.accessCustomerRead) {
    menuItems.push({ title: "Customer", url: "/customer", icon: Users });
  }

  // User
  if (userAccess.accessUserRead) {
    menuItems.push({ title: "User", url: "/user", icon: UserCircle });
  }

  // Worker group
  const workerSubItems: SubMenuItem[] = [];
  if (userAccess.accessWorkerRead) workerSubItems.push({ title: "Daftar Worker", url: "/worker" });
  if (userAccess.accessWorkerReport) workerSubItems.push({ title: "Laporan", url: "/worker/report" });
  if (workerSubItems.length > 0) {
    menuItems.push({ title: "Worker", icon: HardHat, items: workerSubItems });
  }

  // Information
  if (userAccess.accessInformationRead) {
    menuItems.push({ title: "Informasi", url: "/information", icon: Store });
  }

  // Cashflow
  if (userAccess.accessCashflowRead) {
    menuItems.push({ title: "Arus Kas Operasional", url: "/cashflow", icon: Wallet });
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">POS Internal</span>
            <span className="text-xs text-muted-foreground">v0.1.0</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActiveGroup = Boolean(
                  item.items?.some((subItem) => pathname.startsWith(subItem.url)) ||
                  (item.url && pathname.startsWith(item.url))
                );

                if (item.items) {
                  return (
                    <Collapsible
                      key={item.title}
                      defaultOpen={isActiveGroup}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title}>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === subItem.url || (pathname.startsWith(subItem.url) && subItem.url !== "/unit" && subItem.url !== "/accessory")}
                                >
                                  <Link href={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.url as string)}
                      tooltip={item.title}
                    >
                      <Link href={item.url as string}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1">
          <p className="truncate text-xs text-muted-foreground">{userAccess.email}</p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Profil" isActive={pathname === "/profile"}>
              <Link href="/profile">
                <UserCircle />
                <span>Profil</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logout}>
              <SidebarMenuButton asChild tooltip="Keluar">
                <button type="submit">
                  <LogOut />
                  <span>Keluar</span>
                </button>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
