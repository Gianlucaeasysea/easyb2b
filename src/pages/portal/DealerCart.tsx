import { useCart, CartItem } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, AlertTriangle, Clock, Truck, Save } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import { logger } from "@/lib/logger";

import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { OrderSubmitAnimation } from "@/components/portal/ui/OrderSubmitAnimation";
import { PriceChangedDialog } from "@/components/portal/ui/PriceChangedDialog";

const MIN_ORDER_AMOUNT = 100;

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  prepaid: "Prepaid",
  "30_days": "Net 30 days",
  "60_days": "Net 60 days",
  "90_days": "Net 90 days",
  end_of_month: "End of month",
  "100% upfront": "100% Upfront",
};

const getProductFamily = (name: string): string | null => {
  const n = name.toLowerCase();
  if (n.includes("kit easybarber")) return "kit-easybarber";
  if (n.includes("kit easyfurling")) return "kit-easyfurling";
  if (n.includes("kit easypreventer")) return "kit-easypreventer";
  if (n.includes("rope deflector")) return "rope-deflector";
  if (n.includes("way2") || n.includes("gangway")) return "way2";
  if (n.includes("spira") || n.includes("guardrail cover")) return "spira";
  if (n.includes("winch cover")) return "winch-cover";
  if (n.includes("flipper") && n.includes("carbon")) return "flipper-carbon";
  if (n.includes("flipper") && n.includes("max")) return "flipper-max";
  if (n.includes("flipper")) return "flipper";
  if (n.includes("snatch") || (n.includes("olli") && n.includes("block"))) return "olli-block";
  if (n.includes("solid ring")) return "olli-solid-ring";
  if (n.includes("low friction ring") || (n.includes("olli") && n.includes("ring"))) return "olli-ring";
  if (n.includes("sheathed loop")) return "sheathed-loop";
  if (n.includes("soft shackle")) return "soft-shackle";
  if (n.includes("covered loop")) return "covered-loop";
  if (n.includes("dyneema sheet") && n.includes("eye")) return "dyneema-sheet-eye";
  if (n.includes("dyneema sheet")) return "dyneema-sheet";
  if (n.includes("polyester sheet") && n.includes("eye")) return "polyester-sheet-eye";
  if (n.includes("polyester sheet") && n.includes("olli")) return "polyester-sheet-eye";
  if (n.includes("polyester sheet")) return "polyester-sheet";
  if (n.includes("boat hook head") || n.includes("brush head") || n.includes("line-passing") || n.includes("linemaster") || n.includes("short pole") || n.includes("quick-release") || n.includes("fidlock")) return "jake-head";
  if (n.includes("jake")) return "jake";
  return null;
};

// --- Validation ---
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  updatedItems: CartItem[];
}

async function validateCartBeforeSubmit(
  cartItems: CartItem[],
  clientId: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Fetch current prices from all assigned price lists
  const { data: assignments } = await supabase
    .from('price_list_clients')
    .select('price_list_id')
    .eq('client_id', clientId);

  const currentPrices = new Map<string, number>();

  if (assignments?.length) {
    const plIds = assignments.map(a => a.price_list_id);
    const { data: plItems } = await supabase
      .from('price_list_items')
      .select('product_id, custom_price')
      .in('price_list_id', plIds);

    plItems?.forEach(item => {
      if (item.custom_price != null && item.custom_price > 0) {
        const existing = currentPrices.get(item.product_id);
        // Keep lowest price if multiple lists
        if (!existing || item.custom_price < existing) {
          currentPrices.set(item.product_id, item.custom_price);
        }
      }
    });
  }

  // 2. Fetch current product data
  const productIds = cartItems.map(i => i.productId);
  const { data: products } = await supabase
    .from('products')
    .select('id, name, stock_quantity, active_b2b, price')
    .in('id', productIds);

  const productMap = new Map(products?.map(p => [p.id, p]) ?? []);

  // 3. Validate each item
  const updatedItems: CartItem[] = [];

  for (const item of cartItems) {
    const product = productMap.get(item.productId);

    if (!product) {
      errors.push(`"${item.name}" is no longer available`);
      continue;
    }

    if (!product.active_b2b) {
      errors.push(`"${item.name}" is no longer available for B2B`);
      continue;
    }

    // Stock check: null = unlimited
    const availableStock = product.stock_quantity;
    if (availableStock !== null && availableStock <= 0) {
      errors.push(`"${item.name}" is out of stock`);
      continue;
    }
    if (availableStock !== null && item.quantity > availableStock) {
      warnings.push(`"${item.name}": quantity reduced from ${item.quantity} to ${availableStock}`);
      item.quantity = availableStock;
    }

    // Price check
    const currentPrice = currentPrices.get(item.productId);
    if (currentPrice == null || currentPrice <= 0) {
      errors.push(`"${item.name}" has no valid B2B price in your price list`);
      continue;
    }

    if (Math.abs(currentPrice - item.b2bPrice) > 0.01) {
      warnings.push(`Price of "${item.name}" changed: €${item.b2bPrice.toFixed(2)} → €${currentPrice.toFixed(2)}`);
      item.b2bPrice = currentPrice;
    }

    updatedItems.push({ ...item, stock: availableStock ?? 9999 });
  }

  // 4. Minimum order check
  const newTotal = updatedItems.reduce((sum, i) => sum + i.b2bPrice * i.quantity, 0);
  if (newTotal > 0 && newTotal < MIN_ORDER_AMOUNT) {
    errors.push(`Order total (€${newTotal.toFixed(2)}) is below the minimum of €${MIN_ORDER_AMOUNT}`);
  }

  return { valid: errors.length === 0, errors, warnings, updatedItems };
}

const DealerCart = () => {
  const { items, updateQuantity, removeItem, clearCart, totalAmount, totalItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showOrderAnimation, setShowOrderAnimation] = useState(false);
  const [submittedOrderCode, setSubmittedOrderCode] = useState("");
  const [priceWarnings, setPriceWarnings] = useState<string[]>([]);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const pendingSubmitRef = useRef<CartItem[] | null>(null);
  const submittingRef = useRef(false); // prevent double submit

  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: productDetails } = useQuery({
    queryKey: ["product-details-cart"],
    queryFn: async () => {
      const { data } = await supabase.from("product_details").select("product_family, lead_time");
      return data || [];
    },
  });

  const detailsByFamily = new Map<string, string>();
  productDetails?.forEach(d => {
    if (d.lead_time) detailsByFamily.set(d.product_family, d.lead_time);
  });

  const getLeadTime = (productName: string): string | null => {
    const family = getProductFamily(productName);
    return family ? detailsByFamily.get(family) || null : null;
  };

  const belowMinimum = totalAmount < MIN_ORDER_AMOUNT;

  const submitOrderWithItems = useCallback(async (validatedItems: CartItem[], status: "submitted" | "draft") => {
    if (!client || submittingRef.current) return;
    submittingRef.current = true;

    const setLoading = status === "draft" ? setSavingDraft : setSubmitting;
    if (status === "submitted") setShowOrderAnimation(true);
    setLoading(true);

    try {
      const { data: result, error: orderError } = await supabase.rpc("create_order_with_items", {
        p_client_id: client.id,
        p_status: status,
        p_notes: notes.trim() || null,
        p_payment_terms: (client as any).payment_terms || null,
        p_order_type: null,
        p_internal_notes: null,
        p_items: validatedItems.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.b2bPrice,
          discount_pct: item.discountPct || 0,
          subtotal: item.b2bPrice * item.quantity,
        })),
      } as any);

      if (orderError) throw orderError;
      const order = result as any;

      // Clear cart BEFORE email notification (so email failure doesn't affect order)
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["my-orders-full"] });

      if (status === "submitted") {
        setSubmittedOrderCode(order.order_code || `ORD-${order.order_id?.slice(0, 8)}`);
        // Non-blocking email notification
        supabase.functions.invoke('send-order-notification', {
          body: {
            orderId: order.order_id,
            orderCode: order.order_code,
            type: 'order_received',
          },
        }).catch(emailErr => {
          logger.error('DealerCart', 'Order notification failed (non-blocking)', emailErr);
        });
      } else {
        toast.success("Draft saved! You can complete the order anytime from My Orders.");
        navigate("/portal/orders");
      }
    } catch (error) {
      setShowOrderAnimation(false);
      showErrorToast(error, "DealerCart.createOrder");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }, [client, notes, clearCart, queryClient, navigate]);

  const createOrder = useCallback(async (status: "submitted" | "draft") => {
    if (!client || items.length === 0) return;

    if (status === "submitted") {
      // Full validation pass before submit
      setSubmitting(true);
      try {
        const validation = await validateCartBeforeSubmit(items, client.id);

        if (!validation.valid) {
          toast.error(validation.errors.join('\n'), { duration: 6000 });
          setSubmitting(false);
          return;
        }

        if (validation.warnings.length > 0) {
          // Show confirmation dialog
          setPriceWarnings(validation.warnings);
          pendingSubmitRef.current = validation.updatedItems;
          setShowPriceDialog(true);
          setSubmitting(false);
          return;
        }

        // No warnings, submit directly
        await submitOrderWithItems(validation.updatedItems, "submitted");
      } catch (error) {
        showErrorToast(error, "DealerCart.validate");
        setSubmitting(false);
      }
    } else {
      // Draft: lighter validation
      if (totalAmount < 10) {
        toast.warning("Add at least some products before saving a draft");
        return;
      }
      await submitOrderWithItems(items, "draft");
    }
  }, [client, items, totalAmount, submitOrderWithItems]);

  const handlePriceDialogConfirm = useCallback(async () => {
    setShowPriceDialog(false);
    if (pendingSubmitRef.current) {
      await submitOrderWithItems(pendingSubmitRef.current, "submitted");
      pendingSubmitRef.current = null;
    }
  }, [submitOrderWithItems]);

  const handlePriceDialogCancel = useCallback(() => {
    setShowPriceDialog(false);
    pendingSubmitRef.current = null;
  }, []);

  const handleAnimationClose = () => {
    setShowOrderAnimation(false);
    navigate("/portal/orders");
  };

  if (items.length === 0 && !showOrderAnimation) {
    return (
      <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center py-20">
        <ShoppingCart className="mx-auto text-muted-foreground mb-4" size={48} />
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">Browse the catalog to add products to your order.</p>
        <Link to="/portal/catalog">
          <Button className="bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold">Browse Catalog</Button>
        </Link>
      </motion.div>
    );
  }

  const paymentTermsLabel = PAYMENT_TERMS_LABELS[(client as any)?.payment_terms] || (client as any)?.payment_terms || "—";

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Order Review</h1>
          <p className="text-sm text-muted-foreground">{totalItems} item{totalItems !== 1 ? "s" : ""} in cart</p>
        </div>
        <Link to="/portal/catalog">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ArrowLeft size={14} /> Continue Shopping
          </Button>
        </Link>
      </div>

      {belowMinimum && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30 mb-6">
          <AlertTriangle className="text-warning shrink-0" size={20} />
          <div>
            <p className="text-sm font-heading font-semibold text-warning">Minimum order not reached</p>
            <p className="text-xs text-muted-foreground">
              The minimum order is <span className="font-semibold text-foreground">€{MIN_ORDER_AMOUNT.toFixed(2)}</span>. 
              You need <span className="font-semibold text-foreground">€{(MIN_ORDER_AMOUNT - totalAmount).toFixed(2)}</span> more.
            </p>
          </div>
        </div>
      )}

      {client && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10 mb-6">
          <Clock size={18} className="text-primary shrink-0" />
          <div>
            <p className="text-sm font-heading font-semibold text-foreground">Payment Terms: {paymentTermsLabel}</p>
            {(client as any)?.payment_terms_notes && (
              <p className="text-xs text-muted-foreground mt-0.5">{(client as any).payment_terms_notes}</p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3 mb-8">
        {items.map(item => {
          const leadTime = getLeadTime(item.name);
          const outOfStock = item.stock !== null && item.stock <= 0;

          return (
            <div key={item.productId} data-testid="cart-item" className="glass-card-solid p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingCart className="text-muted-foreground" size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm font-semibold text-foreground truncate">{item.name}</p>
                {item.sku && <p className="text-xs font-mono text-muted-foreground">SKU: {item.sku}</p>}
                <div className="flex items-center gap-2 mt-1">
                  {item.unitPrice !== item.b2bPrice && (
                    <span className="text-xs text-muted-foreground line-through">€{item.unitPrice.toFixed(2)}</span>
                  )}
                  <span className="text-sm font-semibold text-foreground">€{item.b2bPrice.toFixed(2)}</span>
                  {item.discountPct > 0 && (
                    <span className="text-xs text-success">-{item.discountPct}%</span>
                  )}
                </div>
                {leadTime && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={10} className="text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Lead time: <span className="font-semibold text-foreground">{leadTime}</span></span>
                  </div>
                )}
                {outOfStock && (
                  <Badge variant="outline" className="mt-1 text-[10px] text-destructive border-destructive/30">Out of Stock</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.productId, item.quantity - 1)}><Minus size={14} /></Button>
                <Input data-testid="cart-item-quantity" type="number" min={1} max={item.stock || 999} value={item.quantity} onChange={e => updateQuantity(item.productId, parseInt(e.target.value) || 1)} className="w-16 text-center h-8 text-sm" />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.productId, item.quantity + 1)} disabled={item.stock !== null && item.quantity >= item.stock}><Plus size={14} /></Button>
              </div>
              <p className="font-heading font-bold text-foreground w-24 text-right">€{(item.b2bPrice * item.quantity).toFixed(2)}</p>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => removeItem(item.productId)}><Trash2 size={14} /></Button>
              </motion.div>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-heading font-semibold text-foreground mb-2 block">Order Notes (optional)</label>
          <Textarea placeholder="Special instructions, delivery preferences..." value={notes} onChange={e => setNotes(e.target.value)} className="rounded-lg bg-secondary border-border resize-none" rows={4} />
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
          <div className="border-t border-border pt-3 mb-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-muted-foreground">Products subtotal</span>
              <span data-testid="cart-subtotal" className="font-heading font-semibold text-foreground">€{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-muted-foreground">Shipping</span>
              <span className="text-xs text-muted-foreground italic">Calculated after confirmation</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border mt-2">
              <span className="font-heading font-bold text-foreground">Estimated Total</span>
              <span className="font-heading text-2xl font-bold text-foreground">€{totalAmount.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
            <Truck size={14} className="text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              Shipping costs will be calculated after order confirmation. You will receive an updated invoice with the final total.
            </p>
          </div>
          {belowMinimum && (
            <p className="text-xs text-warning mb-4">Minimum order: €{MIN_ORDER_AMOUNT.toFixed(2)} — add €{(MIN_ORDER_AMOUNT - totalAmount).toFixed(2)}</p>
          )}
          <div className="space-y-2">
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => createOrder("submitted")}
                disabled={submitting || belowMinimum}
                className="w-full bg-foreground text-background hover:bg-foreground/90 font-heading font-bold py-6 text-base disabled:opacity-50"
              >
                {submitting ? "Validating..." : belowMinimum ? `Minimum €${MIN_ORDER_AMOUNT} required` : "Submit Order"}
              </Button>
            </motion.div>
            <Button
              variant="outline"
              onClick={() => createOrder("draft")}
              disabled={savingDraft}
              className="w-full gap-2 font-heading font-semibold"
            >
              <Save size={14} />
              {savingDraft ? "Saving..." : "Save as Draft"}
            </Button>
          </div>
        </div>
      </div>

      <PriceChangedDialog
        isOpen={showPriceDialog}
        warnings={priceWarnings}
        onConfirm={handlePriceDialogConfirm}
        onCancel={handlePriceDialogCancel}
      />

      <OrderSubmitAnimation
        isVisible={showOrderAnimation}
        orderCode={submittedOrderCode}
        onClose={handleAnimationClose}
      />
    </motion.div>
  );
};

export default DealerCart;
