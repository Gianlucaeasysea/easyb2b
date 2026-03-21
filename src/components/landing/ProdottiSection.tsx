import { motion } from "framer-motion";
import { Anchor, Sailboat, Waves, LifeBuoy } from "lucide-react";

const products = [
  { icon: Anchor, name: "Accessori Coperta", desc: "Soluzioni premium per il ponte della barca" },
  { icon: Sailboat, name: "Vele & Tessuti", desc: "Materiali tecnici di alta qualità" },
  { icon: Waves, name: "Sistemi Idraulici", desc: "Componenti affidabili per ogni imbarcazione" },
  { icon: LifeBuoy, name: "Sicurezza", desc: "Dispositivi certificati per la navigazione" },
];

const ProdottiSection = () => (
  <section id="prodotti" className="py-24 gradient-ocean-light">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">Il nostro catalogo</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">Un'ampia gamma di prodotti nautici professionali, sincronizzati in tempo reale dal nostro magazzino.</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((p, i) => (
          <motion.div key={p.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="glass-card p-6 text-center group hover:scale-105 transition-transform cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
              <p.icon className="text-primary" size={32} />
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground mb-2">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.desc}</p>
          </motion.div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-10">Accedi al portale per visualizzare prezzi e disponibilità in tempo reale.</p>
    </div>
  </section>
);

export default ProdottiSection;
