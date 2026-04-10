import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Globe } from "lucide-react";

interface Props {
  form: any;
  setForm: (fn: (f: any) => any) => void;
}

export const ClientCompanyPanel = ({ form, setForm }: Props) => (
  <div className="glass-card-solid p-6">
    <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2"><Building2 size={16} /> Company Details</h2>
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Company Name</Label>
        <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Business Type</Label>
        <Select value={form.business_type || "_custom"} onValueChange={v => { if (v !== "_custom") setForm(f => ({ ...f, business_type: v })); }}>
          <SelectTrigger className="mt-1 bg-secondary border-border rounded-lg"><SelectValue placeholder="Select type..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Reseller">Reseller</SelectItem>
            <SelectItem value="Distributor">Distributor</SelectItem>
            <SelectItem value="Rigger">Rigger</SelectItem>
            <SelectItem value="Dropshipper">Dropshipper</SelectItem>
            <SelectItem value="Boat Builder">Boat Builder</SelectItem>
            <SelectItem value="_custom">Custom...</SelectItem>
          </SelectContent>
        </Select>
        {(form.business_type && !["Reseller","Distributor","Rigger","Dropshipper","Boat Builder"].includes(form.business_type)) && (
          <Input value={form.business_type} onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))} placeholder="Enter custom type..." className="mt-2 bg-secondary border-border rounded-lg" />
        )}
        {form.business_type && <Badge className="mt-2 bg-primary/15 text-primary border-0">{form.business_type}</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} /> Country</Label>
          <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1"><Globe size={10} /> Region</Label>
          <Input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Address</Label>
        <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Website</Label>
        <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">VAT Number</Label>
        <Input value={form.vat_number} onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
      </div>
    </div>
  </div>
);
