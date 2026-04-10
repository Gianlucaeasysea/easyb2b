import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, X } from "lucide-react";

interface Props {
  addresses: any[] | undefined;
  newAddr: { label: string; address_line: string; city: string; province: string; postal_code: string; country: string };
  setNewAddr: (fn: (a: any) => any) => void;
  showAddAddress: boolean;
  setShowAddAddress: (v: boolean) => void;
  addAddress: { mutate: () => void; isPending: boolean };
  removeAddress: { mutate: (id: string) => void };
}

export const ClientAddressesPanel = ({ addresses, newAddr, setNewAddr, showAddAddress, setShowAddAddress, addAddress, removeAddress }: Props) => (
  <div className="glass-card-solid p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><MapPin size={16} /> Shipping Addresses</h2>
      <Button size="sm" variant="outline" onClick={() => setShowAddAddress(true)} className="gap-1 text-xs"><Plus size={12} /> Add</Button>
    </div>
    {addresses?.map((a: any) => (
      <div key={a.id} className="p-3 bg-secondary/50 rounded-lg mb-2 text-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              {a.label || "Address"}
              {a.is_default && <Badge className="ml-2 text-[10px] bg-primary/20 text-primary border-0">Default</Badge>}
            </p>
            <p className="text-xs text-muted-foreground">{[a.address_line, a.city, a.province, a.postal_code, a.country].filter(Boolean).join(", ")}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => removeAddress.mutate(a.id)} className="text-destructive h-6 w-6 p-0"><X size={12} /></Button>
        </div>
      </div>
    ))}
    {showAddAddress && (
      <div className="p-3 border border-border rounded-lg space-y-2 mt-3">
        <Input placeholder="Label (e.g. Main)" value={newAddr.label} onChange={e => setNewAddr(a => ({ ...a, label: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
        <Input placeholder="Address *" value={newAddr.address_line} onChange={e => setNewAddr(a => ({ ...a, address_line: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="City" value={newAddr.city} onChange={e => setNewAddr(a => ({ ...a, city: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
          <Input placeholder="Province" value={newAddr.province} onChange={e => setNewAddr(a => ({ ...a, province: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Postal Code" value={newAddr.postal_code} onChange={e => setNewAddr(a => ({ ...a, postal_code: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
          <Input placeholder="Country" value={newAddr.country} onChange={e => setNewAddr(a => ({ ...a, country: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => addAddress.mutate()} disabled={addAddress.isPending} className="bg-foreground text-background text-xs flex-1">Save</Button>
          <Button size="sm" variant="outline" onClick={() => setShowAddAddress(false)} className="text-xs">Cancel</Button>
        </div>
      </div>
    )}
    {!addresses?.length && !showAddAddress && (
      <p className="text-xs text-muted-foreground">No shipping addresses</p>
    )}
  </div>
);
