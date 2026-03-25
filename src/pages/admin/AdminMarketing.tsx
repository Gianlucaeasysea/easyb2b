import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, FileText, Download, Image, Video, FolderOpen, Globe } from "lucide-react";
import { toast } from "sonner";

const categories = [
  { value: "product-images", label: "Product Images", icon: Image },
  { value: "brochures", label: "Brochures & Catalogs", icon: FileText },
  { value: "pos", label: "Point of Sale", icon: FolderOpen },
  { value: "digital", label: "Digital & Social Media", icon: Globe },
  { value: "videos", label: "Videos", icon: Video },
  { value: "contracts", label: "Contracts & Docs", icon: FileText },
  { value: "price-lists", label: "Price Lists", icon: FileText },
  { value: "general", label: "General", icon: FileText },
];

const AdminMarketing = () => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [uploading, setUploading] = useState(false);

  const { data: materials } = useQuery({
    queryKey: ["admin-marketing-materials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketing_materials")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: any) => {
      await supabase.storage.from("marketing-materials").remove([item.file_path]);
      const { error } = await supabase.from("marketing_materials").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-materials"] });
      toast.success("File eliminato");
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title.trim()) {
      toast.error("Inserisci un titolo per il file");
      return;
    }

    setUploading(true);
    try {
      const filePath = `${category}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("marketing-materials")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const { error: dbError } = await supabase.from("marketing_materials").insert({
        title: title.trim(),
        category,
        file_name: file.name,
        file_path: filePath,
        file_size: `${sizeMB} MB`,
      });
      if (dbError) throw dbError;

      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-materials"] });
      toast.success("File caricato con successo");
    } catch (err: any) {
      toast.error("Upload fallito: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const grouped = categories.map((cat) => ({
    ...cat,
    items: (materials || []).filter((m: any) => m.category === cat.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Marketing Materials</h1>
        <p className="text-sm text-muted-foreground">Carica e gestisci i materiali scaricabili dai dealer</p>
      </div>

      {/* Upload Form */}
      <div className="glass-card-solid p-5 mb-8">
        <h2 className="font-heading font-bold text-foreground text-sm mb-4">Carica nuovo file</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Titolo</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Catalogo Prodotti 2026"
              className="bg-secondary border-border"
            />
          </div>
          <div className="w-48">
            <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">&nbsp;</label>
            <Button
              disabled={uploading || !title.trim()}
              className="bg-foreground text-background hover:bg-foreground/90 gap-1.5 font-heading font-semibold relative"
              asChild
            >
              <label className="cursor-pointer">
                <Upload size={14} />
                {uploading ? "Uploading..." : "Upload File"}
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </Button>
          </div>
        </div>
      </div>

      {/* Materials List */}
      {!materials?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Upload className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">Nessun materiale caricato. Usa il form sopra per aggiungere file.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.value} className="glass-card-solid overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Icon size={18} className="text-primary" />
                  <h2 className="font-heading font-bold text-foreground text-sm">{group.label}</h2>
                  <Badge variant="outline" className="text-[10px]">{group.items.length} files</Badge>
                </div>
                <div className="divide-y divide-border">
                  {group.items.map((item: any) => {
                    const publicUrl = supabase.storage.from("marketing-materials").getPublicUrl(item.file_path).data.publicUrl;
                    return (
                      <div key={item.id} className="px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText size={14} className="text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-sm text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.file_name} · {item.file_size}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1">
                              <Download size={12} /> Download
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive gap-1"
                            onClick={() => deleteMutation.mutate(item)}
                          >
                            <Trash2 size={12} /> Elimina
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminMarketing;
