import { Outlet, useLocation, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { Button } from "@/components/ui/button";
import logo from "@/assets/easysea-logo.png";

const routeNames: Record<string, string> = {
  "": "Dashboard",
  "requests": "Richieste Dealer",
  "leads": "Leads",
  "deals": "Deals",
  "pipeline": "Pipeline Deals",
  "organizations": "Organizzazioni",
  "contacts": "Contatti",
  "activities": "Attività",
  "tasks": "Task",
  "analytics": "Analytics",
  "email-templates": "Template Email",
  "automations": "Automazioni",
  "help": "Aiuto",
};

function Breadcrumbs() {
  const location = useLocation();
  const pathParts = location.pathname.replace("/crm", "").split("/").filter(Boolean);

  if (pathParts.length === 0) return null;

  const crumbs: { label: string; path: string }[] = [];
  let currentPath = "/crm";

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    currentPath += `/${part}`;
    const label = routeNames[part];
    if (label) {
      crumbs.push({ label, path: currentPath });
    } else {
      // UUID or dynamic segment — skip label but keep path
      crumbs.push({ label: part.substring(0, 8) + "…", path: currentPath });
    }
  }

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
      <Link to="/crm" className="hover:text-foreground transition-colors">CRM</Link>
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

const CRMLayout = () => {
  const { signOut, user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CRMSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <img src={logo} alt="Easysea" className="h-5 opacity-60" />
              <span className="text-xs font-heading font-semibold text-primary uppercase tracking-wider">CRM</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
                <LogOut size={16} />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Breadcrumbs />
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CRMLayout;
