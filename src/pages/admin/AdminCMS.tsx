
import { useState, useCallback, useRef, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Pencil, Video, Eye, EyeOff, FileVideo, Star, Save, Type, BarChart3 } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Progress } from "@/components/ui/progress";

// ─── Types ───

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

type TextTestimonial = {
  id: string;
  name: string;
  company: string;
  quote: string;
  stars: number;
  sort_order: number;
  is_active: boolean;
};

type HeroContent = {
  badge: string;
  title_line1: string;
  title_line2: string;
  subtitle_line1: string;
  subtitle_line2: string;
  description: string;
  stat1_value: string;
  stat1_label: string;
  stat2_value: string;
  stat2_label: string;
  stat3_value: string;
  stat3_label: string;
};

const EMPTY_VIDEO_FORM = {
  title: "",
  description: "",
  client_name: "",
  video_type: "upload" as string,
  video_url: "",
  is_vertical: false,
  is_active: true,
};

const EMPTY_TEXT_FORM = {
  name: "",
  company: "",
  quote: "",
  stars: 5,
  is_active: true,
};

// ─── Video Upload Component ───

function VideoUploadArea({
  currentUrl,
  onUploaded,
  uploading,
  setUploading,
}: {
  currentUrl: string;
  onUploaded: (url: string) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
}) {
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File troppo grande (max 100MB)");
      return;
    }
    setUploading(true);
    setProgress(0);

    const ext = file.name.split(".").pop() || "mp4";
    const path = `homepage/${Date.now()}.${ext}`;

    // Use XMLHttpRequest for real upload progress
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token || supabaseKey;

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${supabaseUrl}/storage/v1/object/videos/${path}`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("apikey", supabaseKey);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.setRequestHeader("cache-control", "3600");

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 95));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.send(file);
      });

      setProgress(100);
      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(path);
      onUploaded(urlData.publicUrl);
      toast.success("Video caricato!");
    } catch (err: any) {
      toast.error("Upload fallito: " + (err.message || "Errore sconosciuto"));
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) handleFile(file);
    else toast.error("Trascina un file video");
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground block">Video File</label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
      >
        {currentUrl ? (
          <div className="space-y-2">
            <video src={currentUrl} className="w-full max-h-40 rounded-lg object-contain bg-muted mx-auto" preload="auto" autoPlay muted loop playsInline />
            <p className="text-xs text-muted-foreground">Clicca o trascina per sostituire</p>
          </div>
        ) : (
          <div className="space-y-2">
            <FileVideo className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-foreground font-medium">Trascina un video qui</p>
            <p className="text-xs text-muted-foreground">oppure clicca per selezionare · MP4, MOV, WebM · Max 100MB</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/mov,video/webm,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {uploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-center">Caricamento {progress}%...</p>
        </div>
      )}
    </div>
  );
}

// ─── Main CMS Component ───

const AdminCMS = () => {
  const qc = useQueryClient();

  // Video testimonials state
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Testimonial | null>(null);
  const [videoForm, setVideoForm] = useState(EMPTY_VIDEO_FORM);
  const [uploading, setUploading] = useState(false);

  // Text testimonials state
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [editingText, setEditingText] = useState<TextTestimonial | null>(null);
  const [textForm, setTextForm] = useState(EMPTY_TEXT_FORM);

  // ─── Queries ───

  const { data: testimonials = [], isLoading: loadingVideos } = useQuery({
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

  const { data: textTestimonials = [], isLoading: loadingTexts } = useQuery({
    queryKey: ["admin-text-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("text_testimonials")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as TextTestimonial[];
    },
  });

  const { data: heroSettings, isLoading: loadingHero } = useQuery({
    queryKey: ["admin-hero-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_settings")
        .select("*")
        .eq("section", "hero")
        .single();
      if (error) throw error;
      return data.content as unknown as HeroContent;
    },
  });

  const [heroForm, setHeroForm] = useState<HeroContent | null>(null);

  // Initialize hero form when data loads
  useEffect(() => {
    if (heroSettings && !heroForm) {
      setHeroForm(heroSettings);
    }
  }, [heroSettings]);

  // ─── Video Mutations ───

  const saveVideoMutation = useMutation({
    mutationFn: async (values: typeof EMPTY_VIDEO_FORM & { id?: string; sort_order?: number }) => {
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
      toast.success(editingVideo ? "Video aggiornato" : "Video aggiunto");
      closeVideoDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (t: Testimonial) => {
      // Delete from storage if it's an uploaded file
      if (t.video_type === "upload" && t.video_url.includes("/videos/")) {
        const path = t.video_url.split("/videos/").pop();
        if (path) await supabase.storage.from("videos").remove([decodeURIComponent(path)]);
      }
      const { error } = await supabase.from("testimonials").delete().eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["landing-testimonials"] });
      toast.success("Video eliminato");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reorderVideoMutation = useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      await Promise.all(
        items.map(item =>
          supabase.from("testimonials").update({ sort_order: item.sort_order }).eq("id", item.id)
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["landing-testimonials"] });
    },
  });

  // ─── Text Testimonial Mutations ───

  const saveTextMutation = useMutation({
    mutationFn: async (values: typeof EMPTY_TEXT_FORM & { id?: string; sort_order?: number }) => {
      const payload = {
        name: values.name,
        company: values.company,
        quote: values.quote,
        stars: values.stars,
        is_active: values.is_active,
        sort_order: values.sort_order ?? textTestimonials.length,
      };
      if (values.id) {
        const { error } = await supabase.from("text_testimonials").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("text_testimonials").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-text-testimonials"] });
      qc.invalidateQueries({ queryKey: ["landing-text-testimonials"] });
      toast.success(editingText ? "Recensione aggiornata" : "Recensione aggiunta");
      closeTextDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTextMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("text_testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-text-testimonials"] });
      qc.invalidateQueries({ queryKey: ["landing-text-testimonials"] });
      toast.success("Recensione eliminata");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Hero Mutation ───

  const saveHeroMutation = useMutation({
    mutationFn: async (content: HeroContent) => {
      const { error } = await supabase
        .from("homepage_settings")
        .update({ content: content as any, updated_at: new Date().toISOString() })
        .eq("section", "hero");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hero-settings"] });
      qc.invalidateQueries({ queryKey: ["landing-hero-settings"] });
      toast.success("Testi Hero salvati");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Dialog Helpers ───

  const openCreateVideo = () => {
    setEditingVideo(null);
    setVideoForm(EMPTY_VIDEO_FORM);
    setVideoDialogOpen(true);
  };

  const openEditVideo = (t: Testimonial) => {
    setEditingVideo(t);
    setVideoForm({
      title: t.title,
      description: t.description || "",
      client_name: t.client_name || "",
      video_type: t.video_type,
      video_url: t.video_url,
      is_vertical: t.is_vertical,
      is_active: t.is_active,
    });
    setVideoDialogOpen(true);
  };

  const closeVideoDialog = () => {
    setVideoDialogOpen(false);
    setEditingVideo(null);
    setVideoForm(EMPTY_VIDEO_FORM);
  };

  const openCreateText = () => {
    setEditingText(null);
    setTextForm(EMPTY_TEXT_FORM);
    setTextDialogOpen(true);
  };

  const openEditText = (t: TextTestimonial) => {
    setEditingText(t);
    setTextForm({
      name: t.name,
      company: t.company,
      quote: t.quote,
      stars: t.stars,
      is_active: t.is_active,
    });
    setTextDialogOpen(true);
  };

  const closeTextDialog = () => {
    setTextDialogOpen(false);
    setEditingText(null);
    setTextForm(EMPTY_TEXT_FORM);
  };

  const handleSaveVideo = () => {
    if (!videoForm.video_url) {
      toast.error("Video obbligatorio");
      return;
    }
    saveVideoMutation.mutate({ ...videoForm, id: editingVideo?.id, sort_order: editingVideo?.sort_order });
  };

  const handleSaveText = () => {
    if (!textForm.name || !textForm.quote) {
      toast.error("Nome e recensione obbligatori");
      return;
    }
    saveTextMutation.mutate({ ...textForm, id: editingText?.id, sort_order: editingText?.sort_order });
  };

  const handleDragEndVideo = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const items = Array.from(testimonials);
      const [moved] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, moved);
      reorderVideoMutation.mutate(items.map((item, i) => ({ id: item.id, sort_order: i })));
    },
    [testimonials]
  );

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-1">Gestione Homepage</h1>
      <p className="text-sm text-muted-foreground mb-6">Modifica i contenuti della landing page pubblica</p>

      <Tabs defaultValue="videos" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="videos" className="gap-1.5"><Video className="h-3.5 w-3.5" /> Video</TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1.5"><Star className="h-3.5 w-3.5" /> Recensioni</TabsTrigger>
          <TabsTrigger value="hero" className="gap-1.5"><Type className="h-3.5 w-3.5" /> Testi Hero</TabsTrigger>
        </TabsList>

        {/* ═══ TAB: VIDEO TESTIMONIANZE ═══ */}
        <TabsContent value="videos">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Video Testimonianze</h2>
              <p className="text-xs text-muted-foreground">{testimonials.length} video · {testimonials.filter(t => t.is_active).length} attivi</p>
            </div>
            <Button onClick={openCreateVideo} size="sm"><Plus className="h-4 w-4 mr-1" /> Aggiungi Video</Button>
          </div>

          {loadingVideos ? (
            <p className="text-muted-foreground text-sm">Caricamento...</p>
          ) : testimonials.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FileVideo className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nessun video. Clicca "Aggiungi Video" per iniziare.</p>
              </CardContent>
            </Card>
          ) : (
            <DragDropContext onDragEnd={handleDragEndVideo}>
              <Droppable droppableId="videos-list">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                    {testimonials.map((t, index) => (
                      <Draggable key={t.id} draggableId={t.id} index={index}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            className={`rounded-xl border border-border bg-card p-3 flex items-center gap-3 transition-shadow ${snap.isDragging ? "ring-2 ring-primary shadow-xl" : "hover:shadow-sm"}`}
                          >
                            <div {...prov.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
                              <GripVertical className="h-4 w-4" />
                            </div>

                            <div className={`rounded-lg overflow-hidden bg-muted flex-shrink-0 ${t.is_vertical ? "w-10 h-[72px]" : "w-20 h-12"}`}>
                              {t.video_type === "upload" ? (
                                <video src={t.video_url} className="w-full h-full object-cover" preload="auto" autoPlay muted loop playsInline />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Video className="h-4 w-4" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{t.title || "Senza titolo"}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {t.client_name || "—"} · {t.video_type === "upload" ? "Upload" : t.video_type} · {t.is_vertical ? "9:16" : "16:9"}
                              </p>
                            </div>

                            <Badge variant={t.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                              {t.is_active ? "Attivo" : "Off"}
                            </Badge>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditVideo(t)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                                if (confirm("Eliminare questo video?")) deleteVideoMutation.mutate(t);
                              }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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

        {/* ═══ TAB: RECENSIONI TESTUALI ═══ */}
        <TabsContent value="reviews">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Recensioni Testuali</h2>
              <p className="text-xs text-muted-foreground">{textTestimonials.length} recensioni</p>
            </div>
            <Button onClick={openCreateText} size="sm"><Plus className="h-4 w-4 mr-1" /> Aggiungi</Button>
          </div>

          {loadingTexts ? (
            <p className="text-muted-foreground text-sm">Caricamento...</p>
          ) : textTestimonials.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nessuna recensione.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {textTestimonials.map((t) => (
                <Card key={t.id} className={`relative group ${!t.is_active ? "opacity-50" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: t.stars }).map((_, j) => (
                        <Star key={j} size={12} className="fill-warning text-warning" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/80 italic mb-3 line-clamp-3">"{t.quote}"</p>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{t.company}</p>

                    <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditText(t)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                        if (confirm("Eliminare?")) deleteTextMutation.mutate(t.id);
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB: HERO SETTINGS ═══ */}
        <TabsContent value="hero">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Type className="h-5 w-5 text-primary" /> Testi Hero Section
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHero || !heroForm ? (
                <p className="text-muted-foreground text-sm">Caricamento...</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Badge</label>
                      <Input value={heroForm.badge} onChange={(e) => setHeroForm({ ...heroForm, badge: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Titolo — Riga 1</label>
                      <Input value={heroForm.title_line1} onChange={(e) => setHeroForm({ ...heroForm, title_line1: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Titolo — Riga 2 (gradient)</label>
                      <Input value={heroForm.title_line2} onChange={(e) => setHeroForm({ ...heroForm, title_line2: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Sottotitolo — Riga 1</label>
                      <Input value={heroForm.subtitle_line1} onChange={(e) => setHeroForm({ ...heroForm, subtitle_line1: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Sottotitolo — Riga 2</label>
                      <Input value={heroForm.subtitle_line2} onChange={(e) => setHeroForm({ ...heroForm, subtitle_line2: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrizione</label>
                    <Textarea value={heroForm.description} onChange={(e) => setHeroForm({ ...heroForm, description: e.target.value })} rows={2} />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" /> Statistiche
                    </label>
                    <div className="grid gap-3 grid-cols-3">
                      {([1, 2, 3] as const).map((n) => (
                        <div key={n} className="flex gap-2">
                          <Input
                            value={heroForm[`stat${n}_value` as keyof HeroContent]}
                            onChange={(e) => setHeroForm({ ...heroForm, [`stat${n}_value`]: e.target.value })}
                            placeholder="250+"
                            className="w-20"
                          />
                          <Input
                            value={heroForm[`stat${n}_label` as keyof HeroContent]}
                            onChange={(e) => setHeroForm({ ...heroForm, [`stat${n}_label`]: e.target.value })}
                            placeholder="Dealers"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={() => saveHeroMutation.mutate(heroForm)} disabled={saveHeroMutation.isPending} className="gap-1.5">
                    <Save className="h-4 w-4" /> {saveHeroMutation.isPending ? "Salvataggio..." : "Salva Modifiche"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ VIDEO DIALOG ═══ */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVideo ? "Modifica Video" : "Nuovo Video"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Titolo</label>
                <Input value={videoForm.title} onChange={(e) => setVideoForm((f) => ({ ...f, title: e.target.value }))} placeholder="Es. Testimonial Marina" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome Cliente</label>
                <Input value={videoForm.client_name} onChange={(e) => setVideoForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Es. Thomas Berger" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrizione</label>
              <Textarea value={videoForm.description} onChange={(e) => setVideoForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo Video</label>
              <Select value={videoForm.video_type} onValueChange={(v) => setVideoForm((f) => ({ ...f, video_type: v, video_url: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload da Computer</SelectItem>
                  <SelectItem value="youtube">YouTube URL</SelectItem>
                  <SelectItem value="vimeo">Vimeo URL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {videoForm.video_type === "upload" ? (
              <VideoUploadArea
                currentUrl={videoForm.video_url}
                onUploaded={(url) => setVideoForm((f) => ({ ...f, video_url: url }))}
                uploading={uploading}
                setUploading={setUploading}
              />
            ) : (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  URL {videoForm.video_type === "youtube" ? "YouTube" : "Vimeo"}
                </label>
                <Input
                  value={videoForm.video_url}
                  onChange={(e) => setVideoForm((f) => ({ ...f, video_url: e.target.value }))}
                  placeholder={videoForm.video_type === "youtube" ? "https://youtube.com/watch?v=..." : "https://vimeo.com/..."}
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={videoForm.is_vertical} onCheckedChange={(v) => setVideoForm((f) => ({ ...f, is_vertical: v }))} />
                <span className="text-sm text-foreground">Verticale (9:16)</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={videoForm.is_active} onCheckedChange={(v) => setVideoForm((f) => ({ ...f, is_active: v }))} />
                <span className="text-sm text-foreground flex items-center gap-1">
                  {videoForm.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {videoForm.is_active ? "Visibile" : "Nascosto"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeVideoDialog}>Annulla</Button>
            <Button onClick={handleSaveVideo} disabled={saveVideoMutation.isPending || uploading}>
              {saveVideoMutation.isPending ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ TEXT TESTIMONIAL DIALOG ═══ */}
      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingText ? "Modifica Recensione" : "Nuova Recensione"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome</label>
              <Input value={textForm.name} onChange={(e) => setTextForm((f) => ({ ...f, name: e.target.value }))} placeholder="Es. Thomas Berger" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Azienda / Posizione</label>
              <Input value={textForm.company} onChange={(e) => setTextForm((f) => ({ ...f, company: e.target.value }))} placeholder="Es. Segelshop Hamburg, Germany" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Recensione</label>
              <Textarea value={textForm.quote} onChange={(e) => setTextForm((f) => ({ ...f, quote: e.target.value }))} rows={3} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Stelle</label>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setTextForm((f) => ({ ...f, stars: n }))} className="p-0.5">
                      <Star size={16} className={n <= textForm.stars ? "fill-warning text-warning" : "text-muted-foreground"} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={textForm.is_active} onCheckedChange={(v) => setTextForm((f) => ({ ...f, is_active: v }))} />
                <span className="text-xs">{textForm.is_active ? "Visibile" : "Nascosto"}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeTextDialog}>Annulla</Button>
            <Button onClick={handleSaveText} disabled={saveTextMutation.isPending}>
              {saveTextMutation.isPending ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCMS;
