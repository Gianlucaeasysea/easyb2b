import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Trash2, Minus, Plus, CheckCircle, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DealerCart = () => {
  const { items, updateQuantity, removeItem, clearCart, totalAmount, totalItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<string | null>(null);

  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const handleSubmitOrder = async () => {
    if (!client || items.length === 0) return;
    setSubmitting(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          client_id: client.id,
          total_amount: totalAmount,
          status: "confirmed",
          notes: notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_pct: item.discountPct,
        subtotal: item.b2bPrice * item.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      setOrderConfirmed(order.id);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["my-orders-full"] });
      toast.success("Order placed successfully!");
    } catch (err: any) {
      toast.error("Failed to place order: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Order confirmation screen
  if (orderConfirmed) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <CheckCircle className="mx-auto text-success mb-6" size={64} />
        <h1 className="font-heading text-3xl font-bold text-foreground mb-3">Order Confirmed!</h1>
        <p className="text-muted-foreground mb-2">
          Your order <span className="font-mono font-semibold">#{orderConfirmed.slice(0, 8).toUpperCase()}</span> has been placed.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          We'll process it shortly. You can track it in your orders page.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/portal/orders")} className="bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold">
            View My Orders
          </Button>
          <Button variant="outline" onClick={() => { setOrderConfirmed(null); navigate("/portal/catalog"); }}>
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingCart className="mx-auto text-muted-foreground mb-4" size={48} />
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">Browse the catalog to add products to your order.</p>
        <Link to="/portal/catalog">
          <Button className="bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold">
            Browse Catalog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Order Review</h1>
          <p className="text-sm text-muted-foreground">{totalItems} item{totalItems !== 1 ? "s" : ""} in your cart</p>
        </div>
        <Link to="/portal/catalog">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ArrowLeft size={14} /> Continue Shopping
          </Button>
        </Link>
      </div>

      {/* Cart items */}
      <div className="space-y-3 mb-8">
        {items.map(item => (
          <div key={item.productId} className="glass-card-solid p-4 flex items-center gap-4">
            <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <ShoppingCart className="text-muted-foreground" size={20} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-sm font-semibold text-foreground truncate">{item.name}</p>
              {item.sku && <p className="text-xs font-mono text-muted-foreground">{item.sku}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground line-through">€{item.unitPrice.toFixed(2)}</span>
                <span className="text-sm font-semibold text-foreground">€{item.b2bPrice.toFixed(2)}</span>
                <span className="text-xs text-success">-{item.discountPct}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                <Minus size={14} />
              </Button>
              <Input
                type="number"
                min={1}
                max={item.stock}
                value={item.quantity}
                onChange={e => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                className="w-16 text-center h-8 text-sm"
              />
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= item.stock}>
                <Plus size={14} />
              </Button>
            </div>
            <p className="font-heading font-bold text-foreground w-24 text-right">€{(item.b2bPrice * item.quantity).toFixed(2)}</p>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => removeItem(item.productId)}>
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>

      {/* Notes & Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-heading font-semibold text-foreground mb-2 block">Order Notes (optional)</label>
          <Textarea
            placeholder="Special instructions, delivery preferences..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="rounded-lg bg-secondary border-border resize-none"
            rows={4}
          />
        </div>
        <div className="glass-card-solid p-6">
          <h3 className="font-heading font-bold text-foreground mb-4">Order Summary</h3>
          <div className="space-y-2 mb-4">
            {items.map(item => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="text-muted-foreground truncate mr-2">{item.name} ×{item.quantity}</span>
                <span className="font-semibold text-foreground">€{(item.b2bPrice * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center mb-6">
            <span className="font-heading font-bold text-foreground">Total</span>
            <span className="font-heading text-2xl font-bold text-foreground">€{totalAmount.toFixed(2)}</span>
          </div>
          <Button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="w-full bg-foreground text-background hover:bg-foreground/90 font-heading font-bold py-6 text-base"
          >
            {submitting ? "Placing Order..." : "Confirm & Place Order"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DealerCart;
