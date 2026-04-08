import { LayoutDashboard, Users, Package, ShoppingBag, FileText, Settings, Upload, Tag, Map, FileImage, PackagePlus, Globe, Zap, ClipboardList, History } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useNewOrderNotifications } from "@/hooks/useNewOrderNotifications";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Orders", url: "/admin/orders", icon: ShoppingBag, badge: true },
  { title: "Nuovi Ordini", url: "/admin/new-orders", icon: PackagePlus },
  { title: "Dealer Requests", url: "/admin/requests", icon: FileText },
  { title: "Marketing Materials", url: "/admin/marketing", icon: FileImage },
  { title: "Importa Dati", url: "/admin/import", icon: Upload },
  { title: "Listini & Sconti", url: "/admin/price-lists", icon: Tag },
  { title: "System Map", url: "/admin/system-map", icon: Map },
  { title: "CMS / Pagine", url: "/admin/cms", icon: Globe },
  { title: "Automazioni", url: "/admin/automations", icon: Zap },
  { title: "Changelog", url: "/admin/changelog", icon: ClipboardList },
  { title: "Log Attività", url: "/admin/audit-log", icon: History },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { newOrderCount, resetCount } = useNewOrderNotifications();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-muted/50 relative"
                      activeClassName="bg-muted text-primary font-medium"
                      onClick={() => {
                        if (item.badge && item.url === "/admin/orders") resetCount();
                      }}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                      {item.badge && newOrderCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold animate-pulse">
                          {newOrderCount}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
