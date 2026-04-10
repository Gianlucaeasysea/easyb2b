import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Minus, Plus, Trash2, PackagePlus } from "lucide-react";
import type { Order, DraftItem } from "@/types/orders";

interface DraftEditorDialogProps {
  order: Order | null;
  items: DraftItem[];
  notes: string;
  total: number;
  isSubmitting: boolean;
  onUpdateQuantity: (itemId: string, qty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateNotes: (notes: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onAddProducts: () => void;
}

const DraftEditorDialog = ({
  order,
  items,
  notes,
  total,
  isSubmitting,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateNotes,
  onSubmit,
  onClose,
  onAddProducts,
}: DraftEditorDialogProps) => (
  <Dialog open={!!order} onOpenChange={() => onClose()}>
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          Complete Order — {order?.order_code || `#${order?.id?.slice(0, 8).toUpperCase()}`}
        </DialogTitle>
      </DialogHeader>
      {order && (
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No products in this draft. Add products from the catalog.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs text-right">Price</TableHead>
                  <TableHead className="text-xs text-center w-[130px]">Quantity</TableHead>
                  <TableHead className="text-xs text-right">Subtotal</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                    </TableCell>
                    <TableCell className="text-right text-sm">€{Number(item.unit_price).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-16 h-7 text-center text-sm"
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">€{(Number(item.unit_price) * item.quantity).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onAddProducts}>
              <PackagePlus className="h-4 w-4" /> Add Products
            </Button>
            <div className="text-lg font-bold">Total: €{total.toFixed(2)}</div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
            <Textarea
              placeholder="Add notes to your order..."
              value={notes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={onSubmit} disabled={isSubmitting || items.length === 0}>
              {isSubmitting ? "Submitting..." : "Submit Order"}
            </Button>
          </DialogFooter>
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default DraftEditorDialog;
