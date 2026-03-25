import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingBag, TrendingUp, Trophy, ArrowUpRight, Clock, CheckCircle, Truck, CreditCard, FileText, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "text-muted-foreground border-muted", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-chart-4 border-chart-4", icon: CheckCircle },
  shipped: { label: "Shipped", color: "text-primary border-primary", icon: Truck },
  delivered: { label: "Delivered", color: "text-success border-success", icon: CheckCircle },
};

const DealerDashboard = () => {
  const { user } = useAuth();

  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      if (!client) return [];
      const { data } = await supabase.from("orders").select("*, order_items(*)").eq("client_id", client.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!client,
  });

  const { data: productCount } = useQuery({
    queryKey: ["product-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("active_b2b", true);
      return count || 0;
    },
  });

  // Assigned price list
  const { data: priceList } = useQuery({
    queryKey: ["my-price-list", client?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("price_lists")
        .select("*, discount_tiers(label, discount_pct)")
        .eq("client_id", client!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!client,
  });

  const activeOrders = orders?.filter(o => o.status !== "delivered" && o.status !== "draft") || [];
  const totalSpent = orders?.filter(o => o.status !== "draft").reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;

  // Open invoices = orders that are delivered or confirmed but NOT payed
  const openInvoices = orders?.filter(o => o.status !== "draft" && o.payment_status !== "paid" && o.payment_status !== "Payed") || [];
  const openInvoiceTotal = openInvoices.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const monthlyTarget = 5000;
  const monthlyProgress = Math.min((totalSpent / monthlyTarget) * 100, 100);
  const discountClass = client?.discount_class || "standard";
  const discountPct = { gold: 30, silver: 20, bronze: 15, standard: 10, A: 35, B: 25, C: 20, D: 10 }[discountClass] || 10;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">{client?.company_name || user?.email}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card-solid p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
              <TrendingUp className="text-primary-foreground" size={18} />
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Discount Tier</span>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">Class {discountClass}</p>
          <p className="text-xs text-muted-foreground mt-1">-{discountPct}% on all products</p>
        </div>

        <div className="glass-card-solid p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
              <ShoppingBag className="text-primary-foreground" size={18} />
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Active Orders</span>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{activeOrders.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{orders?.length || 0} total orders</p>
        </div>

        <div className="glass-card-solid p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
              <FileText className="text-primary-foreground" size={18} />
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Open Invoices</span>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{openInvoices.length}</p>
          <p className="text-xs text-muted-foreground mt-1">€{openInvoiceTotal.toLocaleString()} outstanding</p>
        </div>

        <div className="glass-card-solid p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
              <Package className="text-primary-foreground" size={18} />
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Catalog</span>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{productCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Products available</p>
        </div>
      </div>

      {/* Assigned Price List & Financial Summary */}
      <div className="grid lg:grid-cols-2 gap-4 mb-8">
        <div className="glass-card-solid p-6">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={16} className="text-primary" />
            <h2 className="font-heading font-bold text-foreground text-sm">Assigned Price List</h2>
          </div>
          {priceList ? (
            <div>
              <p className="text-foreground font-heading font-semibold">{priceList.name}</p>
              {priceList.description && <p className="text-xs text-muted-foreground mt-1">{priceList.description}</p>}
              {(priceList as any).discount_tiers && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {(priceList as any).discount_tiers.label} — {(priceList as any).discount_tiers.discount_pct}% discount
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Standard pricing applied (Class {discountClass})</p>
          )}
        </div>

        <div className="glass-card-solid p-6">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-primary" />
            <h2 className="font-heading font-bold text-foreground text-sm">Financial Summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total Ordered</p>
              <p className="font-heading font-bold text-foreground">€{totalSpent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="font-heading font-bold text-warning">€{openInvoiceTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Goal Progress */}
      <div className="glass-card-solid p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-bold text-foreground">🏆 Monthly Goal</h2>
          <Link to="/portal/goals" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all goals <ArrowUpRight size={12} />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {totalSpent >= monthlyTarget
            ? "Congratulations! You've reached your monthly target! 🎉"
            : `You need €${(monthlyTarget - totalSpent).toLocaleString()} more to unlock an extra 5% discount on your next order!`}
        </p>
        <div className="w-full bg-secondary rounded-full h-3">
          <div className="gradient-blue h-3 rounded-full transition-all duration-500" style={{ width: `${monthlyProgress}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">€{totalSpent.toLocaleString()} / €{monthlyTarget.toLocaleString()}</p>
      </div>

      {/* Recent Orders */}
      <div className="glass-card-solid p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-bold text-foreground">Recent Orders</h2>
          <Link to="/portal/orders" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowUpRight size={12} />
          </Link>
        </div>
        {!orders?.length ? (
          <p className="text-sm text-muted-foreground py-4">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map(order => {
              const cfg = statusConfig[order.status || "draft"];
              const Icon = cfg?.icon || Clock;
              return (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={cfg?.color?.split(" ")[0]} />
                    <div>
                      <p className="text-sm font-heading font-semibold text-foreground">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), "dd MMM yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`text-xs ${cfg?.color}`}>{cfg?.label}</Badge>
                    <span className="font-heading font-bold text-foreground text-sm">€{Number(order.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealerDashboard;
