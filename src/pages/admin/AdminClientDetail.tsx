import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, ShoppingBag, TrendingUp, MapPin, Mail, Phone, Globe, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { format } from "date-fns";

const discountTiers: Record<string, { label: string; pct: number }> = {
  A: { label: "Gold", pct: 30 },
  B: { label: "Silver", pct: 25 },
  C: { label: "Bronze", pct: 20 },
  D: { label: "Starter", pct: 15 },
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-chart-4/20 text-chart-4",
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
};

const AdminClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ["admin-client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-client-orders", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name, sku))")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    country: "",
    zone: "",
    status: "",
    discount_class: "",
    notes: "",
  });

  useEffect(() => {
    if (client) {
      setForm({
        company_name: client.company_name || "",
        contact_name: client.contact_name || "",
        email: client.email || "",
        phone: client.phone || "",
        country: client.country || "",
        zone: client.zone || "",
        status: client.status || "lead",
        discount_class: client.discount_class || "D",
        notes: client.notes || "",
      });
    }
  }, [client]);

  const updateClient = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").update(form).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast({ title: "Client updated successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const totalSpent = orders?.filter(o => o.status !== "draft").reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
  const totalOrders = orders?.length || 0;
  const tier = discountTiers[form.discount_class] || discountTiers.D;

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!client) return <div className="text-muted-foreground">Client not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clients")} className="text-muted-foreground">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-foreground">{form.company_name}</h1>
          <p className="text-sm text-muted-foreground">{form.contact_name} · {form.country}</p>
        </div>
        <Badge className={form.status === "active" ? "bg-success/20 text-success border-0" : "bg-warning/20 text-warning border-0"}>
          {form.status}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-primary" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Discount Tier</span>
          </div>
          <p className="font-heading text-xl font-bold text-foreground">Class {form.discount_class} — {tier.label}</p>
          <p className="text-xs text-success">-{tier.pct}% on all products</p>
        </div>
        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={16} className="text-primary" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Total Orders</span>
          </div>
          <p className="font-heading text-xl font-bold text-foreground">{totalOrders}</p>
          <p className="text-xs text-muted-foreground">{orders?.filter(o => o.status !== "draft" && o.status !== "delivered").length || 0} active</p>
        </div>
        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-primary" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Total Revenue</span>
          </div>
          <p className="font-heading text-xl font-bold text-foreground">€{totalSpent.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Lifetime value</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Edit Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card-solid p-6">
            <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
              <Building2 size={16} /> Company Details
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Company Name</Label>
                <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Name</Label>
                <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Mail size={10} /> Email</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Phone size={10} /> Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><MapPin size={10} /> Country</Label>
                  <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Globe size={10} /> Region</Label>
                  <Input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card-solid p-6">
            <h2 className="font-heading font-bold text-foreground mb-4">Pricing & Status</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Discount Class</Label>
                <Select value={form.discount_class} onValueChange={v => setForm(f => ({ ...f, discount_class: v }))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(discountTiers).map(([key, val]) => (
                      <SelectItem key={key} value={key}>Class {key} — {val.label} (-{val.pct}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg min-h-[80px]" />
              </div>
            </div>
          </div>

          <Button
            onClick={() => updateClient.mutate()}
            disabled={updateClient.isPending}
            className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-lg font-heading font-semibold gap-2"
          >
            <Save size={16} /> Save Changes
          </Button>
        </div>

        {/* Orders */}
        <div className="lg:col-span-2">
          <div className="glass-card-solid overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
                <ShoppingBag size={16} /> Order History
              </h2>
              <Badge variant="outline" className="text-xs">{totalOrders} orders</Badge>
            </div>
            {!orders?.length ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No orders yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Order ID</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Items</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(o => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(o.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 text-[10px] ${statusColors[o.status || "draft"]}`}>{o.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{(o.order_items as any[])?.length || 0} items</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">€{Number(o.total_amount || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminClientDetail;
