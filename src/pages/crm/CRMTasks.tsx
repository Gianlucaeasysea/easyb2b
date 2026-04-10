import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Plus, CheckSquare, Phone, Video, MailOpen, Clock, AlertTriangle,
  Check, Building2, Calendar, Handshake, MoreHorizontal, ListTodo, CalendarDays
} from "lucide-react";
import { useState } from "react";
import { format, isPast, isToday, isValid, addDays, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  task: { label: "Task", icon: ListTodo, color: "text-muted-foreground border-muted-foreground" },
  call: { label: "Call", icon: Phone, color: "text-primary border-primary" },
  meeting: { label: "Meeting", icon: Video, color: "text-success border-success" },
  follow_up: { label: "Follow-up", icon: MailOpen, color: "text-warning border-warning" },
  deadline: { label: "Deadline", icon: AlertTriangle, color: "text-destructive border-destructive" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-primary/20 text-primary" },
  high: { label: "High", color: "bg-warning/20 text-warning" },
  urgent: { label: "Urgent", color: "bg-destructive/20 text-destructive" },
};


const calTypeColors: Record<string, string> = {
  task: "bg-muted-foreground/20 border-muted-foreground",
  call: "bg-primary/20 border-primary",
  meeting: "bg-success/20 border-success",
  follow_up: "bg-warning/20 border-warning",
  deadline: "bg-destructive/20 border-destructive",
};

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isValid(dt) ? format(dt, "dd MMM, HH:mm") : "—";
};

const emptyForm = {
  title: "", description: "", type: "task", priority: "medium",
  due_date: "", reminder_at: "", client_id: "", contact_id: "",
  deal_id: "", lead_id: "",
};

const CRMTasks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("active");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calWeekOffset, setCalWeekOffset] = useState(0);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["crm-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, clients:client_id(id, company_name), contact:contact_id(id, contact_name), deals:deal_id(id, title), leads:lead_id(id, company_name)")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orgOptions } = useQuery({
    queryKey: ["crm-task-orgs"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, company_name").order("company_name");
      return data || [];
    },
  });

  const { data: contactOptions } = useQuery({
    queryKey: ["crm-task-contacts", form.client_id],
    queryFn: async () => {
      if (!form.client_id) return [];
      const { data } = await supabase.from("client_contacts").select("id, contact_name").eq("client_id", form.client_id).order("contact_name");
      return data || [];
    },
    enabled: !!form.client_id,
  });

  const { data: dealOptions } = useQuery({
    queryKey: ["crm-task-deals", form.client_id],
    queryFn: async () => {
      let q = supabase.from("deals").select("id, title").not("stage", "in", '("closed_won","closed_lost")');
      if (form.client_id) q = q.eq("client_id", form.client_id);
      const { data } = await q.order("title");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title,
        description: form.description || null,
        type: form.type,
        priority: form.priority,
        due_date: form.due_date || null,
        reminder_at: form.reminder_at || null,
        client_id: form.client_id || null,
        contact_id: form.contact_id || null,
        deal_id: form.deal_id || null,
        lead_id: form.lead_id || null,
      };
      if (editTask) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editTask.id);
        if (error) throw error;
      } else {
        payload.assigned_to = user?.id;
        payload.created_by = user?.id;
        const { error } = await supabase.from("tasks").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      toast.success(editTask ? "Task updated" : "Task created");
      setOpen(false);
      setEditTask(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      toast.success("Task completed");
    },
  });

  const postponeMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const task = tasks?.find(t => t.id === id);
      const base = task?.due_date ? new Date(task.due_date) : new Date();
      const newDate = addDays(base, days);
      const { error } = await supabase.from("tasks").update({ due_date: newDate.toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      toast.success("Deadline postponed");
    },
  });

  const openEdit = (t: any) => {
    setForm({
      title: t.title || "",
      description: t.description || "",
      type: t.type || "task",
      priority: t.priority || "medium",
      due_date: t.due_date ? t.due_date.slice(0, 16) : "",
      reminder_at: t.reminder_at ? t.reminder_at.slice(0, 16) : "",
      client_id: t.client_id || "",
      contact_id: t.contact_id || "",
      deal_id: t.deal_id || "",
      lead_id: t.lead_id || "",
    });
    setEditTask(t);
    setOpen(true);
  };

  const openCreate = (prefill?: Partial<typeof emptyForm>) => {
    setForm({ ...emptyForm, ...prefill });
    setEditTask(null);
    setOpen(true);
  };

  const filtered = tasks?.filter(t => {
    if (filter === "active") return t.status !== "completed" && t.status !== "cancelled";
    if (filter === "overdue") return t.status === "pending" && t.due_date && isPast(new Date(t.due_date));
    if (filter === "today") return t.due_date && isToday(new Date(t.due_date));
    if (filter === "completed") return t.status === "completed";
    return true;
  }).filter(t => {
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    return true;
  }).sort((a, b) => {
    const aOverdue = a.status === "pending" && a.due_date && isPast(new Date(a.due_date));
    const bOverdue = b.status === "pending" && b.due_date && isPast(new Date(b.due_date));
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  // Calendar view
  const weekStart = startOfWeek(addWeeks(new Date(), calWeekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(new Date(), calWeekOffset), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getTasksForDay = (day: Date) =>
    tasks?.filter(t => t.due_date && t.status !== "completed" && t.status !== "cancelled" && format(new Date(t.due_date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Task & Reminders</h1>
          <p className="text-sm text-muted-foreground">Manage tasks, deadlines and follow-ups for the sales team</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="rounded-none text-xs" onClick={() => setView("list")}>
              <ListTodo size={14} className="mr-1" /> List
            </Button>
            <Button variant={view === "calendar" ? "default" : "ghost"} size="sm" className="rounded-none text-xs" onClick={() => setView("calendar")}>
              <CalendarDays size={14} className="mr-1" /> Calendar
            </Button>
          </div>
          <Button onClick={() => openCreate()} className="rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold">
            <Plus size={16} className="mr-2" /> New Task
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <>
          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              { key: "all", label: "All" }, { key: "active", label: "Active" },
              { key: "today", label: "Today" }, { key: "overdue", label: "Overdue" },
              { key: "completed", label: "Completed" },
            ].map(f => (
              <Button key={f.key} variant={filter === f.key ? "default" : "outline"} size="sm" className="rounded-full text-xs" onClick={() => setFilter(f.key)}>
                {f.label}
              </Button>
            ))}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-8 text-xs rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32 h-8 text-xs rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {Object.entries(priorityConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !filtered?.length ? (
            <div className="text-center py-20 glass-card-solid">
              <CheckSquare className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="text-muted-foreground">No tasks found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(t => {
                const tc = typeConfig[t.type || "task"] || typeConfig.task;
                const Icon = tc.icon;
                const pc = priorityConfig[t.priority || "medium"];
                const isOverdue = t.status === "pending" && t.due_date && isPast(new Date(t.due_date));
                const org = (t as any).clients;
                const deal = (t as any).deals;
                const contact = (t as any).contact;
                return (
                  <div
                    key={t.id}
                    className={`glass-card-solid p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors ${t.status === "completed" ? "opacity-50" : ""} ${isOverdue ? "bg-destructive/5 border-l-2 border-l-destructive" : ""}`}
                    onClick={() => openEdit(t)}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${tc.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-heading font-semibold text-sm ${t.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                        <Badge className={`border-0 text-[10px] ${pc.color}`}>{pc.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {org && (
                          <button className="text-xs text-primary hover:underline flex items-center gap-1" onClick={e => { e.stopPropagation(); navigate(`/crm/organizations/${org.id}`); }}>
                            <Building2 size={10} /> {org.company_name}
                          </button>
                        )}
                        {contact && <span className="text-xs text-muted-foreground">→ {contact.contact_name}</span>}
                        {deal && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Handshake size={10} /> {deal.title}
                          </span>
                        )}
                        {t.due_date && (
                          <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                            <Calendar size={10} /> {fmtDate(t.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {t.status !== "completed" && t.status !== "cancelled" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success" onClick={() => completeMutation.mutate(t.id)} title="Complete">
                            <Check size={14} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreHorizontal size={14} /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => postponeMutation.mutate({ id: t.id, days: 1 })}>
                                <Clock size={12} className="mr-2" /> +1 day
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => postponeMutation.mutate({ id: t.id, days: 3 })}>
                                <Clock size={12} className="mr-2" /> +3 days
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => postponeMutation.mutate({ id: t.id, days: 7 })}>
                                <Clock size={12} className="mr-2" /> +1 week
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Calendar View */
        <div>
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={() => setCalWeekOffset(o => o - 1)}>← Previous week</Button>
            <h2 className="font-heading font-bold text-foreground">
              {format(weekStart, "d MMM")} — {format(weekEnd, "d MMM yyyy")}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCalWeekOffset(0)}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => setCalWeekOffset(o => o + 1)}>Next week →</Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const dayTasks = getTasksForDay(day);
              const isCurrentDay = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`glass-card-solid p-3 min-h-[160px] cursor-pointer hover:bg-muted/30 transition-colors ${isCurrentDay ? "border-primary border-2" : ""}`}
                  onClick={() => openCreate({ due_date: format(day, "yyyy-MM-dd'T'09:00") })}
                >
                  <p className={`text-xs font-heading font-bold mb-2 ${isCurrentDay ? "text-primary" : "text-muted-foreground"}`}>
                    {format(day, "EEE d")}
                  </p>
                  <div className="space-y-1">
                    {dayTasks.map(t => (
                      <div
                        key={t.id}
                        className={`text-[11px] p-1.5 rounded border-l-2 cursor-pointer hover:opacity-80 ${calTypeColors[t.type || "task"]}`}
                        onClick={e => { e.stopPropagation(); openEdit(t); }}
                      >
                        <p className="font-medium text-foreground truncate">{t.title}</p>
                        {t.due_date && <p className="text-muted-foreground">{format(new Date(t.due_date), "HH:mm")}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditTask(null); setForm(emptyForm); } }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editTask ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Title *</Label>
              <Input className="rounded-lg bg-secondary border-border" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Due Date</Label>
                <Input type="datetime-local" className="rounded-lg bg-secondary border-border" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Reminder</Label>
                <Input type="datetime-local" className="rounded-lg bg-secondary border-border" value={form.reminder_at} onChange={e => setForm(f => ({ ...f, reminder_at: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Organization</Label>
                <Select value={form.client_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, client_id: v === "__none__" ? "" : v, contact_id: "", deal_id: "" }))}>
                  <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {orgOptions?.map(o => <SelectItem key={o.id} value={o.id}>{o.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact</Label>
                <Select value={form.contact_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, contact_id: v === "__none__" ? "" : v }))} disabled={!form.client_id}>
                  <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {contactOptions?.map(c => <SelectItem key={c.id} value={c.id}>{c.contact_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Deal</Label>
              <Select value={form.deal_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, deal_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {dealOptions?.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
              <Textarea className="rounded-lg bg-secondary border-border" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending} className="w-full rounded-lg bg-foreground text-background font-heading font-semibold">
              {editTask ? "Save changes" : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMTasks;