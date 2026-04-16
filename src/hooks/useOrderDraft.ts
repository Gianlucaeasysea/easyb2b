import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ERROR_MESSAGES } from "@/lib/errorMessages";
import { showErrorToast } from "@/lib/errorHandler";
import { canTransitionTo } from "@/lib/constants";
import type { Order, DraftItem, PriceCheckData } from "@/types/orders";

export function useOrderDraft() {
  const queryClient = useQueryClient();

  const [editingDraft, setEditingDraft] = useState<Order | null>(null);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [draftNotes, setDraftNotes] = useState("");
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [priceCheckData, setPriceCheckData] = useState<PriceCheckData | null>(null);

  const draftTotal = draftItems.reduce((s, i) => s + Number(i.subtotal || 0), 0);

  const openDraftEditor = (order: Order) => {
    const items = (order.order_items || []).map((i) => ({
      ...i,
      name: i.products?.name || "—",
      sku: i.products?.sku || "—",
    }));
    setDraftItems(items);
    setDraftNotes(order.notes || "");
    setEditingDraft(order);
  };

  const updateDraftItemQty = (itemId: string, qty: number) => {
    if (qty <= 0) {
      setDraftItems((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      setDraftItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, quantity: qty, subtotal: qty * Number(i.unit_price) } : i
        )
      );
    }
  };

  const removeDraftItem = (itemId: string) => {
    setDraftItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const submitDraft = async () => {
    if (!editingDraft || draftItems.length === 0) return;
    setSubmittingDraft(true);
    try {
      for (const item of draftItems) {
        await supabase
          .from("order_items")
          .update({ quantity: item.quantity, subtotal: item.quantity * Number(item.unit_price) })
          .eq("id", item.id);
      }
      const currentItemIds = draftItems.map((i) => i.id);
      const originalItems = (editingDraft.order_items || []) as any[];
      for (const orig of originalItems) {
        if (!currentItemIds.includes(orig.id)) {
          await supabase.from("order_items").delete().eq("id", orig.id);
        }
      }
      const { error } = await supabase
        .from("orders")
        .update({ status: "submitted", total_amount: draftTotal, notes: draftNotes || null })
        .eq("id", editingDraft.id);
      if (error) throw error;

      try {
        await supabase.functions.invoke("send-order-notification", {
          body: { orderId: editingDraft.id, orderCode: editingDraft.order_code, type: "order_received" },
        });
      } catch {}

      queryClient.invalidateQueries({ queryKey: ["my-orders-full"] });
      toast.success("Order submitted successfully!");
      setEditingDraft(null);
    } catch (error) {
      showErrorToast(error, "DealerOrders.submitDraft");
    } finally {
      setSubmittingDraft(false);
    }
  };

  const handleDeleteDraft = async (order: Order) => {
    setDeletingDraftId(order.id);
    try {
      await supabase
        .from("deals")
        .update({ stage: "closed_lost", lost_reason: "Draft deleted by dealer", closed_at: new Date().toISOString() })
        .eq("order_id", order.id)
        .eq("source", "dealer_draft");
      await supabase.from("order_items").delete().eq("order_id", order.id);
      const { error } = await supabase.from("orders").delete().eq("id", order.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["my-orders-full"] });
      toast.success("Draft deleted");
    } catch (error) {
      showErrorToast(error, "DealerOrders.deleteDraft");
    } finally {
      setDeletingDraftId(null);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    const currentStatus = order.status || "draft";
    if (!canTransitionTo(currentStatus, "cancelled")) {
      toast.error(ERROR_MESSAGES.ORDER_STATUS_TRANSITION_INVALID);
      return;
    }
    setCancellingId(order.id);
    try {
      const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["my-orders-full"] });
      toast.success("Order cancelled successfully");
    } catch (error) {
      showErrorToast(error, "DealerOrders.cancel");
    } finally {
      setCancellingId(null);
    }
  };

  const executeDuplicate = async (
    clientId: string,
    order: Order,
    comparisonItems?: PriceCheckData["items"]
  ) => {
    setDuplicatingId(order.id);
    try {
      const itemsToUse = comparisonItems || priceCheckData?.items;
      if (!itemsToUse) return;

      let validItems = itemsToUse
        .filter((i) => i.available && i.currentPrice !== null)
        .map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.currentPrice!,
          subtotal: i.currentPrice! * i.quantity,
        }));

      // Fallback: if no valid items after filtering, use original order prices
      if (!validItems.length) {
        const originalItems = (order.order_items || []) as any[];
        validItems = originalItems.map((i: any) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: Number(i.unit_price),
          subtotal: Number(i.unit_price) * i.quantity,
        }));
      }

      if (!validItems.length) {
        toast.error(ERROR_MESSAGES.ORDER_NO_PRODUCTS);
        return;
      }

      const excludedCount = itemsToUse.length - validItems.length;

      const { data: newOrder, error: orderErr } = await supabase.rpc("create_order_with_items", {
        p_client_id: clientId,
        p_status: "draft",
        p_notes: `Duplicated from order ${order.order_code || order.id.slice(0, 8)}`,
        p_payment_terms: undefined,
        p_internal_notes: undefined,
        p_items: validItems,
      });
      if (orderErr) throw orderErr;

      queryClient.invalidateQueries({ queryKey: ["my-orders-full"] });
      const newCode = (newOrder as any)?.order_code || (newOrder as any)?.id?.slice(0, 8);
      if (excludedCount > 0) {
        toast.warning(
          `Order duplicated as draft #${newCode}. ${excludedCount} unavailable products excluded. Review before submitting.`
        );
      } else {
        toast.success(`Order duplicated as draft #${newCode}. Review before submitting.`);
      }
    } catch (error) {
      showErrorToast(error, "DealerOrders.duplicate");
    } finally {
      setDuplicatingId(null);
      setPriceCheckData(null);
    }
  };

  const handlePrepareDuplicate = async (clientId: string, order: Order) => {
    setDuplicatingId(order.id);
    try {
      const items = (order.order_items || []) as any[];
      if (!items.length) {
        toast.error(ERROR_MESSAGES.ORDER_NO_ITEMS);
        return;
      }

      let priceMap: Record<string, number> = {};
      // priceListFetchFailed used for logging only

      try {
        const { data: priceListClients } = await supabase
          .from("price_list_clients")
          .select("price_list_id")
          .eq("client_id", clientId);
        const priceListIds = priceListClients?.map((plc) => plc.price_list_id) || [];
        if (priceListIds.length > 0) {
          const { data: priceItems } = await supabase
            .from("price_list_items")
            .select("product_id, custom_price")
            .in("price_list_id", priceListIds);
          priceItems?.forEach((pi) => {
            priceMap[pi.product_id] = Number(pi.custom_price);
          });
        }
      } catch {
        priceListFetchFailed = true;
        console.warn("Price list fetch failed (RLS or network), using original prices");
      }

      const productIds = items.map((i: any) => i.product_id);
      const { data: products } = await supabase
        .from("products")
        .select("id, name, price, active_b2b, stock_quantity")
        .in("id", productIds);
      const productMap = new Map(products?.map((p) => [p.id, p]) || []);

      const comparisonItems = items.map((item: any) => {
        const product = productMap.get(item.product_id);
        const available = !!(product && product.active_b2b);
        const currentPrice = available
          ? priceMap[item.product_id] ?? (product?.price ? Number(product.price) : null)
          : null;
        return {
          product_id: item.product_id,
          name: item.products?.name || "Unknown product",
          sku: item.products?.sku || "—",
          quantity: item.quantity,
          originalPrice: Number(item.unit_price || 0),
          currentPrice,
          available,
        };
      });

      const originalTotal = comparisonItems.reduce((s, i) => s + i.originalPrice * i.quantity, 0);
      const newTotal = comparisonItems
        .filter((i) => i.available && i.currentPrice !== null)
        .reduce((s, i) => s + i.currentPrice! * i.quantity, 0);
      const hasChanges = comparisonItems.some(
        (i) => !i.available || i.currentPrice === null || i.currentPrice !== i.originalPrice
      );

      if (!hasChanges) {
        await executeDuplicate(clientId, order, comparisonItems);
      } else {
        setPriceCheckData({ order, items: comparisonItems, originalTotal, newTotal, hasChanges });
      }
    } catch (error) {
      showErrorToast(error, "DealerOrders.prepareDuplicate");
    } finally {
      setDuplicatingId(null);
    }
  };

  return {
    // Draft editor state
    editingDraft,
    setEditingDraft,
    draftItems,
    setDraftItems,
    draftNotes,
    setDraftNotes,
    draftTotal,
    submittingDraft,
    openDraftEditor,
    updateDraftItemQty,
    removeDraftItem,
    submitDraft,
    // Delete draft
    deletingDraftId,
    handleDeleteDraft,
    // Cancel
    cancellingId,
    handleCancelOrder,
    // Duplicate / price check
    duplicatingId,
    priceCheckData,
    setPriceCheckData,
    handlePrepareDuplicate,
    executeDuplicate,
  };
}
