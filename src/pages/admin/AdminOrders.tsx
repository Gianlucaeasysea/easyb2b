import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/20 text-primary",
  confirmed: "bg-success/20 text-success",
  processing: "bg-warning/20 text-warning",
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
};

const AdminOrders = () => {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, clients(company_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Orders</h1>
      <p className="text-sm text-muted-foreground mb-8">Manage and track all B2B orders</p>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !orders?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <ShoppingBag className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No orders yet.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-heading font-semibold">{(o as any).clients?.company_name}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${statusColors[o.status || "draft"]}`}>{o.status}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">€{Number(o.total_amount).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
