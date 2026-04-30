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

type MenuItem = {
  title: string;
  icon: LucideIcon;
  url?: string;
  items?: { title: string; url: string }[];
};

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Unit",
    icon: Smartphone,
    items: [
      { title: "Daftar Unit", url: "/unit" },
      { title: "Laporan", url: "/unit/report" },
    ],
  },
  {
    title: "Aksesoris",
    icon: Package,
    items: [
      { title: "Daftar Aksesoris", url: "/accessory" },
      { title: "Jual Aksesoris", url: "/accessory/sell" },
      { title: "Riwayat Penjualan", url: "/accessory/history-sell" },
      { title: "Laporan", url: "/accessory/report" },
    ],
  },
  {
    title: "Pesan",
    icon: MessageSquare,
    items: [
      { title: "Riwayat Pesan", url: "/message" },
      { title: "Kirim Pesan", url: "/message/create" },
    ],
  },
  {
    title: "Customer",
    url: "/customer",
    icon: Users,
  },
  {
    title: "User",
    url: "/user",
    icon: UserCircle,
  },
  {
    title: "Worker",
    icon: HardHat,
    items: [
      { title: "Daftar Worker", url: "/worker" },
      { title: "Laporan", url: "/worker/report" },
    ],
  },
  {
    title: "Informasi",
    url: "/information",
    icon: Store,
  },
  {
    title: "Arus Kas Operasional",
    url: "/cashflow",
    icon: Wallet,
  },
];

interface DashboardSidebarProps {
  email: string;
}

export function DashboardSidebar({ email }: DashboardSidebarProps) {
  const pathname = usePathname();

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
          <p className="truncate text-xs text-muted-foreground">{email}</p>
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
