import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Copy, Pencil, Plus, Trash2, Zap, ArrowRight, History, ChevronDown } from "lucide-react";
import { format } from "date-fns";

/* ── Constants ── */
const triggerTypes: Record<string, string> = {
  lead_created: "Un nuovo lead viene creato",
  lead_stage_changed: "Un lead cambia stage",
  deal_stage_changed: "Un deal cambia stage",
  order_created: "Un nuovo ordine viene creato",
  order_status_changed: "Un ordine cambia status",
  client_inactive_days: "Un cliente è inattivo da X giorni",
  deal_close_date_approaching: "Un deal è in scadenza tra X giorni",
};

const actionTypes: Record<string, string> = {
  create_task: "Crea un task",
  create_activity: "Crea un'attività",
  send_email: "Invia un'email",
  change_stage: "Cambia stage/status",
  assign_to: "Assegna a",
  create_notification: "Crea notifica",
};

const leadStages = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const dealStages = ["qualification", "proposal", "negotiation", "closed_won", "closed_lost"];
const orderStatuses = ["draft", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const taskTypes = ["call", "follow_up", "email", "meeting", "task"];
const priorities = ["low", "medium", "high", "urgent"];

type AutoRule = {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
};

const CRMAutomations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [editingRule, setEditingRule] = useState<AutoRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Wizard form state
  const [triggerType, setTriggerType] = useState("");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({});
  const [actionType, setActionType] = useState("");
  const [actionConfig, setActionConfig] = useState<Record<string, any>>({});
  const [ruleName, setRuleName] = useState("");
  const [ruleDesc, setRuleDesc] = useState("");
  const [ruleActive, setRuleActive] = useState(true);

  /* ── Queries ── */
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AutoRule[];
    },
  });

  const { data: emailTemplates = [] } = useQuery({
    queryKey: ["email-templates-list"],
    queryFn: async () => {
      const { data } = await supabase.from("email_templates").select("id, name");
      return data || [];
    },
  });

  const { data: salesReps = [] } = useQuery({
    queryKey: ["crm-sales-reps-auto"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "sales"]);
      if (!roles?.length) return [];
      const ids = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, email, contact_name").in("user_id", ids);
      return profiles || [];
    },
  });

  /* ── Mutations ── */
  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("automation_rules").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  const saveRule = useMutation({
    mutationFn: async () => {
      const payload = {
        name: ruleName,
        description: ruleDesc || null,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        action_type: actionType,
        action_config: actionConfig,
        is_active: ruleActive,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
      };
      if (editingRule) {
        const { error } = await supabase.from("automation_rules").update(payload).eq("id", editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("automation_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success(editingRule ? "Regola aggiornata" : "Regola creata");
      closeWizard();
    },
    onError: (error: unknown) => showErrorToast(error, "CRMAutomations.saveRule"),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Regola eliminata");
      setDeleteId(null);
    },
  });

  const duplicateRule = useMutation({
    mutationFn: async (rule: AutoRule) => {
      const { error } = await supabase.from("automation_rules").insert({
        name: `${rule.name} (copia)`,
        description: rule.description,
        trigger_type: rule.trigger_type,
        trigger_config: rule.trigger_config,
        action_type: rule.action_type,
        action_config: rule.action_config,
        is_active: false,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Regola duplicata");
    },
  });

  /* ── Helpers ── */
  const closeWizard = () => {
    setWizardOpen(false);
    setStep(1);
    setEditingRule(null);
    setTriggerType("");
    setTriggerConfig({});
    setActionType("");
    setActionConfig({});
    setRuleName("");
    setRuleDesc("");
    setRuleActive(true);
  };

  const openCreate = () => {
    closeWizard();
    setWizardOpen(true);
  };

  const openEdit = (rule: AutoRule) => {
    setEditingRule(rule);
    setTriggerType(rule.trigger_type);
    setTriggerConfig(rule.trigger_config || {});
    setActionType(rule.action_type);
    setActionConfig(rule.action_config || {});
    setRuleName(rule.name);
    setRuleDesc(rule.description || "");
    setRuleActive(rule.is_active);
    setStep(1);
    setWizardOpen(true);
  };

  const autoGenerateName = () => {
    if (!triggerType || !actionType) return "";
    return `${triggerTypes[triggerType]} → ${actionTypes[actionType]}`;
  };

  const goToStep2 = () => {
    if (!triggerType) return;
    setStep(2);
  };

  const goToStep3 = () => {
    if (!actionType) return;
    if (!ruleName) setRuleName(autoGenerateName());
    setStep(3);
  };

  /* ── Render trigger config fields ── */
  const renderTriggerFields = () => {
    switch (triggerType) {
      case "lead_stage_changed":
        return (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Da stage (opzionale)</Label>
              <Select value={triggerConfig.from_stage || ""} onValueChange={v => setTriggerConfig(p => ({ ...p, from_stage: v }))}>
                <SelectTrigger className="bg-secondary"><SelectValue placeholder="Qualsiasi" /></SelectTrigger>
                <SelectContent>
                  {leadStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">A stage</Label>
              <Select value={triggerConfig.to_stage || ""} onValueChange={v => setTriggerConfig(p => ({ ...p, to_stage: v }))}>
                <SelectTrigger className="bg-secondary"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent>
                  {leadStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "deal_stage_changed":
        return (
          <div className="mt-3 space-y-1">
            <Label className="text-xs text-muted-foreground">A stage</Label>
            <Select value={triggerConfig.to_stage || ""} onValueChange={v => setTriggerConfig(p => ({ ...p, to_stage: v }))}>
              <SelectTrigger className="bg-secondary"><SelectValue placeholder="Seleziona" /></SelectTrigger>
              <SelectContent>
                {dealStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      case "order_status_changed":
        return (
          <div className="mt-3 space-y-1">
            <Label className="text-xs text-muted-foreground">A status</Label>
            <Select value={triggerConfig.to_status || ""} onValueChange={v => setTriggerConfig(p => ({ ...p, to_status: v }))}>
              <SelectTrigger className="bg-secondary"><SelectValue placeholder="Seleziona" /></SelectTrigger>
              <SelectContent>
                {orderStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      case "client_inactive_days":
        return (
          <div className="mt-3 space-y-1">
            <Label className="text-xs text-muted-foreground">Giorni di inattività</Label>
            <Input type="number" min={1} className="bg-secondary w-32" value={triggerConfig.days || ""} onChange={e => setTriggerConfig(p => ({ ...p, days: parseInt(e.target.value) || 0 }))} />
          </div>
        );
      case "deal_close_date_approaching":
        return (
          <div className="mt-3 space-y-1">
            <Label className="text-xs text-muted-foreground">Giorni prima della scadenza</Label>
            <Input type="number" min={1} className="bg-secondary w-32" value={triggerConfig.days_before || ""} onChange={e => setTriggerConfig(p => ({ ...p, days_before: parseInt(e.target.value) || 0 }))} />
          </div>
        );
      default:
        return null;
    }
  };

  /* ── Render action config fields ── */
  const renderActionFields = () => {
    switch (actionType) {
      case "create_task":
        return (
          <div className="space-y-3 mt-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Titolo task</Label>
              <Input className="bg-secondary" value={actionConfig.title || ""} onChange={e => setActionConfig(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={actionConfig.type || "task"} onValueChange={v => setActionConfig(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>{taskTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Priorità</Label>
                <Select value={actionConfig.priority || "medium"} onValueChange={v => setActionConfig(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>{priorities.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Scadenza (gg)</Label>
                <Input type="number" min={0} className="bg-secondary" value={actionConfig.due_days_offset ?? 1} onChange={e => setActionConfig(p => ({ ...p, due_days_offset: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
        );
      case "create_activity":
        return (
          <div className="space-y-3 mt-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Titolo</Label>
              <Input className="bg-secondary" value={actionConfig.title || ""} onChange={e => setActionConfig(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={actionConfig.type || "note"} onValueChange={v => setActionConfig(p => ({ ...p, type: v }))}>
                <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>{["call", "email", "meeting", "note"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Dettaglio</Label>
              <Textarea className="bg-secondary" value={actionConfig.body || ""} onChange={e => setActionConfig(p => ({ ...p, body: e.target.value }))} />
            </div>
          </div>
        );
      case "send_email":
        return (
          <div className="mt-3 space-y-1">
            <Label className="text-xs text-muted-foreground">Template email</Label>
            <Select value={actionConfig.template_id || ""} onValueChange={v => setActionConfig(p => ({ ...p, template_id: v }))}>
              <SelectTrigger className="bg-secondary"><SelectValue placeholder="Seleziona template" /></SelectTrigger>
              <SelectContent>
                {emailTemplates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      case "change_stage":
        return (
          <div className="mt-3 space-y-1">
            <Label className="text-xs text-muted-foreground">Nuovo stage/status</Label>
            <Input className="bg-secondary" placeholder="es. at_risk, qualified..." value={actionConfig.new_stage || ""} onChange={e => setActionConfig(p => ({ ...p, new_stage: e.target.value }))} />
          </div>
        );
      case "assign_to":
        return (
          <div className="mt-3 space-y-1">
            <Label className="text-xs text-muted-foreground">Assegna a</Label>
            <Select value={actionConfig.user_id || ""} onValueChange={v => setActionConfig(p => ({ ...p, user_id: v }))}>
              <SelectTrigger className="bg-secondary"><SelectValue placeholder="Seleziona utente" /></SelectTrigger>
              <SelectContent>
                {salesReps.map((r: any) => <SelectItem key={r.user_id} value={r.user_id}>{r.contact_name || r.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      case "create_notification":
        return (
          <div className="space-y-3 mt-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Titolo</Label>
              <Input className="bg-secondary" value={actionConfig.title || ""} onChange={e => setActionConfig(p => ({ ...p, title: e.target.value }))} placeholder="Es: Deal in scadenza" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Body (variabili: {"{{deal_title}}"}, {"{{client_name}}"})</Label>
              <Textarea className="bg-secondary" value={actionConfig.body || ""} onChange={e => setActionConfig(p => ({ ...p, body: e.target.value }))} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Automazioni & Workflow</h1>
          <p className="text-sm text-muted-foreground">Crea regole automatiche: "Quando X succede → fai Y"</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold">
          <Plus size={16} /> Nuova Regola
        </Button>
      </div>

      {/* Rules list */}
      {isLoading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : rules.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Zap className="mx-auto mb-4 h-12 w-12" />
          <p>Nessuna regola di automazione. Crea la prima!</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id} className={`border transition-all ${rule.is_active ? "border-border" : "border-border/40 opacity-60"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="text-sm font-heading font-semibold text-foreground">{rule.name}</h4>
                      <Badge variant="outline" className="text-[10px]">{triggerTypes[rule.trigger_type] || rule.trigger_type}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="secondary" className="text-[10px]">{actionTypes[rule.action_type] || rule.action_type}</Badge>
                    </div>
                    {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">Creata: {format(new Date(rule.created_at), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)} title="Modifica"><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateRule.mutate(rule)} title="Duplica"><Copy size={14} /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(rule.id)} title="Elimina"><Trash2 size={14} /></Button>
                    <Switch checked={rule.is_active} onCheckedChange={v => toggleActive.mutate({ id: rule.id, active: v })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={v => { if (!v) closeWizard(); }}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingRule ? "Modifica Regola" : "Nuova Regola"} — Step {step}/3
            </DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Quando...</p>
              <Select value={triggerType} onValueChange={v => { setTriggerType(v); setTriggerConfig({}); }}>
                <SelectTrigger className="bg-secondary"><SelectValue placeholder="Seleziona trigger" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(triggerTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              {renderTriggerFields()}
              <div className="flex justify-end">
                <Button disabled={!triggerType} onClick={goToStep2}>Avanti</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Allora...</p>
              <Select value={actionType} onValueChange={v => { setActionType(v); setActionConfig({}); }}>
                <SelectTrigger className="bg-secondary"><SelectValue placeholder="Seleziona azione" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(actionTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              {renderActionFields()}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Indietro</Button>
                <Button disabled={!actionType} onClick={goToStep3}>Avanti</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Card className="bg-muted/50 border-border">
                <CardContent className="p-3 text-sm">
                  <span className="text-muted-foreground">Quando </span>
                  <span className="font-medium text-foreground">{triggerTypes[triggerType]}</span>
                  <span className="text-muted-foreground">, allora </span>
                  <span className="font-medium text-foreground">{actionTypes[actionType]}</span>
                </CardContent>
              </Card>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nome regola</Label>
                <Input className="bg-secondary" value={ruleName} onChange={e => setRuleName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Descrizione (opzionale)</Label>
                <Textarea className="bg-secondary" value={ruleDesc} onChange={e => setRuleDesc(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={ruleActive} onCheckedChange={setRuleActive} />
                <Label className="text-sm">Attiva</Label>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>Indietro</Button>
                <Button onClick={() => saveRule.mutate()} disabled={!ruleName || saveRule.isPending}>
                  {saveRule.isPending ? "Salvataggio..." : "Salva regola"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa regola?</AlertDialogTitle>
            <AlertDialogDescription>L'azione non può essere annullata.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteRule.mutate(deleteId)}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CRMAutomations;
