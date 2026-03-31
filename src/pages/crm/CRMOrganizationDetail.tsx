import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Building2, Mail, Phone, Globe, MapPin, ShoppingBag,
  MessageCircle, Send, Clock, TrendingUp, Users, FileText, CalendarDays, BarChart3,
  Plus, Crown, Star, Pencil, Trash2, Check, X, StickyNote, Upload, Handshake, CheckSquare
} from "lucide-react";
import { isPast } from "date-fns";
import { format, differenceInDays, isValid } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ClientCommunications } from "@/components/crm/ClientCommunications";
import { ComposeEmailDialog } from "@/components/crm/ComposeEmailDialog";
import { CRMOrderDetailModal } from "@/components/crm/CRMOrderDetailModal";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-chart-4/20 text-chart-4",
  processing: "bg-primary/20 text-primary",
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
  Delivered: "bg-success/20 text-success",
  "To be prepared": "bg-warning/20 text-warning",
  Ready: "bg-chart-4/20 text-chart-4",
  "On the road": "bg-primary/20 text-primary",
  Payed: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
  lead: "bg-primary/20 text-primary",
  qualifying: "bg-warning/20 text-warning",
  onboarding: "bg-chart-4/20 text-chart-4",
  active: "bg-success/20 text-success",
  at_risk: "bg-destructive/20 text-destructive",
  churned: "bg-muted text-muted-foreground",
  disqualified: "bg-muted text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  lead: "Lead", qualifying: "Qualifying", onboarding: "Onboarding",
  active: "Active", at_risk: "At Risk", churned: "Churned", disqualified: "Disqualified",
};

const contactTypeColors: Record<string, string> = {
  decision_maker: "bg-destructive/20 text-destructive",
  buyer: "bg-primary/20 text-primary",
  operations: "bg-success/20 text-success",
  accounting: "bg-warning/20 text-warning",
  technical: "bg-chart-4/20 text-chart-4",
  general: "bg-muted text-muted-foreground",
};

const contactTypeLabels: Record<string, string> = {
  decision_maker: "Decision Maker",
  buyer: "Buyer",
  operations: "Operations",
  accounting: "Accounting",
  technical: "Technical",
  general: "General",
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return isValid(date) ? format(date, "dd MMM yyyy", { locale: it }) : "—";
  } catch { return "—"; }
};

const CRMOrganizationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeOrderCtx, setComposeOrderCtx] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    contact_name: "", email: "", phone: "", role: "", notes: "",
    job_title: "", department: "", contact_type: "general",
    preferred_channel: "email", linkedin_url: "", is_primary: false, is_decision_maker: false,
  });
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", type: "call", priority: "medium", due_date: "", description: "" });

  const { data: client, isLoading } = useQuery({
    queryKey: ["crm-org", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: orders } = useQuery({
    queryKey: ["crm-org-orders", id],
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

  const { data: contacts, refetch: refetchContacts } = useQuery({
    queryKey: ["crm-org-contacts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", id!)
        .order("is_primary", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: addresses } = useQuery({
    queryKey: ["crm-org-addresses", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_shipping_addresses").select("*").eq("client_id", id!);
      return (data as any[]) || [];
    },
    enabled: !!id,
  });

  const { data: activities } = useQuery({
    queryKey: ["crm-org-activities", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*, client_contacts(contact_name)")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: orgTasks, refetch: refetchTasks } = useQuery({
    queryKey: ["crm-org-tasks", id],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").eq("client_id", id!).order("due_date", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ["crm-org-documents", id],
    queryFn: async () => {
      const { data: clientDocs } = await supabase.from("client_documents").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      // Also get order documents
      const { data: orderIds } = await supabase.from("orders").select("id").eq("client_id", id!);
      let orderDocs: any[] = [];
      if (orderIds?.length) {
        const { data } = await supabase.from("order_documents").select("*").in("order_id", orderIds.map(o => o.id));
        orderDocs = data || [];
      }
      return [...(clientDocs || []), ...orderDocs];
    },
    enabled: !!id,
  });

  const totalSpent = orders?.filter(o => o.status !== "draft").reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
  const totalOrders = orders?.length || 0;

  // Contact mutations
  const saveContact = async () => {
    if (!contactForm.contact_name.trim()) { toast.error("Il nome è obbligatorio"); return; }
    const payload = {
      client_id: id!,
      contact_name: contactForm.contact_name.trim(),
      email: contactForm.email.trim() || null,
      phone: contactForm.phone.trim() || null,
      role: contactForm.role.trim() || null,
      notes: contactForm.notes.trim() || null,
      job_title: contactForm.job_title.trim() || null,
      department: contactForm.department.trim() || null,
      contact_type: contactForm.contact_type,
      preferred_channel: contactForm.preferred_channel,
      linkedin_url: contactForm.linkedin_url.trim() || null,
      is_primary: contactForm.is_primary,
      is_decision_maker: contactForm.is_decision_maker,
    } as any;

    if (editContactId) {
      const { error } = await supabase.from("client_contacts").update(payload).eq("id", editContactId);
      if (error) { toast.error("Errore aggiornamento"); return; }
      toast.success("Contatto aggiornato");
    } else {
      const { error } = await supabase.from("client_contacts").insert(payload);
      if (error) { toast.error("Errore salvataggio"); return; }
      toast.success("Contatto aggiunto");
    }
    setAddContactOpen(false);
    setEditContactId(null);
    resetContactForm();
    refetchContacts();
    queryClient.invalidateQueries({ queryKey: ["crm-org-primary-contacts"] });
  };

  const deleteContact = async (contactId: string) => {
    const { error } = await supabase.from("client_contacts").delete().eq("id", contactId);
    if (error) { toast.error("Errore eliminazione"); return; }
    toast.success("Contatto rimosso");
    refetchContacts();
  };

  const editContact = (c: any) => {
    setContactForm({
      contact_name: c.contact_name || "",
      email: c.email || "",
      phone: c.phone || "",
      role: c.role || "",
      notes: c.notes || "",
      job_title: c.job_title || "",
      department: c.department || "",
      contact_type: c.contact_type || "general",
      preferred_channel: c.preferred_channel || "email",
      linkedin_url: c.linkedin_url || "",
      is_primary: c.is_primary || false,
      is_decision_maker: c.is_decision_maker || false,
    });
    setEditContactId(c.id);
    setAddContactOpen(true);
  };

  const resetContactForm = () => {
    setContactForm({
      contact_name: "", email: "", phone: "", role: "", notes: "",
      job_title: "", department: "", contact_type: "general",
      preferred_channel: "email", linkedin_url: "", is_primary: false, is_decision_maker: false,
    });
  };

  // Activity with contact selection
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [actForm, setActForm] = useState({ title: "", type: "call", body: "", contact_id: "" });

  const addActivity = async () => {
    if (!actForm.title.trim()) return;
    const { error } = await supabase.from("activities").insert({
      client_id: id!,
      title: actForm.title.trim(),
      type: actForm.type,
      body: actForm.body.trim() || null,
      contact_id: actForm.contact_id || null,
      created_by: user?.id,
    } as any);
    if (error) { toast.error("Errore"); return; }
    toast.success("Attività aggiunta");
    setAddActivityOpen(false);
    setActForm({ title: "", type: "call", body: "", contact_id: "" });
    queryClient.invalidateQueries({ queryKey: ["crm-org-activities", id] });
  };

  const openWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/[^+\d]/g, "");
    window.open(`https://wa.me/${clean.replace("+", "")}?text=${encodeURIComponent(`Buongiorno ${name}, sono il team commerciale EasySea.`)}`, "_blank");
  };

  if (isLoading) return <div className="text-muted-foreground p-6">Caricamento...</div>;
  if (!client) return <div className="text-muted-foreground p-6">Organizzazione non trovata</div>;

  const lastOrderDate = client.last_order_date;
  const daysSinceLastOrder = client.days_since_last_order;
  const avgFrequency = client.avg_order_frequency_days;
  const nextReorder = client.next_reorder_expected_date;
  const nextReorderDays = nextReorder ? differenceInDays(new Date(nextReorder), new Date()) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-foreground">{client.company_name}</h1>
          <p className="text-sm text-muted-foreground">
            {client.contact_name && `${client.contact_name} · `}
            {client.country || ""} {client.zone ? `· ${client.zone}` : ""}
          </p>
        </div>
        <Badge className={`border-0 ${statusColors[client.status || "lead"]}`}>
          {statusLabel[client.status || "lead"] || client.status || "lead"}
        </Badge>
        {client.email && (
          <Button size="sm" onClick={() => setComposeOpen(true)} className="gap-1">
            <Send size={14} /> Email
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-5 gap-4 mb-6">
        <div className="glass-card-solid p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={14} className="text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">Ordini</span>
          </div>
          <p className="font-heading text-xl font-bold text-foreground">{client.total_orders_count || totalOrders}</p>
        </div>
        <div className="glass-card-solid p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">Fatturato</span>
          </div>
          <p className="font-heading text-xl font-bold text-foreground">€{(client.total_orders_value || totalSpent).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-card-solid p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays size={14} className="text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">Ultimo Ordine</span>
          </div>
          <p className="font-heading text-sm font-bold text-foreground">{lastOrderDate ? fmtDate(lastOrderDate) : "—"}</p>
          {daysSinceLastOrder != null && <p className="text-[10px] text-muted-foreground">{daysSinceLastOrder}d fa</p>}
        </div>
        <div className="glass-card-solid p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} className="text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">Freq. Media</span>
          </div>
          <p className="font-heading text-xl font-bold text-foreground">{avgFrequency ? `${avgFrequency}d` : "—"}</p>
        </div>
        <div className="glass-card-solid p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className={nextReorderDays !== null && nextReorderDays < 0 ? "text-destructive" : nextReorderDays !== null && nextReorderDays <= 7 ? "text-warning" : "text-success"} />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">Next Reorder</span>
          </div>
          {nextReorder ? (
            <>
              <p className={`font-heading text-sm font-bold ${nextReorderDays !== null && nextReorderDays < 0 ? "text-destructive" : nextReorderDays !== null && nextReorderDays <= 7 ? "text-warning" : "text-success"}`}>
                {fmtDate(nextReorder)}
              </p>
              <p className="text-[10px] text-muted-foreground">{nextReorderDays !== null && nextReorderDays < 0 ? `${Math.abs(nextReorderDays)}d scaduto` : `tra ${nextReorderDays}d`}</p>
            </>
          ) : (
            <p className="font-heading text-sm font-bold text-muted-foreground">—</p>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 bg-secondary flex-wrap">
          <TabsTrigger value="overview" className="gap-1 text-xs"><Building2 size={14} /> Overview</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1 text-xs"><Users size={14} /> Contatti ({contacts?.length || 0})</TabsTrigger>
          <TabsTrigger value="deals" className="gap-1 text-xs"><Handshake size={14} /> Deals</TabsTrigger>
          <TabsTrigger value="orders" className="gap-1 text-xs"><ShoppingBag size={14} /> Ordini ({totalOrders})</TabsTrigger>
          <TabsTrigger value="communications" className="gap-1 text-xs"><Mail size={14} /> Comunicazioni</TabsTrigger>
          <TabsTrigger value="activities" className="gap-1 text-xs"><Clock size={14} /> Attività</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1 text-xs"><FileText size={14} /> Documenti ({documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1 text-xs"><StickyNote size={14} /> Note</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="glass-card-solid p-5">
                <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2 text-sm"><Building2 size={14} /> Info Azienda</h3>
                <div className="space-y-2 text-sm">
                  {client.email && <p className="text-muted-foreground flex items-center gap-2"><Mail size={12} /> <a href={`mailto:${client.email}`} className="hover:text-primary">{client.email}</a></p>}
                  {client.phone && <p className="text-muted-foreground flex items-center gap-2"><Phone size={12} /> {client.phone}</p>}
                  {client.website && <p className="text-muted-foreground flex items-center gap-2"><Globe size={12} /> <a href={client.website} target="_blank" className="hover:text-primary">{client.website}</a></p>}
                  {client.address && <p className="text-muted-foreground flex items-center gap-2"><MapPin size={12} /> {client.address}</p>}
                  {client.vat_number && <p className="text-muted-foreground text-xs">P.IVA: {client.vat_number}</p>}
                  {client.business_type && <p className="text-muted-foreground text-xs">Tipo: {client.business_type}</p>}
                </div>
                <div className="flex gap-2 mt-4">
                  {client.phone && (
                    <>
                      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => openWhatsApp(client.phone!, client.contact_name || client.company_name)}><MessageCircle size={12} /> WhatsApp</Button>
                      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => window.open(`tel:${client.phone}`)}><Phone size={12} /> Chiama</Button>
                    </>
                  )}
                </div>
              </div>

              {addresses && addresses.length > 0 && (
                <div className="glass-card-solid p-5">
                  <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2 text-sm"><MapPin size={14} /> Indirizzi Spedizione</h3>
                  {addresses.map((a: any) => (
                    <div key={a.id} className="p-3 bg-secondary/50 rounded-lg mb-2 text-sm">
                      <p className="font-semibold text-foreground">
                        {a.label || "Address"}
                        {a.is_default && <Badge className="ml-2 text-[10px] bg-primary/20 text-primary border-0">Default</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{[a.address_line, a.city, a.province, a.postal_code, a.country].filter(Boolean).join(", ")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              {/* Timeline recent events */}
              <div className="glass-card-solid p-5">
                <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2 text-sm"><Clock size={14} /> Ultimi Eventi</h3>
                {(() => {
                  const events = [
                    ...(orders?.slice(0, 3).map(o => ({ type: "order", date: o.created_at, title: `Ordine ${(o as any).order_code || "#" + o.id.slice(0, 8)}`, sub: `€${Number(o.total_amount || 0).toLocaleString("it-IT")}` })) || []),
                    ...(activities?.slice(0, 3).map(a => ({ type: "activity", date: a.created_at, title: a.title, sub: a.type })) || []),
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

                  if (!events.length) return <p className="text-sm text-muted-foreground text-center py-4">Nessun evento recente</p>;

                  return (
                    <div className="relative border-l-2 border-border ml-3 space-y-3">
                      {events.map((e, i) => (
                        <div key={i} className="ml-6 relative">
                          <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-background ${e.type === "order" ? "bg-success" : "bg-primary"}`} />
                          <div className="p-3 bg-secondary/50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-foreground">{e.title}</p>
                              <span className="text-[10px] text-muted-foreground">{fmtDate(e.date)}</span>
                            </div>
                            {e.sub && <Badge variant="outline" className="text-[10px] mt-1">{e.sub}</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* CONTACTS */}
        <TabsContent value="contacts">
          <div className="glass-card-solid p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><Users size={16} /> Contatti dell'Organizzazione</h3>
              <Button size="sm" onClick={() => { resetContactForm(); setEditContactId(null); setAddContactOpen(true); }} className="gap-1">
                <Plus size={14} /> Aggiungi Contatto
              </Button>
            </div>
            {!contacts?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nessun contatto registrato. Aggiungi il primo contatto.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {contacts.map((c: any) => (
                  <div key={c.id} className="p-4 bg-secondary/50 rounded-lg border border-border group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-heading font-semibold text-foreground">{c.contact_name}</p>
                          {c.is_primary && <span title="Primary"><Star size={12} className="text-warning" /></span>}
                          {c.is_decision_maker && <span title="Decision Maker"><Crown size={12} className="text-destructive" /></span>}
                        </div>
                        <Badge className={`border-0 text-[10px] ${contactTypeColors[c.contact_type || "general"]}`}>
                          {contactTypeLabels[c.contact_type || "general"]}
                        </Badge>
                        {c.job_title && <p className="text-xs text-muted-foreground mt-1">{c.job_title}{c.department ? ` · ${c.department}` : ""}</p>}
                        {c.email && <p className="text-xs text-muted-foreground mt-0.5"><Mail size={10} className="inline mr-1" />{c.email}</p>}
                        {c.phone && <p className="text-xs text-muted-foreground mt-0.5"><Phone size={10} className="inline mr-1" />{c.phone}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">Canale: {c.preferred_channel || "email"}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => editContact(c)}><Pencil size={12} /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm("Eliminare questo contatto?")) deleteContact(c.id); }}><Trash2 size={12} /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* DEALS */}
        <TabsContent value="deals">
          <DealsTab clientId={id!} clientName={client?.company_name || ""} contacts={contacts || []} navigate={navigate} />
        </TabsContent>

        {/* ORDERS */}
        <TabsContent value="orders">
          <div className="glass-card-solid overflow-hidden">
            {!orders?.length ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                <p>Nessun ordine — il cliente è in {statusLabel[client.status || "lead"] || "onboarding"}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Codice</TableHead>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Stato</TableHead>
                    <TableHead className="text-xs">Pagamento</TableHead>
                    <TableHead className="text-xs text-right">Totale</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(o => (
                    <TableRow key={o.id} className="hover:bg-secondary/50 cursor-pointer" onClick={() => setSelectedOrderId(o.id)}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">{(o as any).order_code || `#${o.id.slice(0, 8)}`}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</TableCell>
                      <TableCell><Badge className={`border-0 text-[10px] ${statusColors[o.status || "draft"]}`}>{o.status || "draft"}</Badge></TableCell>
                      <TableCell>
                        {(o as any).payment_status ? (
                          <Badge className={`border-0 text-[10px] ${(o as any).payment_status === 'Payed' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>{(o as any).payment_status}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">€{Number(o.total_amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {
                          e.stopPropagation();
                          setComposeOrderCtx({ orderId: o.id, orderCode: (o as any).order_code || `#${o.id.slice(0, 8)}`, orderStatus: o.status, orderTotal: o.total_amount, trackingNumber: (o as any).tracking_number });
                          setComposeOpen(true);
                        }}><Send size={12} className="text-primary" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* COMMUNICATIONS */}
        <TabsContent value="communications">
          <div className="glass-card-solid p-6">
            <ClientCommunications
              clientId={id!}
              clientName={client.company_name}
              clientEmail={client.email || ""}
              contactEmails={contacts?.map((c: any) => c.email).filter(Boolean) as string[]}
            />
          </div>
        </TabsContent>

        {/* ACTIVITIES */}
        <TabsContent value="activities">
          <div className="glass-card-solid p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><Clock size={16} /> Attività</h3>
              <Button size="sm" onClick={() => setAddActivityOpen(true)} className="gap-1"><Plus size={14} /> Nuova Attività</Button>
            </div>
            {!activities?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nessuna attività registrata</p>
            ) : (
              <div className="relative border-l-2 border-border ml-3 space-y-3">
                {activities.map((a: any) => (
                  <div key={a.id} className="ml-6 relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-foreground">{a.title}</p>
                        <span className="text-[10px] text-muted-foreground">{fmtDate(a.created_at)}</span>
                      </div>
                      {a.body && <p className="text-xs text-muted-foreground">{a.body}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {a.type && <Badge variant="outline" className="text-[10px]">{a.type}</Badge>}
                        {a.client_contacts?.contact_name && <Badge className="text-[10px] bg-chart-4/20 text-chart-4 border-0">{a.client_contacts.contact_name}</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

          {/* TASKS linked to this org */}
          <div className="glass-card-solid p-6 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><CheckSquare size={16} /> Task</h3>
              <Button size="sm" onClick={() => setAddTaskOpen(true)} className="gap-1"><Plus size={14} /> Nuovo Task</Button>
            </div>
            {!orgTasks?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nessun task collegato</p>
            ) : (
              <div className="space-y-2">
                {orgTasks.map((t: any) => {
                  const isOverdue = t.status === "pending" && t.due_date && isPast(new Date(t.due_date));
                  return (
                    <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg bg-secondary/50 ${isOverdue ? "border-l-2 border-l-destructive" : ""} ${t.status === "completed" ? "opacity-50" : ""}`}>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${t.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                        <div className="flex gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{t.type || "task"}</Badge>
                          <Badge className={`text-[10px] border-0 ${t.priority === "high" || t.priority === "urgent" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"}`}>{t.priority}</Badge>
                          {t.due_date && <span className={`text-[10px] ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>{fmtDate(t.due_date)}</span>}
                        </div>
                      </div>
                      {t.status !== "completed" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-success" onClick={async () => {
                          await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", t.id);
                          refetchTasks();
                          queryClient.invalidateQueries({ queryKey: ["crm-overdue-tasks-count"] });
                          toast.success("Task completato");
                        }}><Check size={14} /></Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        {/* DOCUMENTS */}
        <TabsContent value="documents">
          <div className="glass-card-solid p-6">
            <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2"><FileText size={16} /> Documenti</h3>
            {!documents?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nessun documento caricato</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nome File</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm font-medium">{d.file_name || d.title || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{d.doc_type || d.doc_category || "other"}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(d.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* NOTES */}
        <TabsContent value="notes">
          <div className="glass-card-solid p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><StickyNote size={16} /> Note Azienda</h3>
              {!editingNotes ? (
                <Button size="sm" variant="ghost" onClick={() => { setEditingNotes(true); setNotesValue(client.notes || ""); }}>
                  {client.notes ? "Modifica" : "Aggiungi"}
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>Annulla</Button>
                  <Button size="sm" disabled={savingNotes} onClick={async () => {
                    setSavingNotes(true);
                    const trimmed = notesValue.trim() || null;
                    const { error } = await supabase.from("clients").update({ notes: trimmed }).eq("id", id!);
                    setSavingNotes(false);
                    if (error) { toast.error("Errore salvataggio"); return; }
                    toast.success("Note salvate");
                    setEditingNotes(false);
                    queryClient.invalidateQueries({ queryKey: ["crm-org", id] });
                  }}>
                    {savingNotes ? "..." : "Salva"}
                  </Button>
                </div>
              )}
            </div>
            {editingNotes ? (
              <Textarea value={notesValue} onChange={e => setNotesValue(e.target.value)} placeholder="Scrivi note sull'azienda..." className="text-sm min-h-[150px] resize-none" />
            ) : client.notes ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">Nessuna nota.</p>
            )}

            {/* Note activities (type = note) */}
            <div className="mt-6">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-heading mb-3">Note dal Team Sales</h4>
              {(() => {
                const noteActs = activities?.filter((a: any) => a.type === "note") || [];
                if (!noteActs.length) return <p className="text-xs text-muted-foreground italic">Nessuna nota dal team.</p>;
                return (
                  <div className="space-y-2">
                    {noteActs.map((a: any) => (
                      <div key={a.id} className="p-3 bg-secondary/50 rounded-lg">
                        <div className="flex justify-between mb-1">
                          <p className="text-sm font-semibold">{a.title}</p>
                          <span className="text-[10px] text-muted-foreground">{fmtDate(a.created_at)}</span>
                        </div>
                        {a.body && <p className="text-xs text-muted-foreground">{a.body}</p>}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Contact Dialog */}
      <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editContactId ? "Modifica Contatto" : "Nuovo Contatto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Nome *</Label>
                <Input className="h-9 text-sm bg-secondary border-border" value={contactForm.contact_name} onChange={e => setContactForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Tipo Contatto</Label>
                <Select value={contactForm.contact_type} onValueChange={v => setContactForm(f => ({ ...f, contact_type: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(contactTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Email</Label>
                <Input className="h-9 text-sm bg-secondary border-border" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Telefono</Label>
                <Input className="h-9 text-sm bg-secondary border-border" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Job Title</Label>
                <Input className="h-9 text-sm bg-secondary border-border" value={contactForm.job_title} onChange={e => setContactForm(f => ({ ...f, job_title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Dipartimento</Label>
                <Input className="h-9 text-sm bg-secondary border-border" value={contactForm.department} onChange={e => setContactForm(f => ({ ...f, department: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Canale Preferito</Label>
                <Select value={contactForm.preferred_channel} onValueChange={v => setContactForm(f => ({ ...f, preferred_channel: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Telefono</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">LinkedIn URL</Label>
                <Input className="h-9 text-sm bg-secondary border-border" value={contactForm.linkedin_url} onChange={e => setContactForm(f => ({ ...f, linkedin_url: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={contactForm.is_primary} onCheckedChange={v => setContactForm(f => ({ ...f, is_primary: !!v }))} />
                <Star size={12} className="text-warning" /> Contatto Principale
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={contactForm.is_decision_maker} onCheckedChange={v => setContactForm(f => ({ ...f, is_decision_maker: !!v }))} />
                <Crown size={12} className="text-destructive" /> Decision Maker
              </label>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Note</Label>
              <Textarea className="text-sm bg-secondary border-border min-h-[60px]" value={contactForm.notes} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <Button onClick={saveContact} className="w-full">{editContactId ? "Aggiorna Contatto" : "Aggiungi Contatto"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={addActivityOpen} onOpenChange={setAddActivityOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-heading">Nuova Attività</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Titolo *</Label>
              <Input className="h-9 text-sm bg-secondary border-border" value={actForm.title} onChange={e => setActForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Tipo</Label>
                <Select value={actForm.type} onValueChange={v => setActForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Chiamata</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                    <SelectItem value="meeting">📹 Meeting</SelectItem>
                    <SelectItem value="note">📝 Nota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Contatto</Label>
                <Select value={actForm.contact_id || "__none__"} onValueChange={v => setActForm(f => ({ ...f, contact_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="h-9 text-sm bg-secondary border-border"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nessuno</SelectItem>
                    {contacts?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.contact_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Note</Label>
              <Textarea className="text-sm bg-secondary border-border min-h-[60px]" value={actForm.body} onChange={e => setActForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <Button onClick={addActivity} disabled={!actForm.title.trim()} className="w-full">Aggiungi Attività</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-heading">Nuovo Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Titolo *</Label>
              <Input className="bg-secondary border-border" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Tipo</Label>
                <Select value={taskForm.type} onValueChange={v => setTaskForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Priorità</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Scadenza</Label>
              <Input type="datetime-local" className="bg-secondary border-border" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Descrizione</Label>
              <Textarea className="bg-secondary border-border min-h-[60px]" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <Button disabled={!taskForm.title.trim()} className="w-full" onClick={async () => {
              const { error } = await supabase.from("tasks").insert({
                title: taskForm.title,
                type: taskForm.type,
                priority: taskForm.priority,
                due_date: taskForm.due_date || null,
                description: taskForm.description || null,
                client_id: id!,
                assigned_to: user?.id,
                created_by: user?.id,
              });
              if (error) { toast.error(error.message); return; }
              toast.success("Task creato");
              setAddTaskOpen(false);
              setTaskForm({ title: "", type: "call", priority: "medium", due_date: "", description: "" });
              refetchTasks();
              queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
              queryClient.invalidateQueries({ queryKey: ["crm-overdue-tasks-count"] });
            }}>Crea Task</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={(open) => { setComposeOpen(open); if (!open) setComposeOrderCtx(null); }}
        clientId={id!}
        clientName={client.company_name}
        clientEmail={client.email || ""}
        orderId={composeOrderCtx?.orderId}
        orderCode={composeOrderCtx?.orderCode}
        orderStatus={composeOrderCtx?.orderStatus}
        orderTotal={composeOrderCtx?.orderTotal}
        trackingNumber={composeOrderCtx?.trackingNumber}
      />

      <CRMOrderDetailModal
        open={!!selectedOrderId}
        onOpenChange={(open) => { if (!open) setSelectedOrderId(null); }}
        orderId={selectedOrderId}
      />
    </div>
  );
};

export default CRMOrganizationDetail;

// Deals sub-tab component
const stageColors: Record<string, string> = {
  ...statusColors,
  qualification: "bg-primary/20 text-primary",
  proposal: "bg-warning/20 text-warning",
  negotiation: "bg-chart-4/20 text-chart-4",
  closed_won: "bg-success/20 text-success",
  closed_lost: "bg-destructive/20 text-destructive",
};
const stageLabels: Record<string, string> = {
  qualification: "Qualification", proposal: "Proposal", negotiation: "Negotiation",
  closed_won: "Won", closed_lost: "Lost",
};

function DealsTab({ clientId, clientName, contacts, navigate }: { clientId: string; clientName: string; contacts: any[]; navigate: any }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", contact_id: "", value: "", stage: "qualification", probability: "20", expected_close_date: "", notes: "" });

  const { data: deals } = useQuery({
    queryKey: ["crm-org-deals", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*, contact:contact_id(contact_name)").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const createDeal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deals").insert({
        title: form.title, client_id: clientId, contact_id: form.contact_id || null,
        value: parseFloat(form.value) || 0, stage: form.stage, probability: parseInt(form.probability) || 20,
        expected_close_date: form.expected_close_date || null, notes: form.notes || null, assigned_to: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-org-deals", clientId] });
      queryClient.invalidateQueries({ queryKey: ["crm-deals"] });
      toast.success("Deal creato");
      setCreateOpen(false);
      setForm({ title: "", contact_id: "", value: "", stage: "qualification", probability: "20", expected_close_date: "", notes: "" });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-foreground">Deals ({deals?.length || 0})</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button size="sm" className="gap-1 bg-foreground text-background" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Nuovo Deal
          </Button>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-heading">Nuovo Deal per {clientName}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Titolo *</Label>
                <Input className="h-9 bg-secondary border-border" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Valore (€)</Label>
                  <Input type="number" className="h-9 bg-secondary border-border" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Contatto</Label>
                  <Select value={form.contact_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, contact_id: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-9 bg-secondary border-border"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nessuno</SelectItem>
                      {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.contact_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Stage</Label>
                  <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v, probability: String({ qualification: 20, proposal: 50, negotiation: 75, closed_won: 100, closed_lost: 0 }[v] ?? 20) }))}>
                    <SelectTrigger className="h-9 bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(stageLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Chiusura prevista</Label>
                  <Input type="date" className="h-9 bg-secondary border-border" value={form.expected_close_date} onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))} />
                </div>
              </div>
              <Button onClick={() => createDeal.mutate()} disabled={!form.title} className="w-full bg-foreground text-background">Crea Deal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {!deals?.length ? (
        <div className="text-center py-10 glass-card-solid">
          <Handshake className="mx-auto text-muted-foreground mb-3 opacity-30" size={36} />
          <p className="text-sm text-muted-foreground">Nessun deal per questa organizzazione</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Valore</TableHead>
                <TableHead>Contatto</TableHead>
                <TableHead>Chiusura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map(d => (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => navigate("/crm/deals")}>
                  <TableCell className="font-heading font-semibold text-sm">{d.title}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 text-[10px] ${stageColors[d.stage] || "bg-muted text-muted-foreground"}`}>
                      {stageLabels[d.stage] || d.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">€{Number(d.value || 0).toLocaleString("it-IT")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(d as any).contact?.contact_name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(d.expected_close_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
