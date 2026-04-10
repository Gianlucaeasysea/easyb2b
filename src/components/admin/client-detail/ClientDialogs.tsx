import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, RefreshCw, PackagePlus, X } from "lucide-react";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/constants";
import { format } from "date-fns";
import { ComposeEmailDialog } from "@/components/crm/ComposeEmailDialog";

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy"); } catch { return "—"; }
};

interface OrderDetailDialogProps {
  selectedOrder: any;
  onClose: () => void;
  onOpenFull: (id: string) => void;
}

export const OrderDetailDialog = ({ selectedOrder, onClose, onOpenFull }: OrderDetailDialogProps) => (
  <Dialog open={!!selectedOrder} onOpenChange={() => onClose()}>
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      {selectedOrder && (
        <>
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Order {(selectedOrder as any).order_code || `#${selectedOrder.id.slice(0, 8)}`}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {fmtDate(selectedOrder.created_at)} · <Badge className={`border-0 text-[10px] ${getOrderStatusColor(selectedOrder.status || "draft")}`}>{getOrderStatusLabel(selectedOrder.status || "draft")}</Badge>
            </p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-sm my-4">
            <div><p className="text-muted-foreground text-xs">Payment</p><p className="font-semibold">{(selectedOrder as any).payment_status || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Shipping</p><p className="font-semibold">€{Number((selectedOrder as any).shipping_cost_client || 0).toFixed(2)}</p></div>
            <div><p className="text-muted-foreground text-xs">Payed Date</p><p className="font-semibold">{fmtDate((selectedOrder as any).payed_date)}</p></div>
            <div><p className="text-muted-foreground text-xs">Delivery Date</p><p className="font-semibold">{fmtDate((selectedOrder as any).delivery_date)}</p></div>
          </div>
          {selectedOrder.notes && (
            <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{selectedOrder.notes}</p>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Product</TableHead>
                <TableHead className="text-xs text-right">Qty</TableHead>
                <TableHead className="text-xs text-right">Unit Price</TableHead>
                <TableHead className="text-xs text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {((selectedOrder.order_items || []) as any[]).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="text-sm font-semibold">{item.products?.name || "—"}</p>
                    {item.products?.sku && <p className="text-xs text-muted-foreground font-mono">{item.products.sku}</p>}
                  </TableCell>
                  <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-right text-sm">€{Number(item.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">€{Number(item.subtotal).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
            <span className="text-sm text-muted-foreground">Products Total</span>
            <span className="font-heading text-lg font-bold">€{Number(selectedOrder.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
          {Number((selectedOrder as any).shipping_cost_client || 0) > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">+ Shipping</span>
              <span className="text-sm text-muted-foreground">€{Number((selectedOrder as any).shipping_cost_client).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => { onClose(); onOpenFull(selectedOrder.id); }}>
              Open Full Detail
            </Button>
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
);

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: any;
  accountPassword: string;
  setAccountPassword: (v: string) => void;
  generatePassword: () => string;
  creatingAccount: boolean;
  createDealerAccount: () => void;
}

export const CreateAccountDialog = ({ open, onOpenChange, client, accountPassword, setAccountPassword, generatePassword, creatingAccount, createDealerAccount }: CreateAccountDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle>Crea Account Dealer</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input value={client?.email || ""} disabled className="mt-1 bg-secondary border-border rounded-lg" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Password</Label>
          <div className="flex gap-2">
            <Input value={accountPassword} onChange={e => setAccountPassword(e.target.value)} className="mt-1 bg-secondary border-border rounded-lg font-mono flex-1" />
            <Button variant="outline" size="sm" className="mt-1 shrink-0" onClick={() => setAccountPassword(generatePassword())} title="Regenerate">
              <RefreshCw size={14} />
            </Button>
          </div>
          {accountPassword.length < 10 && <p className="text-[11px] text-destructive">Min 10 characters</p>}
        </div>
        <Button onClick={createDealerAccount} disabled={creatingAccount || accountPassword.length < 10} className="w-full gap-1">
          <UserPlus size={14} /> {creatingAccount ? "Creazione..." : "Crea Account"}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: any;
  products: any[] | undefined;
  orderItems: { product_id: string; quantity: number; unit_price: number }[];
  setOrderItems: React.Dispatch<React.SetStateAction<{ product_id: string; quantity: number; unit_price: number }[]>>;
  newOrderNotes: string;
  setNewOrderNotes: (v: string) => void;
  creatingOrder: boolean;
  createManualOrder: () => void;
}

export const CreateOrderDialog = ({ open, onOpenChange, client, products, orderItems, setOrderItems, newOrderNotes, setNewOrderNotes, creatingOrder, createManualOrder }: CreateOrderDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle className="font-heading">Crea Ordine Manuale</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Crea un ordine manuale per <strong>{client?.company_name}</strong></p>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase">Aggiungi Prodotti</Label>
          <Select onValueChange={v => {
            const prod = products?.find(p => p.id === v);
            if (prod && !orderItems.find(i => i.product_id === v)) {
              setOrderItems(prev => [...prev, { product_id: v, quantity: 1, unit_price: Number(prod.price || 0) }]);
            }
          }}>
            <SelectTrigger className="bg-secondary border-border rounded-lg"><SelectValue placeholder="Seleziona prodotto..." /></SelectTrigger>
            <SelectContent>
              {products?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ""} — €{Number(p.price || 0).toFixed(2)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {orderItems.length > 0 && (
          <div className="space-y-2">
            {orderItems.map((item, idx) => {
              const prod = products?.find(p => p.id === item.product_id);
              return (
                <div key={idx} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{prod?.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{prod?.sku}</p>
                  </div>
                  <Input type="number" min={1} value={item.quantity}
                    onChange={e => setOrderItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: parseInt(e.target.value) || 1 } : it))}
                    className="w-16 h-8 text-sm bg-background border-border rounded-lg text-center" />
                  <Input type="number" min={0} step={0.01} value={item.unit_price}
                    onChange={e => setOrderItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_price: parseFloat(e.target.value) || 0 } : it))}
                    className="w-24 h-8 text-sm bg-background border-border rounded-lg" placeholder="€" />
                  <span className="text-sm font-mono w-20 text-right">€{(item.unit_price * item.quantity).toFixed(2)}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => setOrderItems(prev => prev.filter((_, i) => i !== idx))}>
                    <X size={12} />
                  </Button>
                </div>
              );
            })}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-sm font-heading font-bold">Totale</span>
              <span className="text-sm font-heading font-bold">€{orderItems.reduce((s, i) => s + i.unit_price * i.quantity, 0).toFixed(2)}</span>
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs text-muted-foreground">Note</Label>
          <Textarea value={newOrderNotes} onChange={e => setNewOrderNotes(e.target.value)} className="mt-1 bg-secondary border-border rounded-lg" placeholder="Note ordine..." rows={2} />
        </div>

        <Button onClick={createManualOrder} disabled={creatingOrder || orderItems.length === 0} className="w-full gap-1 bg-foreground text-background">
          <PackagePlus size={14} /> {creatingOrder ? "Creazione..." : "Crea Ordine"}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

interface ComposeFromOrderProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  form: any;
  composeOrderContext: any;
}

export const ComposeFromOrderDialog = ({ open, onOpenChange, clientId, form, composeOrderContext }: ComposeFromOrderProps) => {
  if (!composeOrderContext) return null;
  return (
    <ComposeEmailDialog
      open={open}
      onOpenChange={onOpenChange}
      clientId={clientId}
      clientName={form.company_name}
      clientEmail={form.email}
      orderId={composeOrderContext.orderId}
      orderCode={composeOrderContext.orderCode}
      orderStatus={composeOrderContext.orderStatus}
      orderTotal={composeOrderContext.orderTotal}
      trackingNumber={composeOrderContext.trackingNumber}
    />
  );
};
