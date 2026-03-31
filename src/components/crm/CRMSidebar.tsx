import { LayoutDashboard, Users, Target, Activity, Building2, HelpCircle, Inbox, UserPlus, Handshake, KanbanSquare, MailPlus, CheckSquare, BarChart3, Zap } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/crm", icon: LayoutDashboard },
  { title: "Richieste Dealer", url: "/crm/requests", icon: Inbox, badgeKey: "requests" },
  { title: "Leads", url: "/crm/leads", icon: UserPlus },
  { title: "Deals", url: "/crm/deals", icon: Handshake },
  { title: "Deals Pipeline", url: "/crm/deals/pipeline", icon: KanbanSquare, indent: true },
  { title: "Pipeline Clienti", url: "/crm/pipeline", icon: Target },
  { title: "Organizzazioni", url: "/crm/organizations", icon: Building2 },
  { title: "Contatti", url: "/crm/contacts", icon: Users },
  { title: "Attività", url: "/crm/activities", icon: Activity },
  { title: "Task", url: "/crm/tasks", icon: CheckSquare, badgeKey: "overdue_tasks" },
  { title: "Template Email", url: "/crm/email-templates", icon: MailPlus },
  { title: "Analytics", url: "/crm/analytics", icon: BarChart3 },
  { title: "Automazioni", url: "/crm/automations", icon: Zap },
  { title: "Aiuto", url: "/crm/help", icon: HelpCircle },
];

export function CRMSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const { data: newRequestCount } = useQuery({
    queryKey: ["crm-new-requests-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("distributor_requests").select("*", { count: "exact", head: true }).eq("status", "new");
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
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
    refetchInterval: 30000,
  });

  const badgeCounts: Record<string, number> = {
    requests: newRequestCount || 0,
    overdue_tasks: overdueTaskCount || 0,
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sales CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const count = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end={item.url === "/crm"} className={`hover:bg-muted/50 ${(item as any).indent ? "pl-8" : ""}`} activeClassName="bg-muted text-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && (
                          <span className="flex items-center gap-2">
                            {item.title}
                            {count > 0 && (
                              <Badge className={`border-0 text-[10px] px-1.5 py-0 h-4 ${item.badgeKey === "overdue_tasks" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                                {count}
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
