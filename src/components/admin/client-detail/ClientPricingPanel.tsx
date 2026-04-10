import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Eye, Save } from "lucide-react";

interface Props {
  form: any;
  setForm: (fn: (f: any) => any) => void;
  client: any;
  assignedPriceLists: any[] | undefined;
  togglePortalVisibility: (field: string, checked: boolean) => void;
  updateClient: { mutate: () => void; isPending: boolean };
}

export const ClientPricingPanel = ({ form, setForm, client, assignedPriceLists, togglePortalVisibility, updateClient }: Props) => (
  <>
    <div className="glass-card-solid p-6">
      <h2 className="font-heading font-bold text-foreground mb-4">Pricing & Status</h2>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Price List</Label>
          <p className="text-sm font-semibold text-foreground mt-1">
            {assignedPriceLists && assignedPriceLists.length > 0
              ? (assignedPriceLists as any[]).map((plc: any) => plc.price_lists?.name).filter(Boolean).join(", ")
              : "No price list assigned"}
          </p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground font-semibold">Payment Terms</Label>
          <Select value={form.payment_terms || "100% upfront"} onValueChange={v => setForm(f => ({ ...f, payment_terms: v }))}>
            <SelectTrigger className="mt-1 bg-secondary border-border rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="100% upfront">100% Upfront — Full payment in advance</SelectItem>
              <SelectItem value="Net 30">Net 30 — Payment within 30 days of delivery</SelectItem>
              <SelectItem value="Net 60">Net 60 — Payment within 60 days of delivery</SelectItem>
              <SelectItem value="50/50">50/50 — 50% upfront, 50% on delivery</SelectItem>
              <SelectItem value="Custom">Custom — Specify in notes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Payment Notes</Label>
          <Textarea value={form.payment_terms_notes || ""} onChange={e => setForm(f => ({ ...f, payment_terms_notes: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" rows={2} placeholder="Special conditions..." />
        </div>

        <div className="glass-card-solid p-4 mt-4 space-y-3">
          <h3 className="font-heading font-bold text-foreground text-sm flex items-center gap-2">
            <Eye size={14} /> Dealer Portal Visibility
          </h3>
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-foreground">Discount Tiers</p>
              <p className="text-xs text-muted-foreground">Show discount tiers to the dealer</p>
            </div>
            <Switch checked={client?.show_discount_tiers ?? true} onCheckedChange={(checked) => togglePortalVisibility("show_discount_tiers", checked)} />
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-foreground">Goals & Rewards</p>
              <p className="text-xs text-muted-foreground">Show the Goals & Rewards page to the dealer</p>
            </div>
            <Switch checked={client?.show_goals ?? true} onCheckedChange={(checked) => togglePortalVisibility("show_goals", checked)} />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger className="mt-1 bg-secondary border-border rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">✅ Active</SelectItem>
              <SelectItem value="inactive">❌ Inactive</SelectItem>
              <SelectItem value="onboarding">🔄 Onboarding</SelectItem>
              <SelectItem value="lead">📋 Lead</SelectItem>
              <SelectItem value="suspended">⛔ Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg min-h-[80px]" />
        </div>
      </div>
    </div>

    <Button onClick={() => updateClient.mutate()} disabled={updateClient.isPending} className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-lg font-heading font-semibold gap-2">
      <Save size={16} /> Save Changes
    </Button>
  </>
);
