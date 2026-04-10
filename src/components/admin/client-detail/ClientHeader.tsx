import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, ShoppingBag, TrendingUp } from "lucide-react";

interface ClientHeaderProps {
  form: { company_name: string; country: string; business_type: string; status: string };
  totalOrders: number;
  totalSpent: number;
  assignedPriceLists: any[] | undefined;
  client: any;
  onBack: () => void;
  onDelete: () => void;
}

export const ClientHeader = ({ form, totalOrders, totalSpent, assignedPriceLists, client, onBack, onDelete }: ClientHeaderProps) => (
  <>
    <div className="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        <ArrowLeft size={16} />
      </Button>
      <div className="flex-1">
        <h1 className="font-heading text-2xl font-bold text-foreground">{form.company_name}</h1>
        <p className="text-sm text-muted-foreground">{form.country} · {form.business_type || "—"}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={form.status === "active" ? "bg-success/20 text-success border-0" : form.status === "inactive" ? "bg-destructive/20 text-destructive border-0" : "bg-warning/20 text-warning border-0"}>
          {form.status}
        </Badge>
        <Button variant="destructive" size="sm" onClick={() => { if (confirm("Are you sure you want to delete this client?")) onDelete(); }} className="gap-1">
          <Trash2 size={14} /> Delete
        </Button>
      </div>
    </div>

    <div className="grid sm:grid-cols-3 gap-4 mb-8">
      <div className="glass-card-solid p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={16} className="text-primary" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Payment Terms</span>
        </div>
        <p className="font-heading text-xl font-bold text-foreground">
          {{ prepaid: "Anticipato", "30_days": "30 gg", "60_days": "60 gg", "90_days": "90 gg", end_of_month: "Fine mese" }[(client as any)?.payment_terms as string] || "30 gg"}
        </p>
        <p className="text-xs text-muted-foreground">Listino: {assignedPriceLists && assignedPriceLists.length > 0 ? (assignedPriceLists as any[]).map((plc: any) => plc.price_lists?.name).join(", ") : "—"}</p>
      </div>
      <div className="glass-card-solid p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBag size={16} className="text-primary" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Total Orders</span>
        </div>
        <p className="font-heading text-xl font-bold text-foreground">{totalOrders}</p>
      </div>
      <div className="glass-card-solid p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={16} className="text-primary" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Total Revenue</span>
        </div>
        <p className="font-heading text-xl font-bold text-foreground">€{totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
      </div>
    </div>
  </>
);
