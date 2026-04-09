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
import { FileText, Check, X, Target, Eye, ChevronRight, ChevronLeft, KeyRound, Copy, RefreshCw, Loader2, Mail, Clock, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { convertRequestToPipeline } from "@/lib/crmEntityActions";
import { showErrorToast } from "@/lib/errorHandler";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const PAYMENT_TERMS_OPTIONS = [
  { value: "prepaid", label: "Prepaid" },
  { value: "30_days", label: "Net 30" },
  { value: "60_days", label: "Net 60" },
  { value: "90_days", label: "Net 90" },
  { value: "end_of_month", label: "End of Month" },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-primary/15 text-primary border-0" },
  reviewed: { label: "Under Review", className: "bg-warning/15 text-warning border-0" },
  approved: { label: "Approved", className: "bg-success/15 text-success border-0" },
  converted: { label: "Approved", className: "bg-success/15 text-success border-0" },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive border-0" },
};

const generatePassword = (len = 14): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => chars[b % chars.length])
    .join("");
};

const AdminRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Reject
  const [rejectRequest, setRejectRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [sendRejectEmail, setSendRejectEmail] = useState(false);

  // Wizard
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

  const saveAdminNotes = useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes: string }) => {
      const { error } = await supabase.from("distributor_requests").update({ admin_notes } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      toast.success("Notes saved");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes?: string }) => {
      const update: any = { status };
      if (admin_notes !== undefined) update.admin_notes = admin_notes;
      const { error } = await supabase.from("distributor_requests").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-requests-count"] });
      if (selectedRequest?.id === variables.id) {
        setSelectedRequest((prev: any) => prev ? { ...prev, status: variables.status } : prev);
      }
      const labels: Record<string, string> = { reviewed: "Request marked as under review", rejected: "Request rejected" };
      toast.success(labels[variables.status] || "Status updated");
    },
  });

  const convertToLead = useMutation({
    mutationFn: async (request: any) => convertRequestToPipeline(request.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-organizations"] });
      toast.success("Lead + Organization created from request!");
      setSelectedRequest(null);
    },
    onError: (e: any) => showErrorToast(e, "AdminRequests.convertToLead"),
  });

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    await supabase.from("distributor_requests").update({ status: "rejected", admin_notes: rejectReason } as any).eq("id", rejectRequest.id);
    queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
    queryClient.invalidateQueries({ queryKey: ["pending-requests-count"] });

    // Optionally send rejection email
    if (sendRejectEmail) {
      try {
        // Use edge function directly to send rejection email without requiring client_id
        await supabase.functions.invoke("send-crm-email", {
          body: {
            recipient_email: rejectRequest.email,
            subject: "EasySea — Update on your application",
            body: `Dear ${rejectRequest.contact_name},\n\nThank you for your interest in becoming an EasySea dealer.\n\nAfter careful evaluation, we are currently unable to proceed with your application.\n\nReason: ${rejectReason}\n\nThank you for your understanding.\n\nBest regards,\nThe EasySea Team`,
            sent_by: user?.id,
            skip_client_id: true,
            idempotency_key: crypto.randomUUID(),
          },
        });
        toast.success("Rejection email sent");
      } catch {
        toast.error("Error sending rejection email");
      }
    }

    toast.success("Request rejected");
    setRejectRequest(null);
    setRejectReason("");
    setSendRejectEmail(false);
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
    setSelectedRequest(null);
  };

  const handleWizardCreate = async () => {
    // Validation
    if (!wizardData.company_name.trim() || !wizardData.account_email.trim() || !wizardData.account_password.trim()) {
      toast.error("Please fill all required fields: company name, account email and password");
      return;
    }

    setWizardCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Fix #8: Check if a client already exists with same email or company name (deduplication)
      let clientId: string;
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .or(`email.eq.${wizardData.email},company_name.eq.${wizardData.company_name}`)
        .limit(1)
        .maybeSingle();

      if (existingClient) {
        // Update existing client with wizard data
        const { error: updateErr } = await supabase.from("clients").update({
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
        } as any).eq("id", existingClient.id);
        if (updateErr) throw updateErr;
        clientId = existingClient.id;
      } else {
        // Create new client record
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
        clientId = newClient.id;
      }

      // 2. Assign price list (remove old assignments first to avoid duplicates)
      if (wizardData.price_list_id) {
        await supabase.from("price_list_clients").delete().eq("client_id", clientId);
        await supabase.from("price_list_clients").insert({
          price_list_id: wizardData.price_list_id,
          client_id: clientId,
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
          client_id: clientId,
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
      queryClient.invalidateQueries({ queryKey: ["pending-requests-count"] });
      toast.success(`Dealer account created for ${wizardData.company_name}`);
      setWizardRequest(null);
      navigate(`/admin/clients/${clientId}`);
    } catch (error) {
      showErrorToast(error, "AdminRequests.wizardCreate");
    } finally {
      setWizardCreating(false);
    }
  };

  const counts = {
    all: requests?.length || 0,
    new: requests?.filter(r => r.status === "new").length || 0,
    reviewed: requests?.filter(r => r.status === "reviewed").length || 0,
    approved: requests?.filter(r => r.status === "approved" || r.status === "converted").length || 0,
    rejected: requests?.filter(r => r.status === "rejected").length || 0,
  };

  const filtered = statusFilter === "all" ? requests : requests?.filter(r => {
    if (statusFilter === "new") return r.status === "new";
    if (statusFilter === "reviewed") return r.status === "reviewed";
    if (statusFilter === "approved") return r.status === "approved" || r.status === "converted";
    if (statusFilter === "rejected") return r.status === "rejected";
    return true;
  });

  const WIZARD_STEPS = ["Verify Data", "Account Setup", "Credentials", "Confirmation"];

  const FILTER_TABS = [
    { value: "all", label: "All", count: counts.all },
    { value: "new", label: "New", count: counts.new },
    { value: "reviewed", label: "Under Review", count: counts.reviewed },
    { value: "approved", label: "Approved", count: counts.approved },
    { value: "rejected", label: "Rejected", count: counts.rejected },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Dealer Requests</h1>
          <p className="text-sm text-muted-foreground">Manage new dealer applications</p>
        </div>
        <div className="flex items-center gap-2">
          {counts.new > 0 && (
            <Badge className="bg-primary/15 text-primary border-0">{counts.new} new</Badge>
          )}
          <Badge variant="outline" className="text-xs">{counts.all} total</Badge>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map(f => (
          <Button key={f.value} variant={statusFilter === f.value ? "default" : "outline"} size="sm" className="text-xs gap-1.5" onClick={() => setStatusFilter(f.value)}>
            {f.label}
            {f.count > 0 && f.value !== "all" && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 min-w-4 px-1">{f.count}</Badge>
            )}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !filtered?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <FileText className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No requests found.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map(r => {
                const sc = STATUS_CONFIG[r.status || "new"] || STATUS_CONFIG.new;
                return (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => { setSelectedRequest(r); setEditingNotes((r as any).admin_notes || ""); }}>
                    <TableCell className="text-muted-foreground text-xs">{format(new Date(r.created_at), "dd MMM yyyy", { locale: it })}</TableCell>
                    <TableCell className="font-heading font-semibold">{r.company_name}</TableCell>
                    <TableCell className="text-sm">{r.contact_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{r.email}</TableCell>
                    <TableCell className="text-muted-foreground">{(r as any).country || "—"}</TableCell>
                    <TableCell><Badge className={sc.className}>{sc.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-8 px-3 text-xs gap-1.5" onClick={() => { setSelectedRequest(r); setEditingNotes((r as any).admin_notes || ""); }}>
                          <Eye size={14} /> Manage
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Modal — Split Layout */}
      <Dialog open={!!selectedRequest && !wizardRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedRequest && (() => {
            const sc = STATUS_CONFIG[selectedRequest.status || "new"] || STATUS_CONFIG.new;
            const isActionable = selectedRequest.status === "new" || selectedRequest.status === "reviewed";
            const isTerminal = selectedRequest.status === "approved" || selectedRequest.status === "converted" || selectedRequest.status === "rejected";

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="font-heading text-lg">{selectedRequest.company_name}</DialogTitle>
                    <Badge className={sc.className}>{sc.label}</Badge>
                  </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-2">
                  {/* LEFT — Request Data */}
                  <div className="md:col-span-3 space-y-4">
                    <h3 className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">Dati Richiesta</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground text-xs">Referente</span><p className="font-medium">{selectedRequest.contact_name}</p></div>
                      <div><span className="text-muted-foreground text-xs">Email</span><p className="font-medium">{selectedRequest.email}</p></div>
                      <div><span className="text-muted-foreground text-xs">Telefono</span><p className="font-medium">{selectedRequest.phone}</p></div>
                      <div><span className="text-muted-foreground text-xs">Paese</span><p className="font-medium">{(selectedRequest as any).country || "—"}</p></div>
                      <div><span className="text-muted-foreground text-xs">Zona</span><p className="font-medium">{selectedRequest.zone || "—"}</p></div>
                      <div><span className="text-muted-foreground text-xs">Tipo Attività</span><p className="font-medium">{selectedRequest.business_type || "—"}</p></div>
                      <div><span className="text-muted-foreground text-xs">P.IVA</span><p className="font-medium">{(selectedRequest as any).vat_number || "—"}</p></div>
                      <div><span className="text-muted-foreground text-xs">Sito Web</span><p className="font-medium">{selectedRequest.website || "—"}</p></div>
                      <div><span className="text-muted-foreground text-xs">Consenso Marketing</span><p className="font-medium">{selectedRequest.marketing_consent ? "✅ Sì" : "❌ No"}</p></div>
                      <div><span className="text-muted-foreground text-xs">Data Invio</span><p className="font-medium">{format(new Date(selectedRequest.created_at), "dd MMMM yyyy, HH:mm", { locale: it })}</p></div>
                    </div>
                    {selectedRequest.message && (
                      <div>
                        <span className="text-muted-foreground text-xs">Messaggio</span>
                        <p className="text-sm mt-1 p-3 bg-secondary/50 rounded-lg">{selectedRequest.message}</p>
                      </div>
                    )}
                  </div>

                  {/* RIGHT — Actions */}
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">Azioni Admin</h3>

                    {/* Admin Notes */}
                    <div>
                      <Label className="text-xs">Note Admin</Label>
                      <Textarea
                        value={editingNotes}
                        onChange={e => setEditingNotes(e.target.value)}
                        placeholder="Aggiungi note interne..."
                        className="mt-1 bg-secondary border-border rounded-lg min-h-[80px]"
                        disabled={isTerminal}
                      />
                      {!isTerminal && (
                        <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => saveAdminNotes.mutate({ id: selectedRequest.id, admin_notes: editingNotes })}>
                          Salva Note
                        </Button>
                      )}
                    </div>

                    {/* Action buttons based on status */}
                    {selectedRequest.status === "new" && (
                      <div className="space-y-2 pt-3 border-t border-border">
                        <Button className="w-full gap-1.5 text-sm" variant="outline" onClick={() => updateStatus.mutate({ id: selectedRequest.id, status: "reviewed" })}>
                          <Clock size={14} /> Segna in Revisione
                        </Button>
                        <Button className="w-full gap-1.5 text-sm bg-success text-success-foreground hover:bg-success/90" onClick={() => openWizard(selectedRequest)}>
                          <Check size={14} /> Approva
                        </Button>
                        <Button className="w-full gap-1.5 text-sm" variant="destructive" onClick={() => { setRejectRequest(selectedRequest); setRejectReason(""); setSendRejectEmail(false); setSelectedRequest(null); }}>
                          <X size={14} /> Rifiuta
                        </Button>
                        <Button className="w-full gap-1.5 text-sm" variant="outline" onClick={() => convertToLead.mutate(selectedRequest)}>
                          <Target size={14} /> Inserisci in Pipeline
                        </Button>
                      </div>
                    )}

                    {selectedRequest.status === "reviewed" && (
                      <div className="space-y-2 pt-3 border-t border-border">
                        <Button className="w-full gap-1.5 text-sm bg-success text-success-foreground hover:bg-success/90" onClick={() => openWizard(selectedRequest)}>
                          <Check size={14} /> Approva
                        </Button>
                        <Button className="w-full gap-1.5 text-sm" variant="destructive" onClick={() => { setRejectRequest(selectedRequest); setRejectReason(""); setSendRejectEmail(false); setSelectedRequest(null); }}>
                          <X size={14} /> Rifiuta
                        </Button>
                      </div>
                    )}

                    {isTerminal && (
                      <div className="pt-3 border-t border-border space-y-2">
                        <div className="p-3 bg-secondary/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Stato finale</p>
                          <Badge className={`mt-1 ${sc.className}`}>{sc.label}</Badge>
                        </div>
                        {(selectedRequest as any).admin_notes && (
                          <div className="p-3 bg-secondary/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Note</p>
                            <p className="text-sm mt-1">{(selectedRequest as any).admin_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectRequest} onOpenChange={() => setRejectRequest(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-heading">Rifiuta Richiesta</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Inserisci il motivo del rifiuto per <strong>{rejectRequest?.company_name}</strong>:</p>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Motivo del rifiuto..." className="bg-secondary border-border min-h-[100px]" />
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
            <Checkbox checked={sendRejectEmail} onCheckedChange={(c) => setSendRejectEmail(!!c)} />
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-1"><Mail size={12} /> Invia email di rifiuto al richiedente</p>
              <p className="text-xs text-muted-foreground">L'email sarà inviata a {rejectRequest?.email}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRequest(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>Conferma Rifiuto</Button>
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

          {/* Step 1: Verify Data */}
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
                <div><Label className="text-xs">Tipo Attività</Label><Input value={wizardData.business_type} onChange={e => setWizardData(d => ({ ...d, business_type: e.target.value }))} className="bg-secondary" /></div>
                <div><Label className="text-xs">P.IVA</Label><Input value={wizardData.vat_number} onChange={e => setWizardData(d => ({ ...d, vat_number: e.target.value }))} className="bg-secondary" /></div>
              </div>
              <div><Label className="text-xs">Indirizzo</Label><Input value={wizardData.address} onChange={e => setWizardData(d => ({ ...d, address: e.target.value }))} className="bg-secondary" /></div>
              <div><Label className="text-xs">Sito Web</Label><Input value={wizardData.website} onChange={e => setWizardData(d => ({ ...d, website: e.target.value }))} className="bg-secondary" /></div>
            </div>
          )}

          {/* Step 2: Account Config */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold">Termini di Pagamento *</Label>
                <Select value={wizardData.payment_terms} onValueChange={v => setWizardData(d => ({ ...d, payment_terms: v }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
                <Label className="text-xs font-semibold">Referente Commerciale</Label>
                <Select value={wizardData.assigned_sales_id || "__none__"} onValueChange={v => setWizardData(d => ({ ...d, assigned_sales_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue placeholder="Seleziona sales..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Non assegnato —</SelectItem>
                    {salesUsers?.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.contact_name || s.email || s.user_id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Note pagamento</Label><Textarea value={wizardData.payment_terms_notes} onChange={e => setWizardData(d => ({ ...d, payment_terms_notes: e.target.value }))} className="bg-secondary" rows={2} /></div>
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
                <Label className="text-xs">Email *</Label>
                <Input value={wizardData.account_email} onChange={e => setWizardData(d => ({ ...d, account_email: e.target.value }))} className="bg-secondary font-mono" />
              </div>

              <div>
                <Label className="text-xs">Password *</Label>
                <div className="flex gap-2">
                  <Input value={wizardData.account_password} onChange={e => setWizardData(d => ({ ...d, account_password: e.target.value }))} className="bg-secondary font-mono flex-1" />
                  <Button variant="outline" size="sm" onClick={() => setWizardData(d => ({ ...d, account_password: generatePassword() }))} className="gap-1">
                    <RefreshCw size={12} /> Genera
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(wizardData.account_password); toast.success("Password copiata"); }}>
                    <Copy size={12} />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">La password verrà inviata al dealer tramite email di benvenuto</p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <Checkbox checked={wizardData.send_welcome_email} onCheckedChange={(c) => setWizardData(d => ({ ...d, send_welcome_email: !!c }))} />
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1"><Mail size={12} /> Invia email di benvenuto</p>
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
                  <div><span className="text-muted-foreground text-xs">Referente Commerciale</span><p>{salesUsers?.find(s => s.user_id === wizardData.assigned_sales_id)?.contact_name || "Non assegnato"}</p></div>
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
              <Button onClick={() => setWizardStep(s => s + 1)} className="gap-1" disabled={
                (wizardStep === 0 && (!wizardData.company_name.trim() || !wizardData.email.trim())) ||
                (wizardStep === 2 && (!wizardData.account_email.trim() || !wizardData.account_password.trim()))
              }>
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
