import { useState } from "react";
import { SafeHtml } from "@/components/ui/SafeHtml";
import TiptapEditor from "@/components/crm/TiptapEditor";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Mail, Pencil, Trash2, Eye, MoreVertical, Variable } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CATEGORIES = [
  { value: "general", label: "General", color: "bg-muted text-muted-foreground" },
  { value: "onboarding", label: "Onboarding", color: "bg-primary/15 text-primary" },
  { value: "sales", label: "Sales", color: "bg-green-500/15 text-green-700" },
  { value: "follow_up", label: "Follow-up", color: "bg-blue-500/15 text-blue-700" },
  { value: "payment", label: "Payment", color: "bg-orange-500/15 text-orange-700" },
  { value: "marketing", label: "Marketing", color: "bg-purple-500/15 text-purple-700" },
];

const MERGE_VARS = [
  { key: "{{contact_name}}", label: "Contact name" },
  { key: "{{company}}", label: "Company" },
  { key: "{{last_order}}", label: "Last order" },
  { key: "{{assigned_discount}}", label: "Assigned discount" },
];

const getCategoryBadge = (cat: string) => {
  const c = CATEGORIES.find(x => x.value === cat);
  return c ? <Badge className={`${c.color} border-0 text-[10px]`}>{c.label}</Badge> : <Badge variant="outline">{cat}</Badge>;
};

const stripHtml = (html: string) => html?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() || "";

interface TemplateForm {
  name: string;
  subject: string;
  body: string;
  category: string;
}

const emptyForm: TemplateForm = { name: "", subject: "", body: "", category: "general" };

export default function CRMEmailTemplates() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: TemplateForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from("email_templates").update({
          name: data.name, subject: data.subject, body: data.body, category: data.category, updated_at: new Date().toISOString(),
        }).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert({
          name: data.name, subject: data.subject, body: data.body, category: data.category,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success(editingId ? "Template updated" : "Template created");
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (templates || []).filter(t => {
    if (filterCat !== "all" && t.category !== filterCat) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({ name: t.name, subject: t.subject, body: t.body, category: t.category || "general" });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openPreview = (t: any) => {
    const html = t.body
      .replace(/\{\{contact_name\}\}/g, "John Smith")
      .replace(/\{\{company\}\}/g, "Example Marine Ltd")
      .replace(/\{\{last_order\}\}/g, "ES-0042")
      .replace(/\{\{assigned_discount\}\}/g, "Gold (-15%)");
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const insertVariable = (varKey: string, field: "subject" | "body") => {
    setForm(f => ({ ...f, [field]: f[field] + varKey }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage templates for CRM communications</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} /> New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-48 bg-secondary border-border">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Template list */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Loading...</div>
      ) : !filtered.length ? (
        <div className="py-16 text-center">
          <Mail size={40} className="mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">No templates found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(t => (
            <Card key={t.id} className="hover:border-primary/30 transition-colors cursor-pointer group" onClick={() => openEdit(t)}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Mail size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-foreground">{t.name}</h3>
                    {getCategoryBadge(t.category)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">Subject: {t.subject}</p>
                  <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{stripHtml(t.body).slice(0, 120)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(t.created_at), "dd MMM yyyy")}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreVertical size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); openPreview(t); }}>
                        <Eye size={14} className="mr-2" /> Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); openEdit(t); }}>
                        <Pencil size={14} className="mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); deleteMutation.mutate(t.id); }}>
                        <Trash2 size={14} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingId ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="E.g. Welcome dealer" className="mt-1 bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1"><Variable size={10} /> Variable</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {MERGE_VARS.map(v => <DropdownMenuItem key={v.key} onClick={() => insertVariable(v.key, "subject")}>{v.label} <span className="ml-auto text-muted-foreground text-[10px]">{v.key}</span></DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Email subject..." className="mt-1 bg-secondary border-border" />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Body (HTML)</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1"><Variable size={10} /> Variable</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {MERGE_VARS.map(v => <DropdownMenuItem key={v.key} onClick={() => insertVariable(v.key, "body")}>{v.label} <span className="ml-auto text-muted-foreground text-[10px]">{v.key}</span></DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-1">
                <TiptapEditor content={form.body} onChange={html => setForm(f => ({ ...f, body: html }))} placeholder="Write the template body..." />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })} disabled={!form.name.trim() || !form.subject.trim() || !form.body.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingId ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Template Preview</DialogTitle>
          </DialogHeader>
          <SafeHtml html={previewHtml} className="border rounded-lg p-6 bg-white" />
        </DialogContent>
      </Dialog>
    </div>
  );
}