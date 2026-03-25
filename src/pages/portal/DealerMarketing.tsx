import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Image, ChevronDown, ChevronRight, ExternalLink, Package, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/** Extract SKU prefix from title like "JAK-101 - filename.png" or from file_path like "product-images/JAK-101/file.png" */
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

const DealerMarketing = () => {
  const [search, setSearch] = useState("");
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());

  const { data: materials } = useQuery({
    queryKey: ["dealer-marketing-materials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketing_materials")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const toggleSku = (sku: string) => {
    setExpandedSkus(prev => {
      const next = new Set(prev);
      next.has(sku) ? next.delete(sku) : next.add(sku);
      return next;
    });
  };

  // Filter by search
  const filtered = (materials || []).filter((m: any) =>
    !search || m.title?.toLowerCase().includes(search.toLowerCase()) || m.file_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by SKU
  const bySkuMap = filtered.reduce<Record<string, any[]>>((acc, m: any) => {
    const sku = extractSku(m);
    if (!acc[sku]) acc[sku] = [];
    acc[sku].push(m);
    return acc;
  }, {});

  // Sort SKUs: LOGO first, then alphabetically
  const skuKeys = Object.keys(bySkuMap).sort((a, b) => {
    if (a.includes("LOGO")) return -1;
    if (b.includes("LOGO")) return 1;
    return a.localeCompare(b);
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Marketing Materials</h1>
        <p className="text-sm text-muted-foreground">Download product images, brochures, and POS materials to boost your sales</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search materials..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-secondary border-border max-w-md"
        />
      </div>

      {!filtered.length ? (
        <div className="text-center py-20 glass-card-solid">
          <FileText className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No materials available yet. Check back soon!</p>
        </div>
      ) : (
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
                    {items.map((item: any) => {
                      const publicUrl = supabase.storage.from("marketing-materials").getPublicUrl(item.file_path).data.publicUrl;
                      const isImage = item.file_name?.match(/\.(png|jpg|jpeg|webp)$/i);
                      return (
                        <div key={item.id} className="px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            {isImage ? (
                              <div className="w-10 h-10 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                                <img src={publicUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            ) : (
                              <FileText size={14} className="text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm text-foreground truncate">{item.file_name}</p>
                              <p className="text-xs text-muted-foreground">{item.file_size}</p>
                            </div>
                          </div>
                          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1">
                              <Download size={12} /> Download
                            </Button>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Request */}
      <div className="glass-card-solid p-6 mt-8">
        <h3 className="font-heading font-semibold text-foreground text-sm mb-2">Need custom materials?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          We can create co-branded materials with your company logo. Contact your account manager or email us.
        </p>
        <div className="flex gap-3">
          <a href="mailto:marketing@easysea.org">
            <Button variant="outline" size="sm" className="text-xs gap-1 rounded-lg">
              <ExternalLink size={12} /> marketing@easysea.org
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DealerMarketing;
