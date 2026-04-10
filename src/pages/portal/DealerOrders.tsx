import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShoppingBag, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { TablePagination } from "@/components/ui/TablePagination";
import { useOrderDraft } from "@/hooks/useOrderDraft";
import DraftsList from "@/components/portal/orders/DraftsList";
import OrderCard from "@/components/portal/orders/OrderCard";
import DraftEditorDialog from "@/components/portal/orders/DraftEditorDialog";
import PriceCheckDialog from "@/components/portal/orders/PriceCheckDialog";
import AddProductsDialog from "@/components/portal/orders/AddProductsDialog";
import type { Order } from "@/types/orders";

const DealerOrders = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(highlightId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [confirmCancel, setConfirmCancel] = useState<Order | null>(null);
  const [confirmDeleteDraft, setConfirmDeleteDraft] = useState<Order | null>(null);
  const [showAddProducts, setShowAddProducts] = useState(false);

  const draft = useOrderDraft();

  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).maybeSingle();
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
        .select("*, order_items(*, products(name, sku)), order_documents(id, file_name, file_path, doc_type, created_at)")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });
      return (data || []) as Order[];
    },
    enabled: !!client,
  });

  const draftOrders = useMemo(() => (orders || []).filter((o) => o.status === "draft"), [orders]);
  const nonDraftOrders = useMemo(() => (orders || []).filter((o) => o.status !== "draft"), [orders]);
  const totalPages = Math.max(1, Math.ceil(nonDraftOrders.length / pageSize));
  const pageData = nonDraftOrders.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  // Highlight order from notification link
  useEffect(() => {
    if (highlightId && orders) {
      setHighlightedId(highlightId);
      setExpandedOrder(highlightId);
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
      setTimeout(() => { setHighlightedId(null); setSearchParams({}, { replace: true }); }, 3000);
    }
  }, [highlightId, orders]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Orders</h1>
          <p className="text-sm text-muted-foreground">View and track all your B2B orders</p>
        </div>
        <Badge variant="outline" className="text-xs">{orders?.length || 0} orders</Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" size={16} /> Loading orders...
        </div>
      ) : !orders?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <ShoppingBag className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No orders yet. Browse the catalog to place your first order.</p>
        </div>
      ) : (
        <>
          <DraftsList
            drafts={draftOrders}
            onEditDraft={(o) => draft.openDraftEditor(o)}
            onDeleteDraft={(o) => setConfirmDeleteDraft(o)}
          />

          <div className="space-y-4">
            {pageData.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isExpanded={expandedOrder === order.id}
                isHighlighted={highlightedId === order.id}
                highlightRef={order.id === highlightId ? highlightRef : undefined}
                duplicatingId={draft.duplicatingId}
                onToggleExpand={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                onCancel={() => setConfirmCancel(order)}
                onDuplicate={() => client && draft.handlePrepareDuplicate(client.id, order)}
              />
            ))}
          </div>

          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={nonDraftOrders.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </>
      )}

      {/* Price Check Dialog */}
      <PriceCheckDialog
        data={draft.priceCheckData}
        duplicating={!!draft.duplicatingId}
        onConfirm={() => client && draft.priceCheckData && draft.executeDuplicate(client.id, draft.priceCheckData.order, draft.priceCheckData.items)}
        onCancel={() => draft.setPriceCheckData(null)}
      />

      {/* Confirm Cancel Dialog */}
      <Dialog open={!!confirmCancel} onOpenChange={() => setConfirmCancel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel Order</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to cancel this order? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(null)}>Back</Button>
            <Button variant="destructive" onClick={() => { if (confirmCancel) { draft.handleCancelOrder(confirmCancel); setConfirmCancel(null); } }} disabled={!!draft.cancellingId}>
              {draft.cancellingId ? "Cancelling..." : "Cancel Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Draft Dialog */}
      <Dialog open={!!confirmDeleteDraft} onOpenChange={() => setConfirmDeleteDraft(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Draft</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this draft? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteDraft(null)}>Back</Button>
            <Button variant="destructive" onClick={() => { if (confirmDeleteDraft) { draft.handleDeleteDraft(confirmDeleteDraft); setConfirmDeleteDraft(null); } }} disabled={!!draft.deletingDraftId}>
              {draft.deletingDraftId ? "Deleting..." : "Delete Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draft Editor Dialog */}
      <DraftEditorDialog
        order={draft.editingDraft}
        items={draft.draftItems}
        notes={draft.draftNotes}
        total={draft.draftTotal}
        isSubmitting={draft.submittingDraft}
        onUpdateQuantity={draft.updateDraftItemQty}
        onRemoveItem={draft.removeDraftItem}
        onUpdateNotes={draft.setDraftNotes}
        onSubmit={draft.submitDraft}
        onClose={() => draft.setEditingDraft(null)}
        onAddProducts={() => setShowAddProducts(true)}
      />

      {/* Add Products to Draft Dialog */}
      {draft.editingDraft && client && (
        <AddProductsDialog
          open={showAddProducts}
          onClose={() => setShowAddProducts(false)}
          clientId={client.id}
          editingDraft={draft.editingDraft}
          draftItems={draft.draftItems}
          onItemsAdded={(newItems) => draft.setDraftItems((prev) => [...prev, ...newItems])}
        />
      )}
    </div>
  );
};

export default DealerOrders;
