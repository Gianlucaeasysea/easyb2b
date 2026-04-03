import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const products = [
  { name: "Jake™ Boat Hook", img: "https://easysea.org/cdn/shop/files/pi.png?v=1767816422&width=800", badge: "NEW" },
  { name: "Flipper™ Winch Handle", img: "https://easysea.org/cdn/shop/files/Copertina-FLIPPER-01.jpg?v=1764662996&width=800", badge: "BESTSELLER" },
  { name: "Olli™ Low Friction Ring", img: "https://easysea.org/cdn/shop/files/GRAFICA-OLLI-LOW-FRICTION-RING-01.png?v=1768850397&width=800" },
  { name: "Way2™ Inflatable Gangway", img: "https://easysea.org/cdn/shop/files/Way2_-_Grafica_1_v2-Copertina.webp?v=1764663282&width=800" },
];

const ProductsSection = () => (
  <section id="products" className="py-32 bg-background">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-16"
      >
        <p className="text-[11px] uppercase tracking-[0.4em] text-primary font-heading font-bold mb-5">
          Product Catalog
        </p>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight">
            High-quality, <span className="text-gradient-blue">innovative,</span>
            <br className="hidden md:block" />
            and cool products
          </h2>
          <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
            Access exclusive B2B pricing, real-time stock, and full product specs through your dealer portal.
          </p>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="group cursor-pointer rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/25 transition-all duration-300"
          >
            <div className="relative aspect-square bg-secondary overflow-hidden">
              <img
                src={p.img}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
              {p.badge && (
                <span className="absolute top-3 left-3 text-[9px] font-heading font-black uppercase tracking-[0.15em] bg-primary text-primary-foreground px-2.5 py-1 rounded-full">
                  {p.badge}
                </span>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-foreground">{p.name}</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Login for B2B pricing</p>
              </div>
              <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ProductsSection;
