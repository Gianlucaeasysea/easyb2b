import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ArrowRightLeft, Bell, CalendarClock, CheckCircle2, Clock, Play, RefreshCw, Settings2, Zap } from "lucide-react";
import { differenceInDays, format } from "date-fns";

/* ── Automation Rule Definitions ── */
interface AutomationRule {
  id: string;
  name: string;
  description: string;
  category: "status" | "followup" | "notification";
  icon: React.ReactNode;
  enabled: boolean;
  lastRun?: string;
  affectedCount?: number;
}

const CRMAutomations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Data queries ──
  const { data: clients = [] } = useQuery({
    queryKey: ["automation-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, status, days_since_last_order, last_order_date, avg_order_frequency_days, next_reorder_expected_date, email, contact_name")
        .not("status", "in", "(churned,disqualified)");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: pendingTasks = [] } = useQuery({
    queryKey: ["automation-pending-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, client_id, due_date, status, type")
        .eq("status", "pending");
      if (error) throw error;
      return data || [];
    },
  });

  // ── Local state for rule toggles ──
  const [enabledRules, setEnabledRules] = useState<Record<string, boolean>>({
    auto_at_risk: true,
    auto_active_on_order: true,
    followup_reorder: true,
    followup_onboarding: true,
    notify_at_risk: true,
    notify_overdue_task: true,
  });

  const toggleRule = (ruleId: string) => {
    setEnabledRules(prev => ({ ...prev, [ruleId]: !prev[ruleId] }));
  };

  // ── Computed: clients that should be at_risk ──
  const atRiskCandidates = useMemo(() => {
    return clients.filter(c =>
      c.status === "active" &&
      c.days_since_last_order != null &&
      c.days_since_last_order >= 75
    );
  }, [clients]);

  // ── Computed: clients approaching reorder date (within 7 days) ──
  const reorderDueSoon = useMemo(() => {
    return clients.filter(c => {
      if (!c.next_reorder_expected_date || c.status !== "active") return false;
      const daysUntil = differenceInDays(new Date(c.next_reorder_expected_date), new Date());
      return daysUntil >= 0 && daysUntil <= 7;
    });
  }, [clients]);

  // ── Computed: onboarding clients without recent tasks ──
  const onboardingNoTask = useMemo(() => {
    const onboarding = clients.filter(c => c.status === "onboarding");
    return onboarding.filter(c => !pendingTasks.some(t => t.client_id === c.id));
  }, [clients, pendingTasks]);

  // ── Computed: overdue tasks ──
  const overdueTasks = useMemo(() => {
    return pendingTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
  }, [pendingTasks]);

  // ── Mutations ──
  const moveToAtRisk = useMutation({
    mutationFn: async () => {
      const ids = atRiskCandidates.map(c => c.id);
      if (ids.length === 0) throw new Error("Nessun cliente da spostare");
      for (const id of ids) {
        const { error } = await supabase.from("clients").update({ status: "at_risk" }).eq("id", id);
        if (error) throw error;
      }
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["automation-clients"] });
      toast({ title: `${count} clienti spostati a "At Risk"` });
    },
    onError: () => toast({ title: "Errore aggiornamento status", variant: "destructive" }),
  });

  const createFollowUpTasks = useMutation({
    mutationFn: async (targetClients: typeof clients) => {
      if (targetClients.length === 0) throw new Error("Nessun cliente");
      const { data: { user } } = await supabase.auth.getUser();
      const tasks = targetClients.map(c => ({
        title: `Follow-up riordino: ${c.company_name}`,
        description: `Il cliente si avvicina alla data prevista di riordino. Contattare per verificare necessità.`,
        type: "call",
        priority: "high",
        status: "pending",
        client_id: c.id,
        due_date: c.next_reorder_expected_date || new Date().toISOString(),
        created_by: user?.id,
      }));
      const { error } = await supabase.from("tasks").insert(tasks);
      if (error) throw error;
      return tasks.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["automation-pending-tasks"] });
      toast({ title: `${count} task di follow-up creati` });
    },
    onError: () => toast({ title: "Errore creazione task", variant: "destructive" }),
  });

  const createOnboardingTasks = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const tasks = onboardingNoTask.map(c => ({
        title: `Onboarding check: ${c.company_name}`,
        description: `Verificare lo stato dell'onboarding e pianificare prossimi step.`,
        type: "task",
        priority: "medium",
        status: "pending",
        client_id: c.id,
        due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
        created_by: user?.id,
      }));
      if (tasks.length === 0) throw new Error("Nessun cliente in onboarding senza task");
      const { error } = await supabase.from("tasks").insert(tasks);
      if (error) throw error;
      return tasks.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["automation-pending-tasks"] });
      toast({ title: `${count} task onboarding creati` });
    },
    onError: () => toast({ title: "Errore creazione task", variant: "destructive" }),
  });

  // ── Rule definitions ──
  const rules: AutomationRule[] = [
    {
      id: "auto_at_risk",
      name: "Auto → At Risk",
      description: "Sposta automaticamente i clienti attivi inattivi da 75+ giorni allo status 'At Risk'",
      category: "status",
      icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
      enabled: enabledRules.auto_at_risk,
      affectedCount: atRiskCandidates.length,
    },
    {
      id: "auto_active_on_order",
      name: "Auto → Active su nuovo ordine",
      description: "Quando un cliente in onboarding/at_risk effettua un ordine, viene riportato ad 'Active'",
      category: "status",
      icon: <CheckCircle2 className="h-5 w-5 text-success" />,
      enabled: enabledRules.auto_active_on_order,
    },
    {
      id: "followup_reorder",
      name: "Follow-up Riordino",
      description: "Crea task di follow-up per clienti che si avvicinano alla data prevista di riordino (entro 7gg)",
      category: "followup",
      icon: <CalendarClock className="h-5 w-5 text-warning" />,
      enabled: enabledRules.followup_reorder,
      affectedCount: reorderDueSoon.length,
    },
    {
      id: "followup_onboarding",
      name: "Check Onboarding",
      description: "Crea task di verifica per clienti in fase onboarding senza task attivi",
      category: "followup",
      icon: <RefreshCw className="h-5 w-5 text-chart-4" />,
      enabled: enabledRules.followup_onboarding,
      affectedCount: onboardingNoTask.length,
    },
    {
      id: "notify_at_risk",
      name: "Alert Clienti At Risk",
      description: "Notifica il sales team quando un cliente entra nello status 'At Risk'",
      category: "notification",
      icon: <Bell className="h-5 w-5 text-destructive" />,
      enabled: enabledRules.notify_at_risk,
    },
    {
      id: "notify_overdue_task",
      name: "Alert Task Scaduti",
      description: "Evidenzia i task scaduti che richiedono attenzione immediata",
      category: "notification",
      icon: <Clock className="h-5 w-5 text-warning" />,
      enabled: enabledRules.notify_overdue_task,
      affectedCount: overdueTasks.length,
    },
  ];

  const runAutomation = (ruleId: string) => {
    switch (ruleId) {
      case "auto_at_risk":
        moveToAtRisk.mutate();
        break;
      case "followup_reorder":
        createFollowUpTasks.mutate(reorderDueSoon);
        break;
      case "followup_onboarding":
        createOnboardingTasks.mutate();
        break;
      default:
        toast({ title: "Regola eseguita (simulazione)", description: "Questa automazione verrà eseguita al prossimo ciclo." });
    }
  };

  const categoryLabels: Record<string, { label: string; desc: string }> = {
    status: { label: "Transizioni Status", desc: "Regole per il cambio automatico dello status dei clienti" },
    followup: { label: "Follow-up Automatici", desc: "Creazione automatica di task e promemoria" },
    notification: { label: "Notifiche & Alert", desc: "Avvisi automatici per il team commerciale" },
  };

  const renderRuleCard = (rule: AutomationRule) => (
    <Card key={rule.id} className={`border transition-all ${rule.enabled ? "border-border" : "border-border/40 opacity-60"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-0.5">{rule.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-heading font-semibold text-foreground">{rule.name}</h4>
                {rule.affectedCount != null && rule.affectedCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {rule.affectedCount} da processare
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{rule.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {rule.enabled && rule.affectedCount != null && rule.affectedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => runAutomation(rule.id)}
              >
                <Play className="h-3 w-3" />
                Esegui ora
              </Button>
            )}
            <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ── Summary stats ──
  const totalEnabled = Object.values(enabledRules).filter(Boolean).length;
  const totalAffected = atRiskCandidates.length + reorderDueSoon.length + onboardingNoTask.length + overdueTasks.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Automazioni & Workflow</h1>
        <p className="text-sm text-muted-foreground">
          Gestisci le regole automatiche per follow-up, transizioni status e notifiche
        </p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold font-heading text-foreground">{totalEnabled}</p>
              <p className="text-xs text-muted-foreground">Regole Attive</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowRightLeft className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold font-heading text-foreground">{atRiskCandidates.length}</p>
              <p className="text-xs text-muted-foreground">Da spostare At Risk</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-warning" />
            <div>
              <p className="text-2xl font-bold font-heading text-foreground">{reorderDueSoon.length}</p>
              <p className="text-xs text-muted-foreground">Riordini in scadenza</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-chart-4" />
            <div>
              <p className="text-2xl font-bold font-heading text-foreground">{overdueTasks.length}</p>
              <p className="text-xs text-muted-foreground">Task Scaduti</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules by category */}
      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Transizioni Status</TabsTrigger>
          <TabsTrigger value="followup">Follow-up</TabsTrigger>
          <TabsTrigger value="notification">Notifiche</TabsTrigger>
          <TabsTrigger value="preview">Anteprima Azioni</TabsTrigger>
        </TabsList>

        {(["status", "followup", "notification"] as const).map(cat => (
          <TabsContent key={cat} value={cat} className="space-y-3">
            <div className="mb-2">
              <h2 className="text-sm font-heading font-semibold text-foreground">{categoryLabels[cat].label}</h2>
              <p className="text-xs text-muted-foreground">{categoryLabels[cat].desc}</p>
            </div>
            {rules.filter(r => r.category === cat).map(renderRuleCard)}
          </TabsContent>
        ))}

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading">Clienti da spostare ad At Risk</CardTitle>
              <CardDescription className="text-xs">Clienti attivi con 75+ giorni di inattività</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {atRiskCandidates.length === 0 ? (
                <p className="text-xs text-muted-foreground px-4 pb-4">Nessun cliente da spostare</p>
              ) : (
                <div className="divide-y divide-border">
                  {atRiskCandidates.slice(0, 10).map(c => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-2 text-xs">
                      <div>
                        <span className="font-medium text-foreground">{c.company_name}</span>
                        <span className="text-muted-foreground ml-2">{c.contact_name || "—"}</span>
                      </div>
                      <Badge variant="destructive" className="text-[10px]">
                        {c.days_since_last_order}d inattivo
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading">Follow-up Riordino Imminente</CardTitle>
              <CardDescription className="text-xs">Clienti con data di riordino prevista entro 7 giorni</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {reorderDueSoon.length === 0 ? (
                <p className="text-xs text-muted-foreground px-4 pb-4">Nessun riordino imminente</p>
              ) : (
                <div className="divide-y divide-border">
                  {reorderDueSoon.slice(0, 10).map(c => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-2 text-xs">
                      <div>
                        <span className="font-medium text-foreground">{c.company_name}</span>
                      </div>
                      <span className="text-warning font-medium">
                        Riordino: {c.next_reorder_expected_date ? format(new Date(c.next_reorder_expected_date), "dd/MM/yyyy") : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading">Task Scaduti</CardTitle>
              <CardDescription className="text-xs">Task pending con scadenza superata</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {overdueTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground px-4 pb-4">Nessun task scaduto</p>
              ) : (
                <div className="divide-y divide-border">
                  {overdueTasks.slice(0, 10).map(t => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-2 text-xs">
                      <div>
                        <span className="font-medium text-foreground">{t.title}</span>
                        <Badge variant="outline" className="ml-2 text-[10px]">{t.type}</Badge>
                      </div>
                      <span className="text-destructive font-medium">
                        Scaduto: {t.due_date ? format(new Date(t.due_date), "dd/MM") : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRMAutomations;
