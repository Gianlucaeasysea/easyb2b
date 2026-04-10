import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, GripVertical, Pencil, Video, Eye, EyeOff, Upload } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

type Testimonial = {
  id: string;
  title: string;
  description: string | null;
  client_name: string | null;
  video_type: string;
  video_url: string;
  is_vertical: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

const EMPTY_FORM = {
  title: "",
  description: "",
  client_name: "",
  video_type: "upload" as string,
  video_url: "",
  is_vertical: false,
  is_active: true,
};

const AdminCMS = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string; sort_order?: number }) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        client_name: values.client_name || null,
        video_type: values.video_type,
        video_url: values.video_url,
        is_vertical: values.is_vertical,
        is_active: values.is_active,
        sort_order: values.sort_order ?? testimonials.length,
      };
      if (values.id) {
        const { error } = await supabase.from("testimonials").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["landing-testimonials"] });
      toast.success(editing ? "Testimonial aggiornato" : "Testimonial aggiunto");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["landing-testimonials"] });
      toast.success("Testimonial eliminato");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      for (const item of items) {
        await supabase.from("testimonials").update({ sort_order: item.sort_order }).eq("id", item.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["landing-testimonials"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description || "",
      client_name: t.client_name || "",
      video_type: t.video_type,
      video_url: t.video_url,
      is_vertical: t.is_vertical,
      is_active: t.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.video_url) {
      toast.error("Video URL obbligatorio");
      return;
    }
    saveMutation.mutate({ ...form, id: editing?.id, sort_order: editing?.sort_order });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `testimonials/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("videos").upload(path, file);
    if (error) {
      toast.error("Upload fallito: " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("videos").getPublicUrl(path);
    setForm((f) => ({ ...f, video_url: urlData.publicUrl, video_type: "upload" }));
    setUploading(false);
    toast.success("Video caricato");
  };

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const items = Array.from(testimonials);
      const [moved] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, moved);
      const updates = items.map((item, i) => ({ id: item.id, sort_order: i }));
      reorderMutation.mutate(updates);
    },
    [testimonials]
  );

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Content Management</h1>
      <p className="text-sm text-muted-foreground mb-8">Gestisci i contenuti delle pagine pubbliche</p>

      <Tabs defaultValue="testimonials">
        <TabsList>
          <TabsTrigger value="testimonials">Video Testimonianze</TabsTrigger>
        </TabsList>

        <TabsContent value="testimonials" className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-lg font-semibold text-foreground">Video Testimonianze</h2>
            <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Aggiungi</Button>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground text-sm">Caricamento...</p>
          ) : testimonials.length === 0 ? (
            <div className="glass-card-solid p-12 text-center">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nessun video testimonial. Clicca "Aggiungi" per iniziare.</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="testimonials-list">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                    {testimonials.map((t, index) => (
                      <Draggable key={t.id} draggableId={t.id} index={index}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            className={`glass-card-solid p-4 flex items-center gap-4 ${snap.isDragging ? "ring-2 ring-primary" : ""}`}
                          >
                            <div {...prov.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
                              <GripVertical className="h-5 w-5" />
                            </div>

                            {/* Thumbnail */}
                            <div className={`rounded-lg overflow-hidden bg-muted flex-shrink-0 ${t.is_vertical ? "w-14 h-24" : "w-24 h-14"}`}>
                              {t.video_type === "upload" ? (
                                <video src={t.video_url} className="w-full h-full object-cover" preload="metadata" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Video className="h-5 w-5" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{t.title || "Senza titolo"}</p>
                              <p className="text-xs text-muted-foreground">{t.client_name || "—"} · {t.video_type} · {t.is_vertical ? "Verticale" : "Orizzontale"}</p>
                            </div>

                            <Badge variant={t.is_active ? "default" : "secondary"} className="text-[10px]">
                              {t.is_active ? "Attivo" : "Nascosto"}
                            </Badge>

                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                                if (confirm("Eliminare questo testimonial?")) deleteMutation.mutate(t.id);
                              }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Testimonial" : "Nuovo Testimonial"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Titolo</label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Es. Testimonial Marina Bay" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome Cliente</label>
              <Input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Es. Thomas Berger" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrizione</label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo Video</label>
              <Select value={form.video_type} onValueChange={(v) => setForm((f) => ({ ...f, video_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload MP4</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="vimeo">Vimeo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.video_type === "upload" ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Video File</label>
                <div className="flex items-center gap-2">
                  <Input value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} placeholder="URL del video o carica un file" className="flex-1" />
                  <Button variant="outline" size="sm" className="relative" disabled={uploading}>
                    <Upload className="h-4 w-4 mr-1" /> {uploading ? "..." : "Carica"}
                    <input type="file" accept="video/mp4,video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">URL Video ({form.video_type === "youtube" ? "YouTube" : "Vimeo"})</label>
                <Input value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} placeholder={form.video_type === "youtube" ? "https://youtube.com/watch?v=..." : "https://vimeo.com/..."} />
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_vertical} onCheckedChange={(v) => setForm((f) => ({ ...f, is_vertical: v }))} />
                <span className="text-sm text-foreground">Video verticale (9:16)</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                <span className="text-sm text-foreground flex items-center gap-1">
                  {form.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {form.is_active ? "Visibile" : "Nascosto"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annulla</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Salvataggio..." : "Salva"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCMS;
