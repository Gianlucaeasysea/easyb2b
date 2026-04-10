import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Send } from "lucide-react";
import { getOrderStatusLabel, getOrderStatusColor, getPaymentStatusLabel, getPaymentStatusColor, getClientStatusLabel } from "@/lib/constants";
import { fmtDate } from "./constants";

interface OrganizationOrdersTabProps {
  orders: any[];
  clientStatus: string;
  onSelectOrder: (id: string) => void;
  onComposeForOrder: (ctx: { orderId: string; orderCode: string; orderStatus: string; orderTotal: number; trackingNumber: string }) => void;
}

export function OrganizationOrdersTab({ orders, clientStatus, onSelectOrder, onComposeForOrder }: OrganizationOrdersTabProps) {
  return (
    <div className="glass-card-solid overflow-hidden">
      {!orders?.length ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
          <p>No orders — client is in {getClientStatusLabel(clientStatus || "lead")}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Code</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Payment</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map(o => (
              <TableRow key={o.id} className="hover:bg-secondary/50 cursor-pointer" onClick={() => onSelectOrder(o.id)}>
                <TableCell className="font-mono text-xs font-semibold text-primary">{(o as any).order_code || `#${o.id.slice(0, 8)}`}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</TableCell>
                <TableCell><Badge className={`border-0 text-[10px] ${getOrderStatusColor(o.status || "draft")}`}>{getOrderStatusLabel(o.status || "draft")}</Badge></TableCell>
                <TableCell>
                  {(o as any).payment_status ? (
                    <Badge className={`border-0 text-[10px] ${getPaymentStatusColor((o as any).payment_status)}`}>{getPaymentStatusLabel((o as any).payment_status)}</Badge>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">€{Number(o.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {
                    e.stopPropagation();
                    onComposeForOrder({ orderId: o.id, orderCode: (o as any).order_code || `#${o.id.slice(0, 8)}`, orderStatus: o.status, orderTotal: o.total_amount, trackingNumber: (o as any).tracking_number });
                  }}><Send size={12} className="text-primary" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
