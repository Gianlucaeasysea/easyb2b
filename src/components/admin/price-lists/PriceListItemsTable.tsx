import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Trash2, Package, Plus, Percent } from "lucide-react";

interface PriceListItemsTableProps {
  items: any[];
  products: any[];
  onUpdatePrice: (itemId: string, price: number) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onSwitchToAdd: () => void;
  bulkDiscount: string;
  onBulkDiscountChange: (val: string) => void;
  onApplyBulkDiscount: () => void;
}

export default function PriceListItemsTable({
  items, products, onUpdatePrice, onRemoveItem, onSwitchToAdd,
  bulkDiscount, onBulkDiscountChange, onApplyBulkDiscount,
}: PriceListItemsTableProps) {
  const [itemSearch, setItemSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!itemSearch) return items;
    const q = itemSearch.toLowerCase();
    return items.filter(item => {
      const prod = products?.find(p => p.id === item.product_id);
      return prod?.name.toLowerCase().includes(q) || prod?.sku?.toLowerCase().includes(q);
    });
  }, [items, itemSearch, products]);

  if (!items?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
        <p className="text-sm mb-3">Nessun prodotto nel listino</p>
        <Button size="sm" variant="outline" onClick={onSwitchToAdd}>
          <Plus className="h-3 w-3 mr-1" /> Aggiungi prodotti
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input placeholder="Cerca nel listino..." className="pl-9 h-9" value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5">
          <Input type="number" placeholder="Sconto %" className="w-24 h-9" value={bulkDiscount} onChange={e => onBulkDiscountChange(e.target.value)} />
          <Button size="sm" variant="secondary" onClick={onApplyBulkDiscount} disabled={!bulkDiscount} className="h-9 gap-1">
            <Percent className="h-3 w-3" /> Applica a tutti
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-[35%]">Prodotto</TableHead>
              <TableHead className="text-xs w-[12%]">SKU</TableHead>
              <TableHead className="text-xs w-[12%] text-right">Base</TableHead>
              <TableHead className="text-xs w-[18%]">Prezzo Listino</TableHead>
              <TableHead className="text-xs w-[12%] text-center">Sconto</TableHead>
              <TableHead className="text-xs w-[5%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map(item => {
              const prod = products?.find(p => p.id === item.product_id);
              const shopifyPriceGross = prod?.price || 0;
              const shopifyPrice = shopifyPriceGross / 1.22; // scorporo IVA 22%
              const discount = shopifyPrice > 0 ? Math.round((1 - item.custom_price / shopifyPrice) * 100) : 0;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {prod?.images?.[0] && (
                        <img src={prod.images[0]} alt="" className="h-8 w-8 rounded object-cover bg-secondary" />
                      )}
                      <span className="text-sm font-medium truncate">{prod?.name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{prod?.sku || "—"}</TableCell>
                  <TableCell className="text-sm text-right text-muted-foreground">€{shopifyPrice.toFixed(2)}</TableCell>
                  <TableCell>
                    <Input
                      type="number" step="0.01" className="w-28 h-8 text-sm font-medium"
                      defaultValue={item.custom_price}
                      onBlur={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val !== item.custom_price) onUpdatePrice(item.id, val);
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`text-xs ${discount > 0 ? "bg-green-500/10 text-green-600 border-green-500/30" : ""}`}>
                      {discount > 0 ? `-${discount}%` : "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
