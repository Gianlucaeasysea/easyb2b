import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Minus, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import { useQuery } from "@tanstack/react-query";
import type { Order, DraftItem } from "@/types/orders";

interface AddProductsDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  editingDraft: Order;
  draftItems: DraftItem[];
  onItemsAdded: (newItems: DraftItem[]) => void;
}

const AddProductsDialog = ({ open, onClose, clientId, editingDraft, draftItems, onItemsAdded }: AddProductsDialogProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const { data: priceListProducts } = useQuery({
    queryKey: ["my-price-list-products", clientId],
    queryFn: async () => {
      const { data: assignments } = await supabase
        .from("price_list_clients")
        .select("price_list_id")
        .eq("client_id", clientId);
      if (!assignments?.length) return [];
      const plIds = assignments.map((a) => a.price_list_id);
      const { data: items } = await supabase
        .from("price_list_items")
        .select("*, products!inner(*)")
        .in("price_list_id", plIds);
      return (items || []).filter((item: any) => item.products && item.products.active_b2b === true);
    },
    enabled: !!clientId && open,
  });

  const handleAdd = async () => {
    setSaving(true);
    try {
      const selectedProducts = Object.entries(qtys).filter(([, qty]) => qty > 0);
      if (!selectedProducts.length) {
        toast.error("Select at least one product");
        setSaving(false);
        return;
      }

      const addedItems: DraftItem[] = [];
      for (const [productId, qty] of selectedProducts) {
        const existing = draftItems.find((i) => i.product_id === productId);
        if (existing) {
          const newQty = existing.quantity + qty;
          const newSubtotal = newQty * Number(existing.unit_price);
          await supabase.from("order_items").update({ quantity: newQty, subtotal: newSubtotal }).eq("id", existing.id);
        } else {
          const plItem = priceListProducts?.find((p: any) => p.product_id === productId);
          if (!plItem) continue;
          const product = (plItem as any).products;
          const unitPrice = plItem.custom_price;
          const subtotal = unitPrice * qty;
          const { data: newItem, error } = await supabase
            .from("order_items")
            .insert({
              order_id: editingDraft.id,
              product_id: productId,
              quantity: qty,
              unit_price: unitPrice,
              discount_pct: 0,
              subtotal,
            })
            .select("*")
            .single();
          if (error) throw error;
          addedItems.push({ ...newItem, name: product.name, sku: product.sku });
        }
      }

      const newTotal =
        draftItems.reduce((s, i) => s + Number(i.subtotal || 0), 0) +
        selectedProducts.reduce((s, [productId, qty]) => {
          const plItem = priceListProducts?.find((p: any) => p.product_id === productId);
          return s + (plItem ? plItem.custom_price * qty : 0);
        }, 0);
      await supabase.from("orders").update({ total_amount: newTotal }).eq("id", editingDraft.id);

      queryClient.invalidateQueries({ queryKey: ["my-orders-full"] });
      onItemsAdded(addedItems);
      setQtys({});
      setSearch("");
      onClose();
      toast.success("Products added to draft");
    } catch (error) {
      showErrorToast(error, "DealerOrders.addProductsToDraft");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSearch("");
    setQtys({});
    onClose();
  };

  const existingIds = new Set(draftItems.map((i) => i.product_id));
  const available = (priceListProducts || []).filter((p: any) => {
    const product = p.products;
    if (!product) return false;
    const q = search.toLowerCase();
    return !q || product.name.toLowerCase().includes(q) || (product.sku || "").toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Products to Draft</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
          </div>
          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {!available.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No products found</p>
            ) : (
              available.map((plItem: any) => {
                const product = plItem.products;
                const isAlreadyInDraft = existingIds.has(product.id);
                const qty = qtys[product.id] || 0;
                return (
                  <div key={product.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{product.sku} · €{Number(plItem.custom_price).toFixed(2)}</p>
                      {isAlreadyInDraft && <Badge variant="outline" className="text-[10px]">Already in draft</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={qty <= 0}
                        onClick={() => setQtys((prev) => ({ ...prev, [product.id]: Math.max(0, qty - 1) }))}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number" min={0} value={qty}
                        onChange={(e) => setQtys((prev) => ({ ...prev, [product.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-14 h-7 text-center text-sm"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setQtys((prev) => ({ ...prev, [product.id]: qty + 1 }))}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving || Object.values(qtys).every((q) => q === 0)}>
            {saving ? "Adding..." : `Add ${Object.values(qtys).filter((q) => q > 0).length} Products`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductsDialog;
