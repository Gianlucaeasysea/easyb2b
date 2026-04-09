import { LayoutDashboard, ShoppingBag, Package, HelpCircle, ShoppingCart, UserCircle, Bell, Receipt } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { CartSavedIndicator } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
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
  { title: "Profile", url: "/portal/profile", icon: UserCircle },
  { title: "Support", url: "/portal/support", icon: HelpCircle },
];

export function DealerSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useAuth();

  const { data: client } = useQuery({
    queryKey: ["my-client-sidebar"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: unreadCount } = useQuery({
    queryKey: ["dealer-unread-notifications-sidebar", client?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("client_notifications")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client!.id)
        .eq("read", false);
      return count || 0;
    },
    enabled: !!client,
    refetchInterval: 30000,
  });

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
                      {!collapsed && item.title === "Notifications" && unreadCount && unreadCount > 0 ? (
                        <Badge className="ml-auto bg-destructive text-destructive-foreground text-[10px] h-5 min-w-5 px-1.5 rounded-full">{unreadCount}</Badge>
                      ) : null}
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
