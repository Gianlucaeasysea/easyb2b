import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Trash2, Edit3 } from "lucide-react";
import { format } from "date-fns";
import type { Order } from "@/types/orders";

interface DraftsListProps {
  drafts: Order[];
  onEditDraft: (order: Order) => void;
  onDeleteDraft: (order: Order) => void;
}

const DraftsList = ({ drafts, onEditDraft, onDeleteDraft }: DraftsListProps) => {
  if (drafts.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="font-heading text-lg font-bold text-foreground mb-3 flex items-center gap-2">
        <Edit3 size={16} /> Drafts ({drafts.length})
      </h2>
      <div className="space-y-2">
        {drafts.map((order) => {
          const items = order.order_items || [];
          return (
            <div key={order.id} className="glass-card-solid p-4 flex items-center justify-between border-dashed border-2 border-border">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Package size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-heading font-bold text-foreground">
                    {order.order_code || `Draft #${order.id.slice(0, 8).toUpperCase()}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
                    {items.length > 0 && <span className="ml-2">· {items.length} product{items.length > 1 ? "s" : ""}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="border-0 text-xs bg-muted text-muted-foreground">Draft</Badge>
                <span className="font-heading font-bold text-foreground">
                  €{Number(order.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <Button size="sm" onClick={() => onEditDraft(order)}>Complete Order</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive/80"
                  onClick={() => onDeleteDraft(order)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DraftsList;
