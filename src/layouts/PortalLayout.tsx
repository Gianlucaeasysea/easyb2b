import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DealerSidebar } from "@/components/portal/DealerSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientModeProvider, useClientMode } from "@/contexts/ClientModeContext";
import { CartProvider } from "@/contexts/CartContext";
import logo from "@/assets/easysea-logo.png";

const PortalHeader = () => {
  const { signOut, user } = useAuth();
  const { isClientMode, toggleClientMode } = useClientMode();

  return (
    <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground" />
        <img src={logo} alt="Easysea" className="h-5 opacity-60" />
        {isClientMode && (
          <Badge className="bg-primary/20 text-primary border-0 text-[10px] font-heading animate-pulse">
            CLIENT VIEW
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={isClientMode ? "default" : "outline"}
          size="sm"
          onClick={toggleClientMode}
          className={`text-xs gap-1.5 rounded-lg font-heading font-semibold ${
            isClientMode
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {isClientMode ? <EyeOff size={14} /> : <Eye size={14} />}
          {isClientMode ? "Exit Client Mode" : "Client Mode"}
        </Button>
        <span className="text-xs text-muted-foreground hidden sm:block ml-1">{user?.email}</span>
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
    </ClientModeProvider>
  );
};

export default PortalLayout;
