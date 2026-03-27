import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Building2, Mail, Phone, Globe, MapPin, ShoppingBag,
  MessageCircle, Send, Eye, Clock, TrendingUp, Users, FileText, CalendarDays, BarChart3
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ClientCommunications } from "@/components/crm/ClientCommunications";
import { ComposeEmailDialog } from "@/components/crm/ComposeEmailDialog";
import { CRMOrderDetailModal } from "@/components/crm/CRMOrderDetailModal";
import { ContactManager } from "@/components/crm/ContactManager";

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

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy", { locale: it }); } catch { return "—"; }
};

const CRMContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeOrderCtx, setComposeOrderCtx] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["crm-client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: orders } = useQuery({
    queryKey: ["crm-client-orders", id],
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
    queryKey: ["crm-client-contacts", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_contacts").select("*").eq("client_id", id!).order("created_at");
      return data || [];
    },
    enabled: !!id,
  });

  const { data: addresses } = useQuery({
    queryKey: ["crm-client-addresses", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_shipping_addresses").select("*").eq("client_id", id!).order("created_at");
      return (data as any[]) || [];
    },
    enabled: !!id,
  });

  const { data: activities } = useQuery({
    queryKey: ["crm-client-activities", id],
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const totalSpent = orders?.filter(o => o.status !== "draft").reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
  const totalOrders = orders?.length || 0;

  const openWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/[^+\d]/g, "");
    window.open(`https://wa.me/${clean.replace("+", "")}?text=${encodeURIComponent(`Buongiorno ${name}, sono il team commerciale EasySea.`)}`, "_blank");
  };

  if (isLoading) return <div className="text-muted-foreground p-6">Caricamento...</div>;
  if (!client) return <div className="text-muted-foreground p-6">Contatto non trovato</div>;

  // Compute order metrics from client fields
  const lastOrderDate = (client as any).last_order_date;
  const daysSinceLastOrder = (client as any).days_since_last_order;
  const avgFrequency = (client as any).avg_order_frequency_days;
  const nextReorder = (client as any).next_reorder_expected_date;
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
          <p className="font-heading text-xl font-bold text-foreground">{(client as any).total_orders_count || totalOrders}</p>
        </div>
        <div className="glass-card-solid p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">Fatturato</span>
          </div>
          <p className="font-heading text-xl font-bold text-foreground">€{((client as any).total_orders_value || totalSpent).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-card-solid p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays size={14} className="text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">Last Order</span>
          </div>
          <p className="font-heading text-sm font-bold text-foreground">
            {lastOrderDate ? `${fmtDate(lastOrderDate)}` : "—"}
          </p>
          {daysSinceLastOrder != null && <p className="text-[10px] text-muted-foreground">{daysSinceLastOrder}d ago</p>}
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
              <p className="text-[10px] text-muted-foreground">{nextReorderDays !== null && nextReorderDays < 0 ? `${Math.abs(nextReorderDays)}d overdue` : `in ${nextReorderDays}d`}</p>
            </>
          ) : (
            <p className="font-heading text-sm font-bold text-muted-foreground">—</p>
          )}
        </div>
      </div>

      {/* Main content with tabs */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left sidebar - Info */}
        <div className="space-y-4">
          <div className="glass-card-solid p-5">
            <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
              <Building2 size={14} /> Info Azienda
            </h3>
            <div className="space-y-2 text-sm">
              {client.email && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Mail size={12} /> <a href={`mailto:${client.email}`} className="hover:text-primary transition-colors">{client.email}</a>
                </p>
              )}
              {client.phone && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Phone size={12} /> {client.phone}
                </p>
              )}
              {client.website && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Globe size={12} /> <a href={client.website} target="_blank" className="hover:text-primary transition-colors">{client.website}</a>
                </p>
              )}
              {client.address && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <MapPin size={12} /> {client.address}
                </p>
              )}
              {client.vat_number && (
                <p className="text-muted-foreground text-xs">P.IVA: {client.vat_number}</p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              {client.phone && (
                <>
                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => openWhatsApp(client.phone!, client.contact_name || client.company_name)}>
                    <MessageCircle size={12} /> WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => window.open(`tel:${client.phone}`)}>
                    <Phone size={12} /> Chiama
                  </Button>
                </>
              )}
            </div>
          </div>

          <ContactManager
            clientId={id!}
            clientMainEmail={client.email}
            clientMainPhone={client.phone}
            clientMainContactName={client.contact_name}
          />

          {addresses && addresses.length > 0 && (
            <div className="glass-card-solid p-5">
              <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
                <MapPin size={14} /> Indirizzi Spedizione
              </h3>
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

          {/* Notes */}
          <div className="glass-card-solid p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading font-bold text-foreground text-sm">📝 Note Azienda</h3>
              {!editingNotes ? (
                <Button
                  size="sm" variant="ghost" className="h-6 text-xs"
                  onClick={() => { setEditingNotes(true); setNotesValue(client.notes || ""); }}
                >
                  {client.notes ? "Modifica" : "Aggiungi"}
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingNotes(false)}>Annulla</Button>
                  <Button
                    size="sm" className="h-6 text-xs" disabled={savingNotes}
                    onClick={async () => {
                      setSavingNotes(true);
                      const trimmed = notesValue.trim() || null;
                      const { error } = await supabase.from("clients").update({ notes: trimmed }).eq("id", id!);
                      setSavingNotes(false);
                      if (error) { toast.error("Errore salvataggio"); return; }
                      toast.success("Note salvate");
                      setEditingNotes(false);
                      queryClient.setQueryData(["crm-client", id], (old: any) => old ? { ...old, notes: trimmed } : old);
                      queryClient.invalidateQueries({ queryKey: ["crm-client", id] });
                    }}
                  >
                    {savingNotes ? "..." : "Salva"}
                  </Button>
                </div>
              )}
            </div>
            {editingNotes ? (
              <Textarea
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
                placeholder="Scrivi note sull'azienda..."
                className="text-sm min-h-[100px] resize-none"
              />
            ) : client.notes ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">Nessuna nota.</p>
            )}
          </div>
        </div>

        {/* Right - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="mb-4 bg-secondary">
              <TabsTrigger value="orders" className="gap-1 text-xs"><ShoppingBag size={14} /> Ordini ({totalOrders})</TabsTrigger>
              <TabsTrigger value="order-analytics" className="gap-1 text-xs"><BarChart3 size={14} /> Analytics</TabsTrigger>
              <TabsTrigger value="communications" className="gap-1 text-xs"><Mail size={14} /> Comunicazioni</TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1 text-xs"><Clock size={14} /> Timeline</TabsTrigger>
            </TabsList>

            {/* Orders tab */}
            <TabsContent value="orders">
              <div className="glass-card-solid overflow-hidden">
                {!orders?.length ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No orders placed yet — client is in {statusLabel[client.status || "lead"] || "onboarding"}</p>
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
                              setComposeOrderCtx({
                                orderId: o.id,
                                orderCode: (o as any).order_code || `#${o.id.slice(0, 8)}`,
                                orderStatus: o.status,
                                orderTotal: o.total_amount,
                                trackingNumber: (o as any).tracking_number,
                              });
                              setComposeOpen(true);
                            }}>
                              <Send size={12} className="text-primary" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* Order Analytics tab */}
            <TabsContent value="order-analytics">
              <div className="glass-card-solid p-6">
                <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 size={16} /> Order Analytics
                </h3>
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading mb-1">Last Order Date</p>
                    <p className="font-heading font-bold text-foreground">{lastOrderDate ? fmtDate(lastOrderDate) : "—"}</p>
                    {daysSinceLastOrder != null && <p className="text-xs text-muted-foreground">{daysSinceLastOrder} days ago</p>}
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading mb-1">Total Orders</p>
                    <p className="font-heading font-bold text-foreground">{(client as any).total_orders_count || totalOrders}</p>
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading mb-1">Lifetime Value</p>
                    <p className="font-heading font-bold text-foreground">€{((client as any).total_orders_value || totalSpent).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading mb-1">Avg Order Frequency</p>
                    <p className="font-heading font-bold text-foreground">{avgFrequency ? `${avgFrequency} days` : "—"}</p>
                  </div>
                </div>
                {nextReorder && (
                  <div className={`p-4 rounded-lg border ${nextReorderDays !== null && nextReorderDays < 0 ? "border-destructive bg-destructive/10" : nextReorderDays !== null && nextReorderDays <= 7 ? "border-warning bg-warning/10" : "border-success bg-success/10"}`}>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-heading mb-1">Next Reorder Expected</p>
                    <p className={`font-heading text-lg font-bold ${nextReorderDays !== null && nextReorderDays < 0 ? "text-destructive" : nextReorderDays !== null && nextReorderDays <= 7 ? "text-warning" : "text-success"}`}>
                      {fmtDate(nextReorder)} — {nextReorderDays !== null && nextReorderDays < 0 ? `${Math.abs(nextReorderDays)} days overdue` : `in ${nextReorderDays} days`}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Communications tab */}
            <TabsContent value="communications">
              <div className="glass-card-solid p-6">
                <ClientCommunications
                  clientId={id!}
                  clientName={client.company_name}
                  clientEmail={client.email || ""}
                  contactEmails={contacts?.map(c => c.email).filter(Boolean) as string[]}
                />
              </div>
            </TabsContent>

            {/* Timeline tab */}
            <TabsContent value="timeline">
              <div className="glass-card-solid p-6">
                <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
                  <Clock size={16} /> Timeline Attività
                </h3>
                {!activities?.length ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Clock size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nessuna attività registrata</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-border ml-3 space-y-4">
                    {activities.map((a: any) => (
                      <div key={a.id} className="ml-6 relative">
                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                        <div className="p-3 bg-secondary/50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-foreground">{a.title}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(a.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                            </span>
                          </div>
                          {a.body && <p className="text-xs text-muted-foreground">{a.body}</p>}
                          {a.type && <Badge variant="outline" className="text-[10px] mt-1">{a.type}</Badge>}
                          {a.completed_at && (
                            <p className="text-[10px] text-success mt-1">✅ Completata {fmtDate(a.completed_at)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

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

export default CRMContactDetail;
