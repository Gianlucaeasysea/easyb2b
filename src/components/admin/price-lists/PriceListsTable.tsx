import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Copy, ChevronRight, Package, Users, Tag } from "lucide-react";

interface PriceListsTableProps {
  priceLists: any[];
  tiers: any[];
  allListItemCounts: Record<string, number>;
  allListClientCounts: Record<string, number>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDuplicate: (pl: any) => void;
  onEdit: (pl: any) => void;
  onDelete: (id: string) => void;
}

const tierColors: Record<string, string> = {
  gold: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  silver: "bg-gray-300/30 text-gray-600 border-gray-400/30",
  bronze: "bg-orange-400/20 text-orange-600 border-orange-400/30",
  standard: "bg-muted text-muted-foreground border-border",
};

export default function PriceListsTable({
  priceLists, tiers, allListItemCounts, allListClientCounts,
  selectedId, onSelect, onDuplicate, onEdit, onDelete,
}: PriceListsTableProps) {
  return (
    <div className="space-y-2">
      {priceLists.map(pl => {
        const tier = tiers?.find(t => t.id === pl.discount_tier_id);
        const isActive = selectedId === pl.id;
        const itemCount = allListItemCounts?.[pl.id] || 0;
        const clientCount = allListClientCounts?.[pl.id] || 0;
        return (
          <Card
            key={pl.id}
            className={`cursor-pointer transition-all hover:shadow-md ${isActive ? "ring-2 ring-primary bg-primary/5" : "hover:bg-secondary/30"}`}
            onClick={() => onSelect(isActive ? null : pl.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{pl.name}</span>
                    {isActive && <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  {pl.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{pl.description}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    {tier && (
                      <Badge variant="outline" className={`text-[10px] ${tierColors[tier.name] || ""}`}>
                        {tier.label} -{tier.discount_pct}%
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" /> {itemCount}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {clientCount}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(pl)} title="Duplica listino">
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(pl)}>
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(pl.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {!priceLists.length && (
        <div className="text-center py-12 text-muted-foreground">
          <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nessun listino creato</p>
        </div>
      )}
    </div>
  );
}
