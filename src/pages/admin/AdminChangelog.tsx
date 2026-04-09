import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Plus, Pencil, Trash2, CheckCircle, AlertTriangle, Info, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";


const categories = [
  { value: "ui", label: "UI / Design" },
  { value: "feature", label: "Nuova Funzionalità" },
  { value: "bugfix", label: "Bug Fix" },
  { value: "backend", label: "Backend / DB" },
  { value: "integration", label: "Integrazione" },
  { value: "security", label: "Sicurezza" },
  { value: "performance", label: "Performance" },
  { value: "general", label: "Generale" },
];

const levels = [
  { value: "minor", label: "Minor", color: "bg-muted text-muted-foreground" },
  { value: "major", label: "Major", color: "bg-primary/10 text-primary" },
  { value: "critical", label: "Critical", color: "bg-destructive/10 text-destructive" },
  { value: "hotfix", label: "Hotfix", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
];

const statuses = [
  { value: "completed", label: "Completato", icon: CheckCircle, color: "text-green-600" },
  { value: "in_progress", label: "In Corso", icon: Zap, color: "text-primary" },
  { value: "issue", label: "Problema", icon: AlertTriangle, color: "text-destructive" },
  { value: "planned", label: "Pianificato", icon: Info, color: "text-muted-foreground" },
];

type ChangelogEntry = {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  category: string;
  level: string;
  status: string;
  created_by: string | null;
};

const emptyForm = { title: "", description: "", category: "general", level: "minor", status: "completed" };

const AdminChangelog = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["admin-changelog", filterCategory, filterLevel],
    queryFn: async () => {
      let q = supabase.from("platform_changelog").select("*").order("created_at", { ascending: false });
      if (filterCategory !== "all") q = q.eq("category", filterCategory);
      if (filterLevel !== "all") q = q.eq("level", filterLevel);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ChangelogEntry[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Titolo richiesto");
      if (editingId) {
        const { error } = await supabase.from("platform_changelog").update({
          title: form.title, description: form.description || null,
          category: form.category, level: form.level, status: form.status,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("platform_changelog").insert({
          title: form.title, description: form.description || null,
          category: form.category, level: form.level, status: form.status,
          created_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Modifica aggiornata" : "Modifica registrata");
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["admin-changelog"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_changelog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Voce eliminata");
      qc.invalidateQueries({ queryKey: ["admin-changelog"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (entry: ChangelogEntry) => {
    setForm({ title: entry.title, description: entry.description || "", category: entry.category, level: entry.level, status: entry.status });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const getLevelBadge = (level: string) => {
    const l = levels.find(x => x.value === level);
    return <Badge variant="outline" className={`text-[10px] ${l?.color || ""}`}>{l?.label || level}</Badge>;
  };

  const getStatusInfo = (status: string) => {
    const s = statuses.find(x => x.value === status);
    if (!s) return <span className="text-xs">{status}</span>;
    const Icon = s.icon;
    return <span className={`inline-flex items-center gap-1 text-xs ${s.color}`}><Icon size={13} />{s.label}</span>;
  };

  const getCategoryLabel = (cat: string) => categories.find(x => x.value === cat)?.label || cat;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList size={24} className="text-primary" /> Changelog Piattaforma
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Registro di tutte le modifiche, upgrade e fix della piattaforma</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="gap-1">
          <Plus size={16} /> Nuova Voce
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le categorie</SelectItem>
            {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Livello" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i livelli</SelectItem>
            {levels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass-card-solid overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-muted-foreground p-6">Caricamento...</p>
        ) : !entries?.length ? (
          <p className="text-sm text-muted-foreground p-6">Nessuna modifica registrata.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">Data</TableHead>
                  <TableHead>Modifica</TableHead>
                  <TableHead className="w-[140px]">Categoria</TableHead>
                  <TableHead className="w-[100px]">Livello</TableHead>
                  <TableHead className="w-[120px]">Stato</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.created_at), "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{entry.title}</p>
                      {entry.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.description}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{getCategoryLabel(entry.category)}</Badge>
                    </TableCell>
                    <TableCell>{getLevelBadge(entry.level)}</TableCell>
                    <TableCell>{getStatusInfo(entry.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(entry)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(entry.id)}><Trash2 size={14} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Modifica Voce" : "Nuova Modifica"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Titolo modifica *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Descrizione (opzionale)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            <div className="grid grid-cols-3 gap-3">
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {levels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Annulla</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.title.trim() || saveMutation.isPending}>
              {editingId ? "Aggiorna" : "Registra"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminChangelog;
