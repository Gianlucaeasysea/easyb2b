import { motion } from "framer-motion";

const products = [
  { name: "Jake™ Boat Hook", img: "https://easysea.org/cdn/shop/files/pi.png?v=1767816422&width=800", badge: "NEW" },
  { name: "Flipper™ Winch Handle", img: "https://easysea.org/cdn/shop/files/Copertina-FLIPPER-01.jpg?v=1764662996&width=800", badge: "BESTSELLER" },
  { name: "Olli™ Low Friction Ring", img: "https://easysea.org/cdn/shop/files/GRAFICA-OLLI-LOW-FRICTION-RING-01.png?v=1768850397&width=800" },
  { name: "Way2™ Inflatable Gangway", img: "https://easysea.org/cdn/shop/files/Way2_-_Grafica_1_v2-Copertina.webp?v=1764663282&width=800" },
];

const ProductsSection = () => (
  <section id="products" className="py-28 section-alt">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-heading font-semibold mb-4">Product Catalog</p>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground">High-quality, innovative,<br />and cool products</h2>
          <p className="text-muted-foreground text-sm max-w-sm">Access exclusive B2B pricing, real-time stock, and full product specs through your dealer portal.</p>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((p, i) => (
          <motion.div key={p.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="glass-card-solid overflow-hidden group cursor-pointer hover:border-primary/30 transition-colors">
            <div className="relative aspect-square bg-secondary overflow-hidden">
              <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {p.badge && (
                <span className="absolute top-3 left-3 text-[10px] font-heading font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-1 rounded">
                  {p.badge}
                </span>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-heading text-sm font-semibold text-foreground">{p.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">Login for B2B pricing</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ProductsSection;
