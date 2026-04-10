import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Eye, Tag, Plus, Pencil, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "./constants";
import type { Tables } from "@/integrations/supabase/types";

interface OrganizationPricingTabProps {
  clientId: string;
  client: Tables<"clients">;
  discountTiers: Tables<"discount_tiers">[];
  allPriceLists: Tables<"price_lists">[];
  assignedPriceLists: Array<{ id: string; price_list_id: string; created_at: string; price_lists: { id: string; name: string; description: string | null; discount_tier_id: string | null } | null }>;
  priceListItemCounts: Record<string, number>;
  onAssignPriceList: (id: string) => Promise<void>;
  onRemovePriceList: (id: string) => Promise<void>;
  onUpdateVisibility: (field: "show_discount_tiers" | "show_goals", value: boolean) => Promise<void>;
}

export function OrganizationPricingTab({
  client, discountTiers, allPriceLists, assignedPriceLists,
  priceListItemCounts, onAssignPriceList, onRemovePriceList, onUpdateVisibility,
}: OrganizationPricingTabProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [customPricesOpen, setCustomPricesOpen] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);

  const { data: previewItems } = useQuery({
    queryKey: ["price-list-preview", selectedListId],
    queryFn: async () => {
      const { data } = await supabase.from("price_list_items").select("*, products(name, sku, category, price)").eq("price_list_id", selectedListId);
      return data || [];
    },
    enabled: !!selectedListId,
  });

  const { data: editItems, refetch: refetchEditItems } = useQuery({
    queryKey: ["price-list-edit-items", editingListId],
    queryFn: async () => {
      const { data } = await supabase.from("price_list_items").select("*, products(name, sku, category, price)").eq("price_list_id", editingListId!);
      return data || [];
    },
    enabled: !!editingListId,
  });

  const handleAssign = async () => {
    if (!selectedListId) return;
    await onAssignPriceList(selectedListId);
    setAssignDialogOpen(false);
    setSelectedListId("");
  };

  const updateItemPrice = async (itemId: string, newPrice: number) => {
    const { error } = await supabase.from("price_list_items").update({ custom_price: newPrice }).eq("id", itemId);
    if (error) toast.error(error.message);
    else { toast.success("Price updated"); refetchEditItems(); }
  };

  const unassignedLists = allPriceLists.filter(pl => !assignedPriceLists.some(a => a.price_list_id === pl.id));

  return (
    <div className="space-y-6">
      {/* Dealer Portal Visibility */}
      <div className="glass-card-solid p-5">
        <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
          <Eye size={14} /> Dealer Portal Visibility
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-foreground">Discount Tiers</p>
              <p className="text-xs text-muted-foreground">Show discount tiers to the dealer</p>
            </div>
            <Switch checked={client.show_discount_tiers ?? true} onCheckedChange={(checked) => onUpdateVisibility("show_discount_tiers", checked)} />
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-foreground">Goals & Rewards</p>
              <p className="text-xs text-muted-foreground">Show Goals & Rewards page to the dealer</p>
            </div>
            <Switch checked={client.show_goals ?? true} onCheckedChange={(checked) => onUpdateVisibility("show_goals", checked)} />
          </div>
        </div>
      </div>

      {/* Assigned Price Lists */}
      <div className="glass-card-solid p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-foreground flex items-center gap-2 text-sm">
            <Tag size={14} /> Assigned Price Lists
          </h3>
          <Button size="sm" className="gap-1" onClick={() => setAssignDialogOpen(true)}>
            <Plus size={14} /> Assign Price List
          </Button>
        </div>

        {assignedPriceLists.length > 0 ? (
          <div className="space-y-2 mb-4">
            {assignedPriceLists.map((plc) => {
              const tier = discountTiers.find(t => t.id === plc.price_lists?.discount_tier_id);
              const itemCount = priceListItemCounts[plc.price_list_id] || 0;
              return (
                <div key={plc.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{plc.price_lists?.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {plc.price_lists?.description && <p className="text-xs text-muted-foreground">{plc.price_lists.description}</p>}
                      {tier && <Badge variant="outline" className="text-[10px]">-{tier.discount_pct}%</Badge>}
                      <span className="text-[10px] text-muted-foreground">{itemCount} products</span>
                      <span className="text-[10px] text-muted-foreground">· Assigned on: {fmtDate(plc.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => { setEditingListId(plc.price_list_id); setCustomPricesOpen(true); }}>
                      <Pencil size={12} /> Edit Discounts
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20" onClick={() => onRemovePriceList(plc.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg mb-4">
            <p className="text-sm font-semibold text-warning">⚠️ No price lists assigned</p>
            <p className="text-xs text-muted-foreground mt-1">The client cannot view prices in the portal. Assign a price list to enable orders.</p>
          </div>
        )}
      </div>

      {/* Assign Price List Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Assign Price List a {client.company_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Select Price List</Label>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Choose a price list..." /></SelectTrigger>
                <SelectContent>
                  {unassignedLists.map(pl => {
                    const tier = discountTiers.find(t => t.id === pl.discount_tier_id);
                    const itemCount = priceListItemCounts[pl.id] || 0;
                    return (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.name} {tier ? `(-${tier.discount_pct}%)` : ""} · {itemCount} products
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {assignedPriceLists.length > 0 && (
              <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                Current list: <strong>{assignedPriceLists.map(a => a.price_lists?.name).join(", ")}</strong>. The new list will be added.
              </p>
            )}

            {selectedListId && (() => {
              const sel = allPriceLists.find(pl => pl.id === selectedListId);
              const tier = discountTiers.find(t => t.id === sel?.discount_tier_id);
              const count = priceListItemCounts[selectedListId] || 0;
              return sel ? (
                <div className="p-3 bg-secondary/50 rounded-lg text-xs space-y-1">
                  <p className="font-semibold text-foreground">{sel.name}</p>
                  {sel.description && <p className="text-muted-foreground">{sel.description}</p>}
                  <p className="text-muted-foreground">{count} products included {tier ? `· Base discount: -${tier.discount_pct}%` : ""}</p>
                </div>
              ) : null;
            })()}

            {selectedListId && (
              <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs text-right">Base Price</TableHead>
                      <TableHead className="text-xs text-right">List Price</TableHead>
                      <TableHead className="text-xs text-right">Sconto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewItems?.map((item: any) => {
                      const basePrice = item.products?.price || 0;
                      const discount = basePrice > 0 ? Math.round((1 - item.custom_price / basePrice) * 100) : 0;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-medium">{item.products?.name || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.products?.category || "—"}</TableCell>
                          <TableCell className="text-xs text-right text-muted-foreground">€{Number(basePrice).toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right font-semibold">€{Number(item.custom_price).toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right">
                            <Badge variant="outline" className="text-[10px]">-{discount}%</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {previewItems?.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">No products in list</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <Button onClick={handleAssign} disabled={!selectedListId} className="w-full">
              <Check size={14} className="mr-1" /> Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Prices Dialog */}
      <Dialog open={customPricesOpen} onOpenChange={(open) => { setCustomPricesOpen(open); if (!open) setEditingListId(null); }}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader><DialogTitle className="font-heading">Edit Discounts Personalizzati</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs text-right">Base Price</TableHead>
                  <TableHead className="text-xs text-right">Discount %</TableHead>
                  <TableHead className="text-xs text-right">Custom Price (€)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editItems?.map((item: any) => {
                  const basePrice = item.products?.price || 0;
                  const currentDiscount = basePrice > 0 ? Math.round((1 - item.custom_price / basePrice) * 100) : 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-medium">{item.products?.name || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.products?.category || "—"}</TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">€{Number(basePrice).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right">
                        <Badge variant="outline" className="text-[10px]">-{currentDiscount}%</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="h-7 w-24 text-xs text-right bg-secondary border-border ml-auto"
                          defaultValue={item.custom_price}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val !== item.custom_price) {
                              updateItemPrice(item.id, val);
                            }
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {editItems?.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">No products in list</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
