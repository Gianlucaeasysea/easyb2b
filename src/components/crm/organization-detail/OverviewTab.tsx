import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Mail, Phone, Globe, MapPin, MessageCircle,
  Clock, Handshake, KeyRound, Check, Trash2, Copy, RefreshCw, UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmtDate, stageColors, stageLabels } from "./constants";
import type { Tables } from "@/integrations/supabase/types";

interface OverviewTabProps {
  client: Tables<"clients">;
  addresses: any[];
  orgDeals: any[];
  orders: any[];
  activities: any[];
  onUpdatePaymentTerms: (terms: string) => Promise<void>;
  onCreateCredentials: () => Promise<void>;
  onDeleteCredentials: () => Promise<void>;
  onResetPassword: () => Promise<void>;
}

export function OverviewTab({
  client, addresses, orgDeals, orders, activities,
  onUpdatePaymentTerms, onCreateCredentials, onDeleteCredentials, onResetPassword,
}: OverviewTabProps) {
  const [creatingCredentials, setCreatingCredentials] = useState(false);
  const [deletingCredentials, setDeletingCredentials] = useState(false);

  const openWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/[^+\d]/g, "");
    window.open(`https://wa.me/${clean.replace("+", "")}?text=${encodeURIComponent(`Hello ${name}, this is the EasySea commercial team.`)}`, "_blank");
  };

  const handleCreate = async () => {
    setCreatingCredentials(true);
    try { await onCreateCredentials(); } catch (err: any) { toast.error(err.message || "Failed to create credentials"); }
    finally { setCreatingCredentials(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete the dealer credentials? The account will be permanently removed.")) return;
    setDeletingCredentials(true);
    try { await onDeleteCredentials(); } catch (err: any) { toast.error(err.message || "Failed to delete credentials"); }
    finally { setDeletingCredentials(false); }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="space-y-4">
        {/* Company Info */}
        <div className="glass-card-solid p-5">
          <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2 text-sm"><Building2 size={14} /> Info Azienda</h3>
          <div className="space-y-2 text-sm">
            {client.email && <p className="text-muted-foreground flex items-center gap-2"><Mail size={12} /> <a href={`mailto:${client.email}`} className="hover:text-primary">{client.email}</a></p>}
            {client.phone && <p className="text-muted-foreground flex items-center gap-2"><Phone size={12} /> {client.phone}</p>}
            {client.website && <p className="text-muted-foreground flex items-center gap-2"><Globe size={12} /> <a href={client.website} target="_blank" className="hover:text-primary">{client.website}</a></p>}
            {client.address && <p className="text-muted-foreground flex items-center gap-2"><MapPin size={12} /> {client.address}</p>}
            {client.vat_number && <p className="text-muted-foreground text-xs">P.IVA: {client.vat_number}</p>}
            {client.business_type && <p className="text-muted-foreground text-xs">Tipo: {client.business_type}</p>}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading mb-1">Payment Terms</p>
              <Select
                value={(client as any).payment_terms || "100% upfront"}
                onValueChange={onUpdatePaymentTerms}
              >
                <SelectTrigger className="h-8 text-sm bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="100% upfront">100% Upfront</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="50/50">50/50</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {client.phone && (
              <>
                <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => openWhatsApp(client.phone!, client.contact_name || client.company_name)}><MessageCircle size={12} /> WhatsApp</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => window.open(`tel:${client.phone}`)}><Phone size={12} /> Call</Button>
              </>
            )}
          </div>
        </div>

        {/* Dealer Portal Credentials */}
        <div className="glass-card-solid p-5">
          <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
            <KeyRound size={14} /> Credenziali Portale Dealer
          </h3>
          {client.user_id ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-success/10 border border-success/20 rounded-lg">
                <Check size={12} className="text-success" />
                <span className="text-xs text-success font-medium">Account attivo</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                  <span className="text-xs text-muted-foreground">Email</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-foreground">{client.email}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { navigator.clipboard.writeText(client.email || ""); toast.success("Email copied"); }}>
                      <Copy size={10} />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 mt-1">
                  <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={async () => {
                    try { await onResetPassword(); } catch (e: any) { toast.error(e.message || "Failed to send reset"); }
                  }}>
                    <KeyRound size={10} /> Reset Password
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1 text-xs h-7" disabled={deletingCredentials} onClick={handleDelete}>
                    {deletingCredentials ? <RefreshCw size={10} className="animate-spin" /> : <Trash2 size={10} />}
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">No dealer account linked. Create credentials to enable portal access.</p>
              {!client.email && (
                <p className="text-xs text-destructive">⚠️ Configure an email for this organization first.</p>
              )}
              <Button size="sm" className="w-full gap-1" disabled={creatingCredentials || !client.email} onClick={handleCreate}>
                {creatingCredentials ? <RefreshCw size={12} className="animate-spin" /> : <UserCheck size={12} />}
                Create Credentials & Send Email
              </Button>
            </div>
          )}
        </div>

        {/* Shipping Addresses */}
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

        {/* Deals Summary Widget */}
        {orgDeals && orgDeals.length > 0 && (
          <div className="glass-card-solid p-5">
            <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2 text-sm"><Handshake size={14} /> Deals Attivi</h3>
            <div className="space-y-2">
              {orgDeals.filter((d: any) => !["closed_won", "closed_lost"].includes(d.stage)).slice(0, 3).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-heading font-semibold text-foreground truncate">{d.title}</p>
                    <p className="text-[10px] text-muted-foreground">{(d as any).contact?.contact_name || "—"}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-mono font-bold text-foreground">€{Number(d.value || 0).toLocaleString("en-US")}</p>
                    <Badge className={`border-0 text-[10px] ${stageColors[d.stage] || "bg-muted text-muted-foreground"}`}>
                      {stageLabels[d.stage] || d.stage}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>Pipeline: €{orgDeals.filter((d: any) => !["closed_won", "closed_lost"].includes(d.stage)).reduce((s: number, d: any) => s + Number(d.value || 0), 0).toLocaleString("en-US")}</span>
              <span>{orgDeals.filter((d: any) => d.stage === "closed_won").length} won · {orgDeals.filter((d: any) => d.stage === "closed_lost").length} lost</span>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        {/* Timeline recent events */}
        <div className="glass-card-solid p-5">
          <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2 text-sm"><Clock size={14} /> Ultimi Eventi</h3>
          {(() => {
            const events = [
              ...(orders?.slice(0, 3).map(o => ({ type: "order", date: o.created_at, title: `Ordine ${(o as any).order_code || "#" + o.id.slice(0, 8)}${o.status === "draft" ? " (Draft)" : ""}`, sub: `€${Number(o.total_amount || 0).toLocaleString("en-US")}`, status: o.status })) || []),
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
  );
}
