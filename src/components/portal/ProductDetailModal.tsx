import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, FileDown, ExternalLink, ChevronLeft, ChevronRight, Info, Wrench, FileText } from "lucide-react";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { useState } from "react";

interface ProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  detail: any | null;
  b2bPrice: number;
  retailPrice: number;
  discountPct: number;
  isClientMode: boolean;
  canAddToCart?: boolean;
  onAddToCart: () => void;
}

const ProductDetailModal = ({
  open,
  onOpenChange,
  product,
  detail,
  b2bPrice,
  retailPrice,
  discountPct,
  isClientMode,
  canAddToCart = true,
  onAddToCart,
}: ProductDetailModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const galleryImages: string[] = detail?.gallery_images || (product.images?.length ? product.images : []);
  const inStock = (product.stock_quantity ?? 0) > 0;

  const features: string[] = detail?.features || [];
  const specifications: Record<string, string> = detail?.specifications || {};
  const specEntries = Object.entries(specifications);

  const nextImage = () => setCurrentImageIndex(i => (i + 1) % galleryImages.length);
  const prevImage = () => setCurrentImageIndex(i => (i - 1 + galleryImages.length) % galleryImages.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Gallery */}
          <div className="relative bg-secondary">
            {galleryImages.length > 0 ? (
              <>
                <div className="aspect-square flex items-center justify-center">
                  <OptimizedImage
                    src={galleryImages[currentImageIndex]}
                    alt={product.name}
                    loading={currentImageIndex === 0 ? "eager" : "lazy"}
                    className="w-full h-full object-cover"
                    containerClassName="w-full h-full"
                  />
                </div>
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {galleryImages.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            idx === currentImageIndex ? "bg-foreground" : "bg-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="aspect-square flex items-center justify-center">
                <OptimizedImage src={null} alt={product.name} className="w-full h-full" containerClassName="w-full h-full" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-6 flex flex-col">
            <DialogHeader className="mb-4">
              <DialogTitle className="font-heading text-xl font-bold text-foreground leading-tight">
                {detail?.display_name || product.name}
              </DialogTitle>
              {product.sku && (
                <p className="text-xs font-mono text-muted-foreground mt-1">SKU: {product.sku}</p>
              )}
              {product.barcode && (
                <p className="text-xs font-mono text-muted-foreground">EAN: {product.barcode}</p>
              )}
            </DialogHeader>

            {/* Pricing */}
            <div className="flex items-end justify-between mb-4 pb-4 border-b border-border">
              {isClientMode ? (
                <div>
                  <p className="font-heading text-2xl font-bold text-foreground">€{retailPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Retail price</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground line-through">€{Number(product.price).toFixed(2)}</p>
                  <p className="font-heading text-2xl font-bold text-foreground">€{b2bPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Your B2B price</p>
                </div>
              )}
              <div className="text-right">
                {!isClientMode && discountPct > 0 && (
                  <Badge variant="outline" className="text-xs bg-success/20 text-success border-0 mb-1">
                    -{discountPct}%
                  </Badge>
                )}
                {!isClientMode && (
                  <p className={`text-sm font-heading font-bold ${inStock ? "text-success" : "text-destructive"}`}>
                    {inStock ? `${product.stock_quantity} in stock` : "Esaurito"}
                  </p>
                )}
                {!isClientMode && !inStock && detail?.lead_time && (
                  <p className="text-xs font-semibold text-destructive/80">Rientro: {detail.lead_time}</p>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="description" className="flex-1">
              <TabsList className="w-full grid grid-cols-3 mb-3">
                <TabsTrigger value="description" className="text-xs gap-1">
                  <Info size={12} /> Description
                </TabsTrigger>
                <TabsTrigger value="specs" className="text-xs gap-1">
                  <Wrench size={12} /> Specs
                </TabsTrigger>
                <TabsTrigger value="files" className="text-xs gap-1">
                  <FileText size={12} /> Files
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-0">
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                  {detail?.description ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">{detail.description}</p>
                  ) : product.description ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No description available.</p>
                  )}

                  {features.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-xs font-heading font-semibold text-foreground uppercase tracking-wider mb-2">
                        Key Features
                      </h4>
                      <ul className="space-y-1.5">
                        {features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="text-primary mt-0.5 shrink-0">✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="specs" className="mt-0">
                <div className="max-h-[200px] overflow-y-auto pr-1">
                  {specEntries.length > 0 ? (
                    <div className="space-y-0">
                      {specEntries.map(([key, value], i) => (
                        <div
                          key={key}
                          className={`flex justify-between py-2 px-1 text-xs ${
                            i % 2 === 0 ? "bg-secondary/50" : ""
                          } rounded`}
                        >
                          <span className="font-medium text-foreground">{key}</span>
                          <span className="text-muted-foreground text-right ml-4">{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No technical specifications available.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="files" className="mt-0">
                <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2">
                  {detail?.technical_sheet_url ? (
                    <a
                      href={detail.technical_sheet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileDown size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          Technical Sheet
                        </p>
                        <p className="text-xs text-muted-foreground">PDF Document</p>
                      </div>
                      <ExternalLink size={14} className="text-muted-foreground" />
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No technical files available for this product.</p>
                  )}

                  {detail?.website_url && (
                    <a
                      href={detail.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <ExternalLink size={20} className="text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          View on easysea.org
                        </p>
                        <p className="text-xs text-muted-foreground">Full product page</p>
                      </div>
                      <ExternalLink size={14} className="text-muted-foreground" />
                    </a>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Add to Cart */}
            {!isClientMode && (
              <Button
                disabled={!canAddToCart}
                className="w-full mt-4 rounded-lg bg-foreground text-background hover:bg-foreground/90 gap-2 font-heading font-semibold"
                onClick={() => {
                  onAddToCart();
                  onOpenChange(false);
                }}
              >
                <ShoppingCart size={16} /> Add to Order
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
