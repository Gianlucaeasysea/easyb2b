import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Check, X, Target, Eye, ChevronRight, ChevronLeft, KeyRound, Copy, RefreshCw, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { format } from "date-fns";
import { convertRequestToPipeline } from "@/lib/crmEntityActions";
import { showErrorToast } from "@/lib/errorHandler";
import { toast as sonnerToast } from "sonner";

const PAYMENT_TERMS_OPTIONS = [
  { value: "prepaid", label: "Anticipato" },
  { value: "30_days", label: "30 giorni" },
  { value: "60_days", label: "60 giorni" },
  { value: "90_days", label: "90 giorni" },
  { value: "end_of_month", label: "Fine mese" },
];

const generatePassword = (len = 14): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => chars[b % chars.length])
    .join("");
};

const AdminRequests = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rejectRequest, setRejectRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Approval wizard
  const [wizardRequest, setWizardRequest] = useState<any>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    company_name: "", contact_name: "", email: "", phone: "",
    country: "", zone: "", business_type: "", website: "", vat_number: "",
    address: "", payment_terms: "30_days", payment_terms_notes: "",
    price_list_id: "", assigned_sales_id: "",
    account_email: "", account_password: "", send_welcome_email: true,
  });
  const [wizardCreating, setWizardCreating] = useState(false);

  // Admin notes
  const [editingNotes, setEditingNotes] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("distributor_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: priceLists } = useQuery({
    queryKey: ["all-price-lists"],
    queryFn: async () => {
      const { data } = await supabase.from("price_lists").select("*").order("name");
      return data || [];
    },
  });

  const { data: salesUsers } = useQuery({
    queryKey: ["sales-users"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", "sales");
      if (!data?.length) return [];
      const ids = data.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, contact_name, email").in("user_id", ids);
      return profiles || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("distributor_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      toast({ title: "Request updated" });
    },
  });

  const saveAdminNotes = useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes: string }) => {
      const { error } = await supabase.from("distributor_requests").update({ admin_notes } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      sonnerToast.success("Note salvate");
    },
  });

  const convertToLead = useMutation({
    mutationFn: async (request: any) => convertRequestToPipeline(request.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-organizations"] });
      toast({ title: "Lead + Organization creati dalla richiesta!" });
      setSelectedRequest(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    await supabase.from("distributor_requests").update({ status: "rejected", admin_notes: rejectReason } as any).eq("id", rejectRequest.id);
    queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
    toast({ title: "Richiesta rifiutata" });
    setRejectRequest(null);
    setRejectReason("");
  };

  const openWizard = (request: any) => {
    setWizardRequest(request);
    setWizardStep(0);
    setWizardData({
      company_name: request.company_name || "",
      contact_name: request.contact_name || "",
      email: request.email || "",
      phone: request.phone || "",
      country: request.country || "",
      zone: request.zone || "",
      business_type: request.business_type || "",
      website: request.website || "",
      vat_number: request.vat_number || "",
      address: "",
      payment_terms: "30_days",
      payment_terms_notes: "",
      price_list_id: "",
      assigned_sales_id: "",
      account_email: request.email || "",
      account_password: generatePassword(),
      send_welcome_email: true,
    });
  };

  const handleWizardCreate = async () => {
    setWizardCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Create client record
      const { data: newClient, error: clientErr } = await supabase.from("clients").insert({
        company_name: wizardData.company_name,
        contact_name: wizardData.contact_name,
        email: wizardData.email,
        phone: wizardData.phone,
        country: wizardData.country,
        zone: wizardData.zone,
        business_type: wizardData.business_type,
        website: wizardData.website || null,
        vat_number: wizardData.vat_number || null,
        address: wizardData.address || null,
        payment_terms: wizardData.payment_terms,
        payment_terms_notes: wizardData.payment_terms_notes || null,
        assigned_sales_id: wizardData.assigned_sales_id || null,
        status: "onboarding",
      } as any).select().single();
      if (clientErr) throw clientErr;

      // 2. Assign price list
      if (wizardData.price_list_id && newClient) {
        await supabase.from("price_list_clients").insert({
          price_list_id: wizardData.price_list_id,
          client_id: newClient.id,
        } as any);
      }

      // 3. Create dealer account via edge function
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-dealer-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          client_id: newClient.id,
          email: wizardData.account_email,
          password: wizardData.account_password,
          send_welcome_email: wizardData.send_welcome_email,
        }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      // 4. Update request status
      await supabase.from("distributor_requests").update({ status: "approved" }).eq("id", wizardRequest.id);

      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      sonnerToast.success(`Account dealer creato per ${wizardData.company_name}`);
      setWizardRequest(null);
    } catch (error) {
      showErrorToast(error, "AdminRequests.wizardCreate");
    } finally {
      setWizardCreating(false);
    }
  };

  const newRequests = requests?.filter(r => r.status === "new") || [];
  const filtered = statusFilter === "all" ? requests : requests?.filter(r => {
    if (statusFilter === "new") return r.status === "new";
    if (statusFilter === "approved") return r.status === "approved" || r.status === "converted";
    if (statusFilter === "rejected") return r.status === "rejected";
    return true;
  });

  const WIZARD_STEPS = ["Dati Azienda", "Listino & Sales", "Credenziali", "Conferma"];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Dealer Requests</h1>
          <p className="text-sm text-muted-foreground">Review and manage incoming dealer applications</p>
        </div>
        <div className="flex items-center gap-2">
          {newRequests.length > 0 && (
            <Badge className="bg-warning/20 text-warning border-0">{newRequests.length} new</Badge>
          )}
          <Badge variant="outline" className="text-xs">{requests?.length || 0} total</Badge>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6">
        {[
          { value: "all", label: "Tutte" },
          { value: "new", label: "In attesa" },
          { value: "approved", label: "Approvate" },
          { value: "rejected", label: "Rifiutate" },
        ].map(f => (
          <Button key={f.value} variant={statusFilter === f.value ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setStatusFilter(f.value)}>
            {f.label}
            {f.value === "new" && newRequests.length > 0 && (
              <Badge className="ml-1.5 bg-warning text-warning-foreground text-[10px] h-4 min-w-4 px-1">{newRequests.length}</Badge>
            )}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !filtered?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <FileText className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No dealer requests yet.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Azienda</TableHead>
                <TableHead>Contatto</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Paese</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map(r => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => { setSelectedRequest(r); setEditingNotes((r as any).admin_notes || ""); }}>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(r.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell className="font-heading font-semibold">{r.company_name}</TableCell>
                  <TableCell className="text-sm">{r.contact_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.email}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{(r as any).country || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      r.status === "new" ? "border-warning text-warning" :
                      r.status === "approved" || r.status === "converted" ? "bg-success/20 text-success border-0" :
                      r.status === "rejected" ? "bg-destructive/20 text-destructive border-0" : ""
                    }>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1" onClick={() => { setSelectedRequest(r); setEditingNotes((r as any).admin_notes || ""); }}>
                        <Eye size={14} /> Rivedi
                      </Button>
                      {r.status === "new" && (
                        <>
                          <Button size="sm" variant="ghost" className="text-success hover:text-success h-8 gap-1" onClick={() => openWizard(r)}>
                            <Check size={14} /> Approva
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 gap-1" onClick={() => { setRejectRequest(r); setRejectReason(""); }}>
                            <X size={14} /> Rifiuta
                          </Button>
                        </>
                      )}
                      {r.status === "converted" && <Badge className="bg-success/20 text-success border-0 text-[10px]">In Pipeline</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Review Detail Modal */}
      <Dialog open={!!selectedRequest && !wizardRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">{selectedRequest.company_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground text-xs uppercase">Contact</span><p className="font-medium">{selectedRequest.contact_name}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Email</span><p className="font-medium">{selectedRequest.email}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Phone</span><p className="font-medium">{selectedRequest.phone}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Region</span><p className="font-medium">{selectedRequest.zone || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Country</span><p className="font-medium">{(selectedRequest as any).country || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Business Type</span><p className="font-medium">{selectedRequest.business_type || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Website</span><p className="font-medium">{selectedRequest.website || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">VAT ID</span><p className="font-medium">{(selectedRequest as any).vat_number || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Marketing Consent</span><p className="font-medium">{selectedRequest.marketing_consent ? "✅ Yes" : "❌ No"}</p></div>
                </div>
                {selectedRequest.message && (
                  <div>
                    <span className="text-muted-foreground text-xs uppercase">Message</span>
                    <p className="text-sm mt-1 p-3 bg-secondary/50 rounded-lg">{selectedRequest.message}</p>
                  </div>
                )}

                {/* Admin Notes */}
                <div>
                  <span className="text-muted-foreground text-xs uppercase">Admin Notes</span>
                  <Textarea
                    value={editingNotes}
                    onChange={e => setEditingNotes(e.target.value)}
                    placeholder="Add internal notes about this request..."
                    className="mt-1 bg-secondary border-border rounded-lg min-h-[80px]"
                  />
                  <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => saveAdminNotes.mutate({ id: selectedRequest.id, admin_notes: editingNotes })}>
                    Save Notes
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Received: {format(new Date(selectedRequest.created_at), "dd MMM yyyy HH:mm")}
                </div>
                {selectedRequest.status === "new" && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button className="flex-1 gap-1 bg-foreground text-background" onClick={() => openWizard(selectedRequest)}>
                      <Check size={14} /> Approva & Crea Account
                    </Button>
                    <Button variant="outline" className="gap-1" onClick={() => convertToLead.mutate(selectedRequest)}>
                      <Target size={14} /> Pipeline
                    </Button>
                    <Button variant="outline" className="gap-1 text-destructive" onClick={() => { setRejectRequest(selectedRequest); setRejectReason(""); setSelectedRequest(null); }}>
                      <X size={14} /> Rifiuta
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectRequest} onOpenChange={() => setRejectRequest(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rifiuta Richiesta</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Inserisci il motivo del rifiuto per <strong>{rejectRequest?.company_name}</strong>:</p>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Motivo del rifiuto..." className="bg-secondary border-border min-h-[100px]" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRequest(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>Rifiuta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Wizard */}
      <Dialog open={!!wizardRequest} onOpenChange={() => setWizardRequest(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Approva Richiesta — {wizardRequest?.company_name}</DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-6">
            {WIZARD_STEPS.map((label, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 ${i <= wizardStep ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < wizardStep ? "bg-success text-success-foreground" :
                    i === wizardStep ? "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>{i < wizardStep ? "✓" : i + 1}</div>
                  <span className="text-[11px] font-semibold hidden sm:inline">{label}</span>
                </div>
                {i < WIZARD_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < wizardStep ? "bg-success" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Company Data */}
          {wizardStep === 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Nome Azienda *</Label><Input value={wizardData.company_name} onChange={e => setWizardData(d => ({ ...d, company_name: e.target.value }))} className="bg-secondary" /></div>
                <div><Label className="text-xs">Referente</Label><Input value={wizardData.contact_name} onChange={e => setWizardData(d => ({ ...d, contact_name: e.target.value }))} className="bg-secondary" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Email</Label><Input value={wizardData.email} onChange={e => setWizardData(d => ({ ...d, email: e.target.value }))} className="bg-secondary" /></div>
                <div><Label className="text-xs">Telefono</Label><Input value={wizardData.phone} onChange={e => setWizardData(d => ({ ...d, phone: e.target.value }))} className="bg-secondary" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Paese</Label><Input value={wizardData.country} onChange={e => setWizardData(d => ({ ...d, country: e.target.value }))} className="bg-secondary" /></div>
                <div><Label className="text-xs">Zona</Label><Input value={wizardData.zone} onChange={e => setWizardData(d => ({ ...d, zone: e.target.value }))} className="bg-secondary" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Tipo</Label><Input value={wizardData.business_type} onChange={e => setWizardData(d => ({ ...d, business_type: e.target.value }))} className="bg-secondary" /></div>
                <div><Label className="text-xs">P.IVA</Label><Input value={wizardData.vat_number} onChange={e => setWizardData(d => ({ ...d, vat_number: e.target.value }))} className="bg-secondary" /></div>
              </div>
              <div><Label className="text-xs">Indirizzo</Label><Input value={wizardData.address} onChange={e => setWizardData(d => ({ ...d, address: e.target.value }))} className="bg-secondary" /></div>
              <div><Label className="text-xs">Website</Label><Input value={wizardData.website} onChange={e => setWizardData(d => ({ ...d, website: e.target.value }))} className="bg-secondary" /></div>
              <div>
                <Label className="text-xs font-semibold">Termini di Pagamento *</Label>
                <Select value={wizardData.payment_terms} onValueChange={v => setWizardData(d => ({ ...d, payment_terms: v }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Note pagamento</Label><Textarea value={wizardData.payment_terms_notes} onChange={e => setWizardData(d => ({ ...d, payment_terms_notes: e.target.value }))} className="bg-secondary" rows={2} /></div>
            </div>
          )}

          {/* Step 2: Price List & Sales */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold">Listino Prezzi</Label>
                <Select value={wizardData.price_list_id || "__none__"} onValueChange={v => setWizardData(d => ({ ...d, price_list_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue placeholder="Seleziona listino..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nessun listino —</SelectItem>
                    {priceLists?.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}{pl.description ? ` — ${pl.description}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Sales Representative</Label>
                <Select value={wizardData.assigned_sales_id || "__none__"} onValueChange={v => setWizardData(d => ({ ...d, assigned_sales_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue placeholder="Seleziona sales..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Non assegnato —</SelectItem>
                    {salesUsers?.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.contact_name || s.email || s.user_id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Credentials */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <KeyRound size={16} className="text-primary" />
                <p className="text-sm text-foreground font-semibold">Credenziali Portale Dealer</p>
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={wizardData.account_email} onChange={e => setWizardData(d => ({ ...d, account_email: e.target.value }))} className="bg-secondary font-mono" />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <div className="flex gap-2">
                  <Input value={wizardData.account_password} onChange={e => setWizardData(d => ({ ...d, account_password: e.target.value }))} className="bg-secondary font-mono flex-1" />
                  <Button variant="outline" size="sm" onClick={() => setWizardData(d => ({ ...d, account_password: generatePassword() }))} className="gap-1">
                    <RefreshCw size={12} /> Genera
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(wizardData.account_password); sonnerToast.success("Password copiata"); }}>
                    <Copy size={12} />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <Checkbox checked={wizardData.send_welcome_email} onCheckedChange={(c) => setWizardData(d => ({ ...d, send_welcome_email: !!c }))} />
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1"><Mail size={12} /> Invia email di benvenuto con credenziali</p>
                  <p className="text-xs text-muted-foreground">L'email sarà inviata a {wizardData.account_email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Summary */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-lg space-y-3 text-sm">
                <h3 className="font-heading font-bold text-foreground">Riepilogo</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground text-xs">Azienda</span><p className="font-semibold">{wizardData.company_name}</p></div>
                  <div><span className="text-muted-foreground text-xs">Referente</span><p>{wizardData.contact_name}</p></div>
                  <div><span className="text-muted-foreground text-xs">Paese</span><p>{wizardData.country || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs">P.IVA</span><p>{wizardData.vat_number || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs">Pagamento</span><p>{PAYMENT_TERMS_OPTIONS.find(o => o.value === wizardData.payment_terms)?.label}</p></div>
                  <div><span className="text-muted-foreground text-xs">Listino</span><p>{priceLists?.find(pl => pl.id === wizardData.price_list_id)?.name || "Nessuno"}</p></div>
                  <div><span className="text-muted-foreground text-xs">Sales</span><p>{salesUsers?.find(s => s.user_id === wizardData.assigned_sales_id)?.contact_name || "Non assegnato"}</p></div>
                </div>
                <div className="border-t border-border pt-3">
                  <span className="text-muted-foreground text-xs">Email account</span><p className="font-mono text-sm">{wizardData.account_email}</p>
                  <span className="text-muted-foreground text-xs">Password</span><p className="font-mono text-sm">{wizardData.account_password}</p>
                  <p className="text-xs text-muted-foreground mt-1">{wizardData.send_welcome_email ? "✅ Email di benvenuto sarà inviata" : "❌ Email non sarà inviata"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t border-border">
            <Button variant="outline" onClick={() => wizardStep > 0 ? setWizardStep(s => s - 1) : setWizardRequest(null)} className="gap-1">
              <ChevronLeft size={14} /> {wizardStep > 0 ? "Indietro" : "Annulla"}
            </Button>
            {wizardStep < 3 ? (
              <Button onClick={() => setWizardStep(s => s + 1)} className="gap-1 bg-foreground text-background">
                Avanti <ChevronRight size={14} />
              </Button>
            ) : (
              <Button onClick={handleWizardCreate} disabled={wizardCreating} className="gap-1 bg-success text-success-foreground hover:bg-success/90">
                {wizardCreating ? <><Loader2 size={14} className="animate-spin" /> Creazione...</> : <><Check size={14} /> Crea Account</>}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRequests;
