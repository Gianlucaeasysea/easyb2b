import { LayoutDashboard, Users, Activity, Building2, HelpCircle, Inbox, UserPlus, Handshake, KanbanSquare, MailPlus, CheckSquare, BarChart3, Zap, Package, Tags } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

type SidebarItem = {
  title: string;
  url: string;
  icon: any;
  badgeKey?: string;
  indent?: boolean;
  adminOnly?: boolean;
};

const items: SidebarItem[] = [
  { title: "Dashboard", url: "/crm", icon: LayoutDashboard },
  { title: "Dealer Requests", url: "/crm/requests", icon: Inbox, badgeKey: "requests" },
  { title: "Leads", url: "/crm/leads", icon: UserPlus },
  { title: "Deals", url: "/crm/deals", icon: Handshake, badgeKey: "expiring_deals" },
  { title: "Deals Pipeline", url: "/crm/deals/pipeline", icon: KanbanSquare, indent: true },
  { title: "Organizations", url: "/crm/organizations", icon: Building2 },
  { title: "Contacts", url: "/crm/contacts", icon: Users },
  { title: "Activities", url: "/crm/activities", icon: Activity },
  { title: "Orders", url: "/crm/orders", icon: Package, badgeKey: "submitted_orders" },
  { title: "Tasks", url: "/crm/tasks", icon: CheckSquare, badgeKey: "overdue_tasks" },
  { title: "Analytics", url: "/crm/analytics", icon: BarChart3 },
  { title: "Email Templates", url: "/crm/email-templates", icon: MailPlus },
  { title: "Price Lists", url: "/crm/price-lists", icon: Tags },
  { title: "Automations", url: "/crm/automations", icon: Zap, adminOnly: true },
  { title: "Help", url: "/crm/help", icon: HelpCircle },
];

export function CRMSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role } = useAuth();

  const { data: newRequestCount } = useQuery({
    queryKey: ["crm-new-requests-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("distributor_requests").select("*", { count: "exact", head: true }).eq("status", "new");
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const { data: overdueTaskCount } = useQuery({
    queryKey: ["crm-overdue-tasks-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("due_date", new Date().toISOString());
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const { data: expiringDealsCount } = useQuery({
    queryKey: ["crm-expiring-deals-count"],
    queryFn: async () => {
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      const { count, error } = await supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .lte("expected_close_date", in7Days.toISOString().split("T")[0])
        .gte("expected_close_date", new Date().toISOString().split("T")[0])
        .not("stage", "in", "(closed_won,closed_lost)");
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const { data: submittedOrdersCount } = useQuery({
    queryKey: ["crm-submitted-orders-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "submitted");
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const badgeCounts: Record<string, { count: number; color: string }> = {
    requests: { count: newRequestCount || 0, color: "bg-blue-500/20 text-blue-600" },
    overdue_tasks: { count: overdueTaskCount || 0, color: "bg-destructive/20 text-destructive" },
    expiring_deals: { count: expiringDealsCount || 0, color: "bg-orange-500/20 text-orange-600" },
    submitted_orders: { count: submittedOrdersCount || 0, color: "bg-blue-500/20 text-blue-600" },
  };

  const visibleItems = items.filter(item => !item.adminOnly || role === "admin");

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sales CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const badge = item.badgeKey ? badgeCounts[item.badgeKey] : null;
                const showBadge = badge && badge.count > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end={item.url === "/crm"} className={`hover:bg-muted/50 ${item.indent ? "pl-8" : ""}`} activeClassName="bg-muted text-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && (
                          <span className="flex items-center gap-2 flex-1">
                            {item.title}
                            {showBadge && (
                              <Badge className={`border-0 text-[10px] px-1.5 py-0 h-4 ml-auto ${badge.color}`}>
                                {badge.count}
                              </Badge>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
