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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Save, ShoppingBag, TrendingUp, MapPin, Mail, Phone, Globe, Building2, UserPlus, Trash2, X, Eye, KeyRound, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { format } from "date-fns";

// discount tiers are now fetched dynamically from DB

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-chart-4/20 text-chart-4",
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
  Delivered: "bg-success/20 text-success",
  "To be prepared": "bg-warning/20 text-warning",
  Ready: "bg-chart-4/20 text-chart-4",
  "On the road": "bg-primary/20 text-primary",
  Payed: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
  Returned: "bg-destructive/20 text-destructive",
  lost: "bg-destructive/20 text-destructive",
};

const AdminClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newContact, setNewContact] = useState({ contact_name: "", email: "", phone: "", role: "" });
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState("dealer2025");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: client, isLoading } = useQuery({
    queryKey: ["admin-client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: discountTiers } = useQuery({
    queryKey: ["discount-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("discount_tiers").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
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

  const { data: contacts } = useQuery({
    queryKey: ["admin-client-contacts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: true });
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
    address: "",
    website: "",
    business_type: "",
    vat_number: "",
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
        address: client.address || "",
        website: client.website || "",
        business_type: client.business_type || "",
        vat_number: client.vat_number || "",
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
      toast.success("Client updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteClient = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast.success("Client deleted");
      navigate("/admin/clients");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addContact = useMutation({
    mutationFn: async () => {
      if (!newContact.contact_name) throw new Error("Name is required");
      const { error } = await supabase.from("client_contacts").insert({
        client_id: id!,
        ...newContact,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-contacts", id] });
      setNewContact({ contact_name: "", email: "", phone: "", role: "" });
      setShowAddContact(false);
      toast.success("Contact added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeContact = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase.from("client_contacts").delete().eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-contacts", id] });
      toast.success("Contact removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createDealerAccount = async () => {
    if (!client?.email) { toast.error("Il cliente deve avere un'email"); return; }
    setCreatingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-dealer-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          client_id: id,
          email: client.email,
          password: accountPassword,
        }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success("Account dealer creato!");
      queryClient.invalidateQueries({ queryKey: ["admin-client", id] });
      setShowCreateAccount(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreatingAccount(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const totalSpent = orders?.filter(o => o.status !== "draft").reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
  const totalOrders = orders?.length || 0;
  const tier = discountTiers[form.discount_class] || discountTiers.D;

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy"); } catch { return "—"; }
  };

  if (isLoading) return <div className="text-muted-foreground p-6">Loading...</div>;
  if (!client) return <div className="text-muted-foreground p-6">Client not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clients")} className="text-muted-foreground">
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
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
                deleteClient.mutate();
              }
            }}
            className="gap-1"
          >
            <Trash2 size={14} /> Delete
          </Button>
        </div>
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
        </div>
        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-primary" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Total Revenue</span>
          </div>
          <p className="font-heading text-xl font-bold text-foreground">€{totalSpent.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Form + Contacts */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card-solid p-6">
            <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
              <Building2 size={16} /> Company Details
            </h2>
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
                {form.business_type && (
                  <Badge className="mt-2 bg-primary/15 text-primary border-0">{form.business_type}</Badge>
                )}
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

          {/* Contacts */}
          <div className="glass-card-solid p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
                <Phone size={16} /> Contacts
              </h2>
              <Button size="sm" variant="outline" onClick={() => setShowAddContact(true)} className="gap-1 text-xs">
                <UserPlus size={12} /> Add
              </Button>
            </div>

            {/* Legacy main contact */}
            {form.contact_name && (
              <div className="p-3 bg-secondary/50 rounded-lg mb-3 text-sm space-y-1">
                <p className="font-semibold text-foreground">{form.contact_name} <span className="text-muted-foreground font-normal text-xs">· Main</span></p>
                {form.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10} /> {form.email}</p>}
                {form.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {form.phone}</p>}
              </div>
            )}

            {/* Additional contacts */}
            {contacts?.map(c => (
              <div key={c.id} className="p-3 bg-secondary/50 rounded-lg mb-2 text-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{c.contact_name} {c.role && <span className="text-muted-foreground font-normal text-xs">· {c.role}</span>}</p>
                    {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10} /> {c.email}</p>}
                    {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {c.phone}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeContact.mutate(c.id)} className="text-destructive h-6 w-6 p-0">
                    <X size={12} />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add contact form */}
            {showAddContact && (
              <div className="p-3 border border-border rounded-lg space-y-2 mt-3">
                <Input placeholder="Name *" value={newContact.contact_name} onChange={e => setNewContact(c => ({ ...c, contact_name: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                <Input placeholder="Role (e.g. Sales Manager)" value={newContact.role} onChange={e => setNewContact(c => ({ ...c, role: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                <Input placeholder="Email" value={newContact.email} onChange={e => setNewContact(c => ({ ...c, email: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                <Input placeholder="Phone" value={newContact.phone} onChange={e => setNewContact(c => ({ ...c, phone: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => addContact.mutate()} disabled={addContact.isPending} className="bg-foreground text-background text-xs flex-1">Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddContact(false)} className="text-xs">Cancel</Button>
                </div>
              </div>
            )}

            {!contacts?.length && !form.contact_name && !showAddContact && (
              <p className="text-xs text-muted-foreground">No contacts added yet</p>
            )}
          </div>

          {/* Portal Access */}
          <div className="glass-card-solid p-6">
            <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
              <KeyRound size={16} /> Portal Access
            </h2>
            {client?.user_id ? (
              <div className="space-y-3">
                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-xs text-success font-semibold mb-2">✅ Account Attivo</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono text-foreground">{client.email}</p>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(client.email || "", "email")}>
                          {copied === "email" ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                        </Button>
                      </div>
                    </div>
                    {(client as any).portal_password && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Password</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono text-foreground">{(client as any).portal_password}</p>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard((client as any).portal_password, "password")}>
                            {copied === "password" ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Nessun account portale creato</p>
                <Button size="sm" onClick={() => setShowCreateAccount(true)} className="w-full gap-1" disabled={!client?.email}>
                  <UserPlus size={14} /> Crea Account Dealer
                </Button>
                {!client?.email && <p className="text-[10px] text-destructive">⚠️ Inserisci prima un'email al cliente</p>}
              </div>
            )}
          </div>

          {/* Pricing & Status */}
          <div className="glass-card-solid p-6">
            <h2 className="font-heading font-bold text-foreground mb-4">Pricing & Status</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Discount Class</Label>
                <Select value={form.discount_class} onValueChange={v => setForm(f => ({ ...f, discount_class: v }))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(discountTiers).map(([key, val]) => (
                      <SelectItem key={key} value={key}>Class {key} — {val.label} (-{val.pct}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">✅ Attivo</SelectItem>
                    <SelectItem value="inactive">❌ Non Attivo</SelectItem>
                    <SelectItem value="onboarding">🔄 In Attivazione</SelectItem>
                    <SelectItem value="lead">📋 Lead</SelectItem>
                    <SelectItem value="suspended">⛔ Sospeso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
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

        {/* Right: Orders */}
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
                    <TableHead className="text-xs">Order Code</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Payment</TableHead>
                    <TableHead className="text-xs">Items</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(o => (
                    <TableRow key={o.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => setSelectedOrder(o)}>
                      <TableCell className="font-mono text-xs font-semibold">{(o as any).order_code || `#${o.id.slice(0, 8)}`}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 text-[10px] ${statusColors[o.status || "draft"] || "bg-muted text-muted-foreground"}`}>{o.status || "draft"}</Badge>
                      </TableCell>
                      <TableCell>
                        {(o as any).payment_status ? (
                          <Badge className={`border-0 text-[10px] ${(o as any).payment_status === 'Payed' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                            {(o as any).payment_status}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{(o.order_items as any[])?.length || 0}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">€{Number(o.total_amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Eye size={14} className="text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Popup */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-lg">
                  Order {(selectedOrder as any).order_code || `#${selectedOrder.id.slice(0, 8)}`}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {fmtDate(selectedOrder.created_at)} · <Badge className={`border-0 text-[10px] ${statusColors[selectedOrder.status || "draft"] || "bg-muted text-muted-foreground"}`}>{selectedOrder.status || "draft"}</Badge>
                </p>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 text-sm my-4">
                <div>
                  <p className="text-muted-foreground text-xs">Payment</p>
                  <p className="font-semibold">{(selectedOrder as any).payment_status || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Shipping</p>
                  <p className="font-semibold">€{Number((selectedOrder as any).shipping_cost_client || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Payed Date</p>
                  <p className="font-semibold">{fmtDate((selectedOrder as any).payed_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Delivery Date</p>
                  <p className="font-semibold">{fmtDate((selectedOrder as any).delivery_date)}</p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                    <TableHead className="text-xs text-right">Unit Price</TableHead>
                    <TableHead className="text-xs text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((selectedOrder.order_items || []) as any[]).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="text-sm font-semibold">{item.products?.name || "—"}</p>
                        {item.products?.sku && <p className="text-xs text-muted-foreground font-mono">{item.products.sku}</p>}
                      </TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">€{Number(item.unit_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">€{Number(item.subtotal).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
                <span className="text-sm text-muted-foreground">Products Total</span>
                <span className="font-heading text-lg font-bold">€{Number(selectedOrder.total_amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
              </div>
              {Number((selectedOrder as any).shipping_cost_client || 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">+ Shipping</span>
                  <span className="text-sm text-muted-foreground">€{Number((selectedOrder as any).shipping_cost_client).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={() => {
                  setSelectedOrder(null);
                  navigate(`/admin/orders/${selectedOrder.id}`);
                }}>
                  Open Full Detail
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog open={showCreateAccount} onOpenChange={setShowCreateAccount}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Crea Account Dealer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={client?.email || ""} disabled className="mt-1 bg-secondary border-border rounded-lg" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Password</Label>
              <Input value={accountPassword} onChange={e => setAccountPassword(e.target.value)} className="mt-1 bg-secondary border-border rounded-lg font-mono" />
            </div>
            <Button onClick={createDealerAccount} disabled={creatingAccount} className="w-full gap-1">
              <UserPlus size={14} /> {creatingAccount ? "Creazione..." : "Crea Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClientDetail;
