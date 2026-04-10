import { Button } from "@/components/ui/button";
import { Tag, Plus, Trash2 } from "lucide-react";

interface Props {
  assignedPriceLists: any[] | undefined;
  allPriceLists: any[] | undefined;
  removePriceList: (plcId: string) => void;
  assignPriceList: (priceListId: string) => void;
}

export const ClientPriceListsTab = ({ assignedPriceLists, allPriceLists, removePriceList, assignPriceList }: Props) => (
  <div className="glass-card-solid p-6 space-y-6">
    <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
      <Tag size={16} /> Listini Assegnati
    </h2>
    
    {assignedPriceLists && assignedPriceLists.length > 0 ? (
      <div className="space-y-2">
        {assignedPriceLists.map((plc: any) => (
          <div key={plc.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-foreground">{plc.price_lists?.name}</p>
              {plc.price_lists?.description && <p className="text-xs text-muted-foreground">{plc.price_lists.description}</p>}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20" onClick={() => removePriceList(plc.id)}>
              <Trash2 size={14} className="text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Nessun listino assegnato a questo cliente.</p>
    )}
    
    <div>
      <p className="text-xs text-muted-foreground mb-2">Aggiungi listino:</p>
      <div className="flex flex-wrap gap-2">
        {allPriceLists?.filter(pl => !assignedPriceLists?.some((a: any) => a.price_list_id === pl.id)).map(pl => (
          <Button key={pl.id} variant="outline" size="sm" className="text-xs gap-1" onClick={() => assignPriceList(pl.id)}>
            <Plus size={12} /> {pl.name}
          </Button>
        ))}
      </div>
    </div>
  </div>
);
