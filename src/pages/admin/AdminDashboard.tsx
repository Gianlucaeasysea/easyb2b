import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingBag, Package, FileText } from "lucide-react";

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="glass-card-solid p-6">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
        <Icon className="text-primary-foreground" size={18} />
      </div>
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">{label}</span>
    </div>
    <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
  </div>
);

const AdminDashboard = () => {
  const { data: clientCount } = useQuery({
    queryKey: ["admin-client-count"],
    queryFn: async () => {
      const { count } = await supabase.from("clients").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });
  const { data: orderCount } = useQuery({
    queryKey: ["admin-order-count"],
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });
  const { data: requestCount } = useQuery({
    queryKey: ["admin-request-count"],
    queryFn: async () => {
      const { count } = await supabase.from("distributor_requests").select("*", { count: "exact", head: true }).eq("status", "new");
      return count || 0;
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Easysea B2B Platform Overview</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Clients" value={String(clientCount ?? 0)} />
        <StatCard icon={ShoppingBag} label="Total Orders" value={String(orderCount ?? 0)} />
        <StatCard icon={FileText} label="New Requests" value={String(requestCount ?? 0)} />
        <StatCard icon={Package} label="Products" value="—" />
      </div>
    </div>
  );
};

export default AdminDashboard;
