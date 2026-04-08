import { LayoutDashboard, ShoppingBag, Package, Trophy, Megaphone, HelpCircle, FileImage, ShoppingCart, UserCircle, Bell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  { title: "Promotions", url: "/portal/promos", icon: Megaphone },
  { title: "Goals & Rewards", url: "/portal/goals", icon: Trophy, key: "goals" },
  { title: "Marketing", url: "/portal/marketing", icon: FileImage },
  { title: "Notifications", url: "/portal/notifications", icon: Bell },
  { title: "My Profile", url: "/portal/profile", icon: UserCircle },
  { title: "Support", url: "/portal/support", icon: HelpCircle },
];

export function DealerSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();

  const { data: client } = useQuery({
    queryKey: ["my-client-visibility"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("show_discount_tiers, show_goals").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const items = allItems.filter(item => {
    if (item.key === "goals" && client && !(client as any).show_goals) return false;
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dealer Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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