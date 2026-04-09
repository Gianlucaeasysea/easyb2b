import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, FileText, Download, Image, Video, FolderOpen, Globe, Pencil, Check, X, ChevronDown, ChevronRight, Package, Palette, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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

const extractSku = (item: any): string => {
  const titleMatch = item.title?.match(/^([A-Z0-9]+-[A-Z0-9-]+)\s*[-–]/);
  if (titleMatch) return titleMatch[1];
  const pathMatch = item.file_path?.match(/product-images\/([^/]+)\//);
  if (pathMatch) return pathMatch[1];
  return "OTHER";
};

const skuDisplayNames: Record<string, string> = {
  "LOGO-EASYSEA": "Logo Easysea",
  "JAK-101": "JAK-101 · Jake™ Full Kit",
  "JAK-102": "JAK-102 · Jake™ Basic Kit",
  "JAK-103": "JAK-103 · Jake™ Mid Kit",
  "JQK-101": "JQK-101 · Quick Release Jake",
  "JBR-101": "JBR-101 · Brush Head",
  "JQH-101": "JQH-101 · Quick Hook",
  "JLH-101": "JLH-101 · Line-Passing Head",
  "JBH-101": "JBH-101 · Boat Hook Head",
  "JSP-101": "JSP-101 · Spare Parts",
  "JTP-101": "JTP-101 · Telescopic Pole",
  "DOB-101-102-103": "DOB · Double Olli Anti-Shock Snatch Block",
  "ROD-101": "ROD-101 · Rope Deflector",
  "SP-101": "SP-101 · Spira Guardrail Cover",
  "W2PD19-101": "W2PD19-101 · Electric Pump Way2",
};

const AdminMarketing = () => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [search, setSearch] = useState("");
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"product" | "category">("product");

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, category }: { id: string; title: string; category: string }) => {
      const { error } = await supabase
        .from("marketing_materials")
        .update({ title, category })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-materials"] });
      setEditingId(null);
      toast.success("Materiale aggiornato");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("marketing_materials").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-materials"] });
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
      const { error: uploadError } = await supabase.storage.from("marketing-materials").upload(filePath, file);
      if (uploadError) throw uploadError;
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const { error: dbError } = await supabase.from("marketing_materials").insert({
        title: title.trim(), category, file_name: file.name, file_path: filePath, file_size: `${sizeMB} MB`,
      });
      if (dbError) throw dbError;
      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-materials"] });
      toast.success("File uploaded successfully");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditCategory(item.category);
  };

  const saveEdit = () => {
    if (!editingId || !editTitle.trim()) return;
    updateMutation.mutate({ id: editingId, title: editTitle.trim(), category: editCategory });
  };

  const toggleSku = (sku: string) => {
    setExpandedSkus(prev => {
      const next = new Set(prev);
      next.has(sku) ? next.delete(sku) : next.add(sku);
      return next;
    });
  };

  const filtered = (materials || []).filter((m: any) =>
    !search || m.title?.toLowerCase().includes(search.toLowerCase()) || m.file_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Product view: group by SKU
  const bySkuMap = filtered.reduce<Record<string, any[]>>((acc, m: any) => {
    const sku = extractSku(m);
    if (!acc[sku]) acc[sku] = [];
    acc[sku].push(m);
    return acc;
  }, {});

  const skuKeys = Object.keys(bySkuMap).sort((a, b) => {
    if (a.includes("LOGO")) return -1;
    if (b.includes("LOGO")) return 1;
    return a.localeCompare(b);
  });

  // Category view
  const grouped = categories.map(cat => ({
    ...cat,
    items: filtered.filter((m: any) => m.category === cat.value),
  })).filter(g => g.items.length > 0);

  const renderItem = (item: any) => {
    const publicUrl = supabase.storage.from("marketing-materials").getPublicUrl(item.file_path).data.publicUrl;
    const isEditing = editingId === item.id;
    const isImage = item.file_name?.match(/\.(png|jpg|jpeg|webp)$/i);

    return (
      <div key={item.id} className="px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isImage && !isEditing ? (
            <div className="w-10 h-10 rounded-md overflow-hidden bg-secondary flex-shrink-0">
              <img src={publicUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ) : (
            <FileText size={14} className="text-muted-foreground flex-shrink-0" />
          )}
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-8 text-sm bg-secondary border-border" />
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="h-8 w-40 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="min-w-0">
              <p className="text-sm text-foreground truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.file_name} · {item.file_size}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <div className="flex items-center gap-1.5 mr-2" title={item.is_active !== false ? "Visibile ai dealer" : "Nascosto ai dealer"}>
            <Switch
              checked={item.is_active !== false}
              onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: item.id, is_active: checked })}
              className="scale-75"
            />
            {item.is_active !== false ? <Eye size={12} className="text-success" /> : <EyeOff size={12} className="text-muted-foreground" />}
          </div>
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary gap-1" onClick={saveEdit} disabled={updateMutation.isPending}>
                <Check size={12} /> Salva
              </Button>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1" onClick={() => setEditingId(null)}>
                <X size={12} />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1" onClick={() => startEdit(item)}>
                <Pencil size={12} />
              </Button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1">
                  <Download size={12} />
                </Button>
              </a>
              <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive gap-1" onClick={() => deleteMutation.mutate(item)}>
                <Trash2 size={12} />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Marketing Materials</h1>
        <p className="text-sm text-muted-foreground">Carica e gestisci i materiali scaricabili dai dealer</p>
      </div>

      {/* Upload Form */}
      <div className="glass-card-solid p-5 mb-6">
        <h2 className="font-heading font-bold text-foreground text-sm mb-4">Carica nuovo file</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Titolo</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. JAK-101 - Catalogo 2026" className="bg-secondary border-border" />
          </div>
          <div className="w-48">
            <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">&nbsp;</label>
            <Button disabled={uploading || !title.trim()} className="bg-foreground text-background hover:bg-foreground/90 gap-1.5 font-heading font-semibold relative" asChild>
              <label className="cursor-pointer">
                <Upload size={14} />
                {uploading ? "Uploading..." : "Upload File"}
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <Input placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)} className="bg-secondary border-border max-w-xs" />
        <div className="flex gap-1 ml-auto">
          <Button variant={viewMode === "product" ? "default" : "outline"} size="sm" onClick={() => setViewMode("product")} className="text-xs gap-1">
            <Package size={12} /> Per Prodotto
          </Button>
          <Button variant={viewMode === "category" ? "default" : "outline"} size="sm" onClick={() => setViewMode("category")} className="text-xs gap-1">
            <FolderOpen size={12} /> Per Categoria
          </Button>
        </div>
      </div>

      {!filtered.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Upload className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">Nessun materiale caricato. Usa il form sopra per aggiungere file.</p>
        </div>
      ) : viewMode === "product" ? (
        <div className="space-y-3">
          {skuKeys.map(sku => {
            const items = bySkuMap[sku];
            const isExpanded = expandedSkus.has(sku);
            const displayName = skuDisplayNames[sku] || sku;
            const isLogo = sku.includes("LOGO");

            return (
              <div key={sku} className="glass-card-solid overflow-hidden">
                <button
                  onClick={() => toggleSku(sku)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left"
                >
                  {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                  {isLogo ? <Palette size={18} className="text-primary" /> : <Package size={18} className="text-primary" />}
                  <span className="font-heading font-bold text-foreground text-sm flex-1">{displayName}</span>
                  <Badge variant="outline" className="text-[10px]">{items.length} files</Badge>
                </button>
                {isExpanded && (
                  <div className="divide-y divide-border border-t border-border">
                    {items.map(renderItem)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => {
            const Icon = group.icon;
            return (
              <div key={group.value} className="glass-card-solid overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Icon size={18} className="text-primary" />
                  <h2 className="font-heading font-bold text-foreground text-sm">{group.label}</h2>
                  <Badge variant="outline" className="text-[10px]">{group.items.length} files</Badge>
                </div>
                <div className="divide-y divide-border">
                  {group.items.map(renderItem)}
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
