import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ExternalLink, Clock, CheckCircle, Truck, Package, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import OrderDocuments from "@/components/OrderDocuments";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "text-muted-foreground border-muted", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-chart-4 border-chart-4", icon: CheckCircle },
  shipped: { label: "Shipped", color: "text-primary border-primary", icon: Truck },
  delivered: { label: "Delivered", color: "text-success border-success", icon: Package },
};

const DealerOrders = () => {
  const { user } = useAuth();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders-full"],
    queryFn: async () => {
      if (!client) return [];
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name, sku))")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!client,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Orders</h1>
          <p className="text-sm text-muted-foreground">View and track all your B2B orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{orders?.length || 0} orders</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading orders...</div>
      ) : !orders?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <ShoppingBag className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No orders yet. Browse the catalog to place your first order.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const cfg = statusConfig[order.status || "draft"];
            const Icon = cfg?.icon || Clock;
            const isExpanded = expandedOrder === order.id;

            return (
              <div key={order.id} className="glass-card-solid overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <Icon size={20} className={cfg?.color?.split(" ")[0]} />
                    <div>
                      <p className="font-heading font-semibold text-foreground">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className={`text-xs ${cfg?.color}`}>{cfg?.label}</Badge>
                    <span className="font-heading font-bold text-foreground">€{Number(order.total_amount || 0).toFixed(2)}</span>
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Tracking */}
                    {order.tracking_number && (
                      <div className="px-4 py-3 bg-secondary/30 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-muted-foreground">Tracking: </span>
                          <span className="text-xs font-mono font-semibold text-foreground">{order.tracking_number}</span>
                        </div>
                        {order.tracking_url && (
                          <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
                              Track shipment <ExternalLink size={12} />
                            </Button>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {order.notes && (
                      <div className="px-4 py-2 bg-secondary/20">
                        <p className="text-xs text-muted-foreground">Note: {order.notes}</p>
                      </div>
                    )}

                    {/* Items */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Product</TableHead>
                          <TableHead className="text-xs text-right">Qty</TableHead>
                          <TableHead className="text-xs text-right">Unit Price</TableHead>
                          <TableHead className="text-xs text-right">Discount</TableHead>
                          <TableHead className="text-xs text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(order.order_items as any[])?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <p className="text-sm font-heading font-semibold text-foreground">{item.products?.name || "—"}</p>
                              <p className="text-xs text-muted-foreground font-mono">{item.products?.sku}</p>
                            </TableCell>
                            <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">€{Number(item.unit_price).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm text-success">{item.discount_pct ? `-${item.discount_pct}%` : "—"}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">€{Number(item.subtotal).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="px-4 py-3 border-t border-border flex justify-end">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground mr-3">Total</span>
                        <span className="font-heading text-lg font-bold text-foreground">€{Number(order.total_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DealerOrders;
