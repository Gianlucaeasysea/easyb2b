import { Outlet, useLocation, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DealerSidebar } from "@/components/portal/DealerSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Bell, ChevronRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ClientModeProvider } from "@/contexts/ClientModeContext";
import { CartProvider } from "@/contexts/CartContext";
import { toast } from "sonner";
import logo from "@/assets/white_logo.png";
import ErrorBoundary from "@/components/ErrorBoundary";

const PortalHeader = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: client } = useQuery({
    queryKey: ["dealer-client", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications-count", client?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("client_notifications")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client!.id)
        .eq("read", false);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!client?.id,
    refetchInterval: 30000,
  });

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!client?.id) return;

    const channel = supabase
      .channel(`dealer-notifications-${client.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_notifications",
          filter: `client_id=eq.${client.id}`,
        },
        (payload) => {
          const n = payload.new as { title?: string; body?: string };
          // Refresh counts and notification list
          queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
          queryClient.invalidateQueries({ queryKey: ["client-notifications"] });
          // Show toast
          toast(n.title || "Nuova notifica", {
            description: n.body ? (n.body.length > 80 ? n.body.substring(0, 80) + "…" : n.body) : undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [client?.id, queryClient]);

  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <img src={logo} alt="Easysea" className="h-5 opacity-70" />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/portal/notifications")}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {displayCount}
            </span>
          )}
        </Button>
        <span className="text-[11px] text-muted-foreground hidden sm:block ml-1 font-heading">{user?.email}</span>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  );
};

const portalRouteNames: Record<string, string> = {
  "catalog": "Catalogo",
  "orders": "Ordini",
  "cart": "Carrello",
  "invoices": "Fatture",
  "profile": "Profilo",
  "notifications": "Notifiche",
  "support": "Supporto",
  "marketing": "Materiali",
  "goals": "Obiettivi",
  "promos": "Promozioni",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function PortalBreadcrumbs() {
  const location = useLocation();
  const pathParts = location.pathname.replace("/portal", "").split("/").filter(Boolean);

  if (pathParts.length === 0) return null;

  const crumbs: { label: string; path: string }[] = [];
  let currentPath = "/portal";

  for (const part of pathParts) {
    currentPath += `/${part}`;
    const label = portalRouteNames[part];
    if (label) {
      crumbs.push({ label, path: currentPath });
    } else if (UUID_RE.test(part) || /^\d+$/.test(part)) {
      crumbs.push({ label: `Dettaglio #${part.substring(0, 8)}…`, path: currentPath });
    } else {
      crumbs.push({ label: part, path: currentPath });
    }
  }

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
      <Link to="/portal" className="hover:text-foreground transition-colors">Portale</Link>
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {i === crumbs.length - 1 ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="hover:text-foreground transition-colors">{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

const PortalLayout = () => {
  return (
    <ClientModeProvider>
      <CartProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <DealerSidebar />
            <div className="flex-1 flex flex-col">
              <PortalHeader />
              <main className="flex-1 p-6 overflow-auto">
                <PortalBreadcrumbs />
                <ErrorBoundary section="dealer portal">
                  <Outlet />
                </ErrorBoundary>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </CartProvider>
    </ClientModeProvider>
  );
};

export default PortalLayout;
