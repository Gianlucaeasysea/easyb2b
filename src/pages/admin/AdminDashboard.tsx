import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingBag, Package, FileText, TrendingUp, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) => (
  <div className="glass-card-solid p-6">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
        <Icon className="text-primary-foreground" size={18} />
      </div>
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">{label}</span>
    </div>
    <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-chart-4/20 text-chart-4",
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
};

const AdminDashboard = () => {
  const { data: clients } = useQuery({
    queryKey: ["admin-clients-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*");
      return data || [];
    },
  });
  const { data: orders } = useQuery({
    queryKey: ["admin-orders-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, clients(company_name)").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });
  const { data: requestCount } = useQuery({
    queryKey: ["admin-request-count"],
    queryFn: async () => {
      const { count } = await supabase.from("distributor_requests").select("*", { count: "exact", head: true }).eq("status", "new");
      return count || 0;
    },
  });
  const { data: productCount } = useQuery({
    queryKey: ["admin-product-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const totalRevenue = orders?.filter(o => o.status !== "draft").reduce((s, o) => s + Number(o.total_amount || 0), 0) || 0;
  const activeClients = clients?.filter(c => c.status === "active").length || 0;
  const countries = [...new Set(clients?.map(c => c.country).filter(Boolean))].length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Easysea B2B Platform Overview</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Active Clients" value={String(activeClients)} sub={`${clients?.length || 0} total · ${countries} countries`} />
        <StatCard icon={ShoppingBag} label="Total Orders" value={String(orders?.length || 0)} sub={`€${totalRevenue.toLocaleString()} revenue`} />
        <StatCard icon={FileText} label="New Requests" value={String(requestCount ?? 0)} sub="Awaiting review" />
        <StatCard icon={Package} label="Products" value={String(productCount ?? 0)} sub="Active in B2B catalog" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="glass-card-solid p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><ShoppingBag size={16} /> Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {orders?.slice(0, 6).map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-heading font-semibold text-foreground">{(o as any).clients?.company_name}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(o.created_at), "dd MMM yyyy")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`border-0 text-[10px] ${statusColors[o.status || "draft"]}`}>{o.status}</Badge>
                  <span className="font-mono text-sm font-semibold text-foreground">€{Number(o.total_amount || 0).toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client Distribution */}
        <div className="glass-card-solid p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><Globe size={16} /> Clients by Region</h2>
            <Link to="/admin/clients" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {Object.entries(
              (clients || []).reduce<Record<string, { count: number; active: number }>>((acc, c) => {
                const zone = c.zone || "Other";
                if (!acc[zone]) acc[zone] = { count: 0, active: 0 };
                acc[zone].count++;
                if (c.status === "active") acc[zone].active++;
                return acc;
              }, {})
            )
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([zone, stats]) => (
                <div key={zone} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{zone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{stats.active} active</span>
                    <Badge variant="outline" className="text-[10px]">{stats.count}</Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
