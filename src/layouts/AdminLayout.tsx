import { Outlet, useLocation, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import logo from "@/assets/easysea-logo.png";

const adminRouteNames: Record<string, string> = {
  "orders": "Orders",
  "clients": "Clients",
  "products": "Products",
  "requests": "Requests",
  "price-lists": "Price Lists",
  "settings": "Settings",
  "marketing": "Marketing",
  "changelog": "Changelog",
  "import": "Import",
  "cms": "CMS",
  "new-orders": "New Orders",
  "system-map": "System Map",
  "notifications": "Notifications",
  "audit-log": "Audit Log",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function AdminBreadcrumbs() {
  const location = useLocation();
  const pathParts = location.pathname.replace("/admin", "").split("/").filter(Boolean);

  if (pathParts.length === 0) return null;

  const crumbs: { label: string; path: string }[] = [];
  let currentPath = "/admin";

  for (const part of pathParts) {
    currentPath += `/${part}`;
    const label = adminRouteNames[part];
    if (label) {
      crumbs.push({ label, path: currentPath });
    } else if (UUID_RE.test(part) || /^\d+$/.test(part)) {
      crumbs.push({ label: `Detail #${part.substring(0, 8)}…`, path: currentPath });
    } else {
      crumbs.push({ label: part, path: currentPath });
    }
  }

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
      <Link to="/admin" className="hover:text-foreground transition-colors">Admin</Link>
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

const AdminLayout = () => {
  const { signOut, user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <img src={logo} alt="Easysea" className="h-5 opacity-60" />
              <span className="text-xs font-heading font-semibold text-primary uppercase tracking-wider">Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationsDropdown basePath="/admin" targetRole="admin" />
              <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
                <LogOut size={16} />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <AdminBreadcrumbs />
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
