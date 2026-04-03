import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DealerSidebar } from "@/components/portal/DealerSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Eye, EyeOff, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientModeProvider, useClientMode } from "@/contexts/ClientModeContext";
import { CartProvider } from "@/contexts/CartContext";
import logo from "@/assets/white_logo.png";

const PortalHeader = () => {
  const { signOut, user } = useAuth();
  const { isClientMode, toggleClientMode } = useClientMode();
  const navigate = useNavigate();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("client_notifications")
        .select("*", { count: "exact", head: true })
        .eq("read", false);
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  return (
    <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <img src={logo} alt="Easysea" className="h-5 opacity-70" />
        {isClientMode && (
          <Badge className="bg-primary/15 text-primary border-0 text-[10px] font-heading font-bold animate-pulse">
            CLIENT VIEW
          </Badge>
        )}
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
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full gradient-blue text-primary-foreground text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
        <Button
          variant={isClientMode ? "default" : "outline"}
          size="sm"
          onClick={toggleClientMode}
          className={`text-xs gap-1.5 rounded-full font-heading font-semibold ${
            isClientMode
              ? "gradient-blue text-primary-foreground hover:opacity-90"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {isClientMode ? <EyeOff size={14} /> : <Eye size={14} />}
          {isClientMode ? "Exit Client Mode" : "Client Mode"}
        </Button>
        <span className="text-[11px] text-muted-foreground hidden sm:block ml-1 font-heading">{user?.email}</span>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  );
};

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
                <Outlet />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </CartProvider>
    </ClientModeProvider>
  );
};

export default PortalLayout;
