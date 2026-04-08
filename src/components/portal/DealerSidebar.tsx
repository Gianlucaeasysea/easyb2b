import { LayoutDashboard, ShoppingBag, Package, HelpCircle, ShoppingCart, UserCircle, Bell, Receipt } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { CartSavedIndicator } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { CartSavedIndicator } from "@/contexts/CartContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const allItems = [
  { title: "Dashboard", url: "/portal", icon: LayoutDashboard },
  { title: "Catalog", url: "/portal/catalog", icon: Package },
  { title: "Cart", url: "/portal/cart", icon: ShoppingCart },
  { title: "My Orders", url: "/portal/orders", icon: ShoppingBag },
  { title: "Invoices", url: "/portal/invoices", icon: Receipt },
  { title: "Notifications", url: "/portal/notifications", icon: Bell },
  { title: "My Profile", url: "/portal/profile", icon: UserCircle },
  { title: "Support", url: "/portal/support", icon: HelpCircle },
];

export function DealerSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dealer Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/portal"} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                      {!collapsed && item.title === "Cart" && <CartSavedIndicator />}
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