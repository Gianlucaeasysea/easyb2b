import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Image, Video, FolderOpen, Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const categoryIcons: Record<string, any> = {
  "product-images": Image,
  "brochures": FileText,
  "pos": FolderOpen,
  "digital": Globe,
  "videos": Video,
  "contracts": FileText,
  "price-lists": FileText,
  "general": FileText,
};

const categoryLabels: Record<string, string> = {
  "product-images": "Product Images",
  "brochures": "Brochures & Catalogs",
  "pos": "Point of Sale",
  "digital": "Digital & Social Media",
  "videos": "Videos",
  "contracts": "Contracts & Documents",
  "price-lists": "Price Lists",
  "general": "General",
};

const DealerMarketing = () => {
  const { data: materials } = useQuery({
    queryKey: ["dealer-marketing-materials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketing_materials")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const grouped = Object.entries(
    (materials || []).reduce<Record<string, any[]>>((acc, m: any) => {
      const cat = m.category || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    }, {})
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Marketing Materials</h1>
        <p className="text-sm text-muted-foreground">Download product images, brochures, and POS materials to boost your sales</p>
      </div>

      {!materials?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <FileText className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No materials available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, items]) => {
            const Icon = categoryIcons[cat] || FileText;
            const label = categoryLabels[cat] || cat;
            return (
              <div key={cat} className="glass-card-solid overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Icon size={18} className="text-primary" />
                  <h2 className="font-heading font-bold text-foreground text-sm">{label}</h2>
                  <Badge variant="outline" className="text-[10px]">{items.length} files</Badge>
                </div>
                <div className="divide-y divide-border">
                  {items.map((item: any) => {
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
                        <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1">
                            <Download size={12} /> Download
                          </Button>
                        </a>
                      </div>
                    );
                  })}
                </div>
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
