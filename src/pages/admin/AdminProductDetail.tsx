import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Plus, Trash2, ExternalLink, FileDown, Package, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const AdminProductDetail = () => {
  const { family } = useParams<{ family: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: detail, isLoading } = useQuery({
    queryKey: ["product-detail", family],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_details")
        .select("*")
        .eq("product_family", family!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!family,
  });

  // Get all product variants that belong to this family
  const { data: variants } = useQuery({
    queryKey: ["product-variants", family],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      // Filter by family matching logic
      return (data || []).filter(p => getProductFamily(p.name) === family);
    },
    enabled: !!family,
  });

  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [specs, setSpecs] = useState<[string, string][]>([]);
  const [techSheetUrl, setTechSheetUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [editingStock, setEditingStock] = useState<Record<string, number>>({});
  const [syncingVariant, setSyncingVariant] = useState<string | null>(null);

  useEffect(() => {
    if (detail) {
      setDisplayName(detail.display_name || "");
      setDescription(detail.description || "");
      setFeatures((detail.features as string[]) || []);
      const specObj = (detail.specifications as Record<string, string>) || {};
      setSpecs(Object.entries(specObj));
      setTechSheetUrl(detail.technical_sheet_url || "");
      setWebsiteUrl(detail.website_url || "");
      setGalleryImages((detail.gallery_images as string[]) || []);
      setLeadTime((detail as any).lead_time || "");
    }
  }, [detail]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const specObj: Record<string, string> = {};
      specs.forEach(([k, v]) => { if (k.trim()) specObj[k.trim()] = v; });

      const { error } = await supabase
        .from("product_details")
        .update({
          display_name: displayName,
          description,
          features: features.filter(f => f.trim()),
          specifications: specObj,
          technical_sheet_url: techSheetUrl || null,
          website_url: websiteUrl || null,
          gallery_images: galleryImages.filter(g => g.trim()),
          lead_time: leadTime || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", detail!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-detail", family] });
      queryClient.invalidateQueries({ queryKey: ["product-details"] });
      toast.success("Product details saved successfully");
    },
    onError: (err: any) => toast.error("Error: " + err.message),
  });

  if (isLoading) return <p className="text-muted-foreground p-4">Loading...</p>;
  if (!detail) return (
    <div className="text-center py-20">
      <Package className="mx-auto text-muted-foreground mb-4" size={48} />
      <p className="text-muted-foreground">Product family not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/products")}>
        <ArrowLeft size={16} className="mr-1" /> Back to Products
      </Button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/products")}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground font-mono">{family}</p>
          </div>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-foreground text-background hover:bg-foreground/90 gap-2 font-heading font-semibold"
        >
          <Save size={16} /> {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-2">
          <div className="glass-card-solid overflow-hidden">
            <div className="relative aspect-square bg-secondary">
              {galleryImages.length > 0 ? (
                <>
                  <img
                    src={galleryImages[currentImageIndex]}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex(i => (i - 1 + galleryImages.length) % galleryImages.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex(i => (i + 1) % galleryImages.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                  <Badge className="absolute top-2 right-2 bg-background/80 text-foreground border-0 text-[10px]">
                    {currentImageIndex + 1}/{galleryImages.length}
                  </Badge>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="text-muted-foreground" size={64} />
                </div>
              )}
            </div>
            {/* Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="flex gap-1 p-2 overflow-x-auto">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-14 h-14 rounded overflow-hidden shrink-0 border-2 transition-colors ${
                      idx === currentImageIndex ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Variants with stock management */}
          {variants && variants.length > 0 && (
            <div className="glass-card-solid p-4 mt-4">
              <h3 className="font-heading text-sm font-semibold mb-3">Linked Variants ({variants.length})</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {variants.map(v => {
                  const isEditing = editingStock[v.id] !== undefined;
                  return (
                    <div key={v.id} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/50 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{v.name}</p>
                        <p className="font-mono text-muted-foreground">SKU: {v.sku || "—"}</p>
                        {(v as any).barcode && <p className="font-mono text-muted-foreground">EAN: {(v as any).barcode}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="font-mono">€{Number(v.price || 0).toFixed(2)}</p>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              value={editingStock[v.id]}
                              onChange={e => setEditingStock(prev => ({ ...prev, [v.id]: parseInt(e.target.value) || 0 }))}
                              className="w-16 h-7 text-xs bg-background border-border"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-success"
                              onClick={async () => {
                                const { error } = await supabase.from("products").update({ stock_quantity: editingStock[v.id] }).eq("id", v.id);
                                if (error) { toast.error(error.message); return; }
                                queryClient.invalidateQueries({ queryKey: ["product-variants", family] });
                                setEditingStock(prev => { const n = { ...prev }; delete n[v.id]; return n; });
                                toast.success("Stock aggiornato");
                              }}
                            >
                              <Save size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-1 text-xs text-muted-foreground"
                              onClick={() => setEditingStock(prev => { const n = { ...prev }; delete n[v.id]; return n; })}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingStock(prev => ({ ...prev, [v.id]: v.stock_quantity ?? 0 }))}
                            className={`font-semibold cursor-pointer hover:underline ${(v.stock_quantity ?? 0) > 0 ? "text-success" : "text-destructive"}`}
                          >
                            {v.stock_quantity ?? 0} stock
                          </button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-1.5 text-xs text-muted-foreground hover:text-primary"
                          disabled={syncingVariant === v.id}
                          title="Resync stock from Shopify"
                          onClick={async () => {
                            if (!v.shopify_id) { toast.error("No Shopify ID linked"); return; }
                            setSyncingVariant(v.id);
                            try {
                              const { data, error } = await supabase.functions.invoke("shopify-sync");
                              if (error) throw error;
                              const match = (data.products || []).find((sp: any) => String(sp.shopify_variant_id) === String(v.shopify_id));
                              if (match) {
                                await supabase.from("products").update({ stock_quantity: match.inventory_quantity, barcode: match.barcode || null } as any).eq("id", v.id);
                                queryClient.invalidateQueries({ queryKey: ["product-variants", family] });
                                toast.success(`Stock resincronizzato: ${match.inventory_quantity}`);
                              } else {
                                toast.error("Variante non trovata su Shopify");
                              }
                            } catch (err: any) {
                              toast.error("Errore sync: " + err.message);
                            } finally {
                              setSyncingVariant(null);
                            }
                          }}
                        >
                          <RefreshCw size={12} className={syncingVariant === v.id ? "animate-spin" : ""} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="glass-card-solid p-4 mt-4 space-y-2">
            <h3 className="font-heading text-sm font-semibold mb-2">Quick Links</h3>
            {techSheetUrl && (
              <a href={techSheetUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-primary hover:underline">
                <FileDown size={14} /> Technical Sheet PDF
              </a>
            )}
            {websiteUrl && (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-primary hover:underline">
                <ExternalLink size={14} /> View on easysea.org
              </a>
            )}
          </div>
        </div>

        {/* Right: Editable Fields */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
              <TabsTrigger value="features" className="text-xs">Features</TabsTrigger>
              <TabsTrigger value="specs" className="text-xs">Specifications</TabsTrigger>
              <TabsTrigger value="media" className="text-xs">Media & Links</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4">
              <div className="glass-card-solid p-4 space-y-4">
                <div>
                  <label className="text-xs font-heading font-semibold text-foreground mb-1.5 block">Display Name</label>
                  <Input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-xs font-heading font-semibold text-foreground mb-1.5 block">Description</label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={8}
                    className="bg-secondary border-border resize-y"
                    placeholder="Full product description visible to dealers..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">{description.length} characters</p>
                </div>
                <div>
                  <label className="text-xs font-heading font-semibold text-foreground mb-1.5 block">
                    Lead Time (estimated restock)
                  </label>
                  <Input
                    value={leadTime}
                    onChange={e => setLeadTime(e.target.value)}
                    className="bg-secondary border-border"
                    placeholder="e.g. 2-3 weeks, Mid April 2026, 15 days..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Shown to dealers when product is out of stock
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="space-y-4">
              <div className="glass-card-solid p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-heading font-semibold text-foreground">Key Features</label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => setFeatures([...features, ""])}
                  >
                    <Plus size={12} /> Add Feature
                  </Button>
                </div>
                <div className="space-y-2">
                  {features.map((f, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-primary text-xs mt-2.5 shrink-0">✓</span>
                      <Input
                        value={f}
                        onChange={e => {
                          const updated = [...features];
                          updated[i] = e.target.value;
                          setFeatures(updated);
                        }}
                        className="bg-secondary border-border text-sm"
                        placeholder="Feature description..."
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive shrink-0"
                        onClick={() => setFeatures(features.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  {features.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-4 text-center">
                      No features added yet. Click "Add Feature" to start.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Specifications Tab */}
            <TabsContent value="specs" className="space-y-4">
              <div className="glass-card-solid p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-heading font-semibold text-foreground">Technical Specifications</label>
                </div>
                <div className="space-y-2">
                  {specs.map(([key, value], i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={key}
                        onChange={e => {
                          const updated = [...specs];
                          updated[i] = [e.target.value, value];
                          setSpecs(updated);
                        }}
                        className="bg-secondary border-border text-sm w-2/5"
                        placeholder="Spec name..."
                      />
                      <Input
                        value={value}
                        onChange={e => {
                          const updated = [...specs];
                          updated[i] = [key, e.target.value];
                          setSpecs(updated);
                        }}
                        className="bg-secondary border-border text-sm flex-1"
                        placeholder="Value..."
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive shrink-0"
                        onClick={() => setSpecs(specs.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
                {/* Add new spec */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Input
                    value={newSpecKey}
                    onChange={e => setNewSpecKey(e.target.value)}
                    className="bg-secondary border-border text-sm w-2/5"
                    placeholder="New spec name..."
                  />
                  <Input
                    value={newSpecValue}
                    onChange={e => setNewSpecValue(e.target.value)}
                    className="bg-secondary border-border text-sm flex-1"
                    placeholder="Value..."
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1 shrink-0"
                    disabled={!newSpecKey.trim()}
                    onClick={() => {
                      setSpecs([...specs, [newSpecKey.trim(), newSpecValue]]);
                      setNewSpecKey("");
                      setNewSpecValue("");
                    }}
                  >
                    <Plus size={12} /> Add
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Media & Links Tab */}
            <TabsContent value="media" className="space-y-4">
              <div className="glass-card-solid p-4 space-y-4">
                <div>
                  <label className="text-xs font-heading font-semibold text-foreground mb-1.5 block">Technical Sheet URL (PDF)</label>
                  <Input
                    value={techSheetUrl}
                    onChange={e => setTechSheetUrl(e.target.value)}
                    className="bg-secondary border-border"
                    placeholder="https://cdn.shopify.com/..."
                  />
                </div>
                <div>
                  <label className="text-xs font-heading font-semibold text-foreground mb-1.5 block">Website URL</label>
                  <Input
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    className="bg-secondary border-border"
                    placeholder="https://easysea.org/products/..."
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-heading font-semibold text-foreground">Gallery Images</label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => setGalleryImages([...galleryImages, ""])}
                    >
                      <Plus size={12} /> Add Image URL
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {galleryImages.map((url, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        {url && (
                          <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-secondary">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <Input
                          value={url}
                          onChange={e => {
                            const updated = [...galleryImages];
                            updated[i] = e.target.value;
                            setGalleryImages(updated);
                          }}
                          className="bg-secondary border-border text-xs flex-1"
                          placeholder="Image URL..."
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive shrink-0"
                          onClick={() => setGalleryImages(galleryImages.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// Same mapping function as in DealerCatalog
const getProductFamily = (name: string): string | null => {
  const n = name.toLowerCase();
  if (n.includes("kit easybarber")) return "kit-easybarber";
  if (n.includes("kit easyfurling")) return "kit-easyfurling";
  if (n.includes("kit easypreventer")) return "kit-easypreventer";
  if (n.includes("rope deflector")) return "rope-deflector";
  if (n.includes("way2") || n.includes("gangway")) return "way2";
  if (n.includes("spira") || n.includes("guardrail cover")) return "spira";
  if (n.includes("winch cover")) return "winch-cover";
  if (n.includes("flipper") && n.includes("carbon")) return "flipper-carbon";
  if (n.includes("flipper") && n.includes("max")) return "flipper-max";
  if (n.includes("flipper")) return "flipper";
  if (n.includes("snatch") || (n.includes("olli") && n.includes("block"))) return "olli-block";
  if (n.includes("solid ring")) return "olli-solid-ring";
  if (n.includes("low friction ring") || (n.includes("olli") && n.includes("ring"))) return "olli-ring";
  if (n.includes("sheathed loop")) return "sheathed-loop";
  if (n.includes("soft shackle")) return "soft-shackle";
  if (n.includes("covered loop")) return "covered-loop";
  if (n.includes("dyneema sheet") && n.includes("eye")) return "dyneema-sheet-eye";
  if (n.includes("dyneema sheet")) return "dyneema-sheet";
  if (n.includes("polyester sheet") && n.includes("eye")) return "polyester-sheet-eye";
  if (n.includes("polyester sheet") && n.includes("olli")) return "polyester-sheet-eye";
  if (n.includes("polyester sheet")) return "polyester-sheet";
  if (n.includes("boat hook head") || n.includes("brush head") || n.includes("line-passing") || n.includes("linemaster") || n.includes("short pole") || n.includes("quick-release") || n.includes("fidlock")) return "jake-head";
  if (n.includes("jake")) return "jake";
  return null;
};

export default AdminProductDetail;
