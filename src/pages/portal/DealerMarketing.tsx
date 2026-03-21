import { Download, FileText, Image, Video, ExternalLink, FolderOpen, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const materials = [
  {
    category: "Product Images",
    icon: Image,
    items: [
      { name: "Hull Cleaner — Product Shot (PNG)", size: "2.4 MB", type: "image" },
      { name: "Deck Wash — Product Shot (PNG)", size: "2.1 MB", type: "image" },
      { name: "Complete Care Kit — Lifestyle (JPG)", size: "3.8 MB", type: "image" },
      { name: "Full Product Line — White Background (ZIP)", size: "18.5 MB", type: "archive" },
      { name: "Lifestyle Photos — Boat Setting (ZIP)", size: "42.0 MB", type: "archive" },
    ],
  },
  {
    category: "Brochures & Catalogs",
    icon: FileText,
    items: [
      { name: "Easysea Product Catalog 2026 (PDF)", size: "5.2 MB", type: "pdf" },
      { name: "B2B Price List — Confidential (PDF)", size: "320 KB", type: "pdf" },
      { name: "Product Comparison Chart (PDF)", size: "780 KB", type: "pdf" },
      { name: "Eco-Friendly Story — Brand Brochure (PDF)", size: "4.1 MB", type: "pdf" },
    ],
  },
  {
    category: "Point of Sale",
    icon: FolderOpen,
    items: [
      { name: "Counter Display Design (PDF)", size: "1.8 MB", type: "pdf" },
      { name: "Shelf Talkers — All Products (PDF)", size: "2.3 MB", type: "pdf" },
      { name: "Window Sticker — Authorized Dealer (PDF)", size: "650 KB", type: "pdf" },
      { name: "Floor Stand Mockup (PDF)", size: "3.2 MB", type: "pdf" },
    ],
  },
  {
    category: "Digital & Social Media",
    icon: Globe,
    items: [
      { name: "Social Media Kit — Instagram (ZIP)", size: "15.3 MB", type: "archive" },
      { name: "Social Media Kit — Facebook (ZIP)", size: "12.8 MB", type: "archive" },
      { name: "Email Banner Templates (ZIP)", size: "4.5 MB", type: "archive" },
      { name: "Logo Pack — All Formats (ZIP)", size: "8.2 MB", type: "archive" },
      { name: "Brand Guidelines (PDF)", size: "6.7 MB", type: "pdf" },
    ],
  },
  {
    category: "Videos",
    icon: Video,
    items: [
      { name: "Hull Cleaner — How To Use (MP4)", size: "45 MB", type: "video" },
      { name: "Product Line Overview — 60s (MP4)", size: "32 MB", type: "video" },
      { name: "Brand Story — 2min (MP4)", size: "85 MB", type: "video" },
    ],
  },
];

const DealerMarketing = () => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Marketing Materials</h1>
        <p className="text-sm text-muted-foreground">Download product images, brochures, and POS materials to boost your sales</p>
      </div>

      {/* Quick Download Banner */}
      <div className="glass-card-solid p-5 mb-8 border border-primary/20 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
            <Download className="text-primary-foreground" size={18} />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground text-sm">Download Everything</h3>
            <p className="text-xs text-muted-foreground">Get the complete dealer marketing pack (all categories)</p>
          </div>
        </div>
        <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 gap-1.5 font-heading font-semibold">
          <Download size={14} /> Download All (180 MB)
        </Button>
      </div>

      {/* Material Categories */}
      <div className="space-y-6">
        {materials.map(cat => {
          const Icon = cat.icon;
          return (
            <div key={cat.category} className="glass-card-solid overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-primary" />
                  <h2 className="font-heading font-bold text-foreground text-sm">{cat.category}</h2>
                  <Badge variant="outline" className="text-[10px]">{cat.items.length} files</Badge>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
                  <Download size={12} /> Download All
                </Button>
              </div>
              <div className="divide-y divide-border">
                {cat.items.map((item, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText size={14} className="text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.size}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1">
                      <Download size={12} /> Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
