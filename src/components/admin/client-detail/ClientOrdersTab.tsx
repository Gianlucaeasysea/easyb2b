import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Eye, Send, PackagePlus } from "lucide-react";
import { getOrderStatusLabel, getOrderStatusColor, getPaymentStatusLabel, getPaymentStatusColor } from "@/lib/constants";
import { format } from "date-fns";

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy"); } catch { return "—"; }
};

interface Props {
  orders: any[] | undefined;
  totalOrders: number;
  onSelectOrder: (order: any) => void;
  onComposeFromOrder: (order: any) => void;
  onCreateOrder: () => void;
}

export const ClientOrdersTab = ({ orders, totalOrders, onSelectOrder, onComposeFromOrder, onCreateOrder }: Props) => (
  <div className="glass-card-solid overflow-hidden">
    <div className="p-4 border-b border-border flex items-center justify-between">
      <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><ShoppingBag size={16} /> Order History</h2>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={onCreateOrder}>
          <PackagePlus size={14} /> Create Manual Order
        </Button>
        <Badge variant="outline" className="text-xs">{totalOrders} orders</Badge>
      </div>
    </div>
    {!orders?.length ? (
      <div className="p-8 text-center text-muted-foreground text-sm">No orders yet</div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Order Code</TableHead>
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Payment</TableHead>
            <TableHead className="text-xs">Items</TableHead>
            <TableHead className="text-xs text-right">Total</TableHead>
            <TableHead className="text-xs"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map(o => (
            <TableRow key={o.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => onSelectOrder(o)}>
              <TableCell className="font-mono text-xs font-semibold">{(o as any).order_code || `#${o.id.slice(0, 8)}`}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</TableCell>
              <TableCell><Badge className={`border-0 text-[10px] ${getOrderStatusColor(o.status || "draft")}`}>{getOrderStatusLabel(o.status || "draft")}</Badge></TableCell>
              <TableCell>
                {(o as any).payment_status ? (
                  <Badge className={`border-0 text-[10px] ${getPaymentStatusColor((o as any).payment_status)}`}>{getPaymentStatusLabel((o as any).payment_status)}</Badge>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{(o.order_items as any[])?.length || 0}</TableCell>
              <TableCell className="text-right font-mono text-sm font-semibold">€{Number(o.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Eye size={14} className="text-muted-foreground" />
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {
                    e.stopPropagation();
                    onComposeFromOrder(o);
                  }}>
                    <Send size={12} className="text-primary" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </div>
);
