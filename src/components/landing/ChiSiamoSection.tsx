import { Shield, Handshake, Award } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Shield, title: "Qualità", desc: "Prodotti certificati e materiali premium selezionati per il settore nautico professionale." },
  { icon: Handshake, title: "Affidabilità", desc: "Consegne puntuali, stock sempre aggiornato e assistenza dedicata per ogni distributore." },
  { icon: Award, title: "Partnership", desc: "Condizioni personalizzate, gamification e premi per premiare la crescita insieme." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6 } }),
};

const ChiSiamoSection = () => (
  <section id="chi-siamo" className="py-24 bg-background">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">Perché scegliere Easysea</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">Tre pilastri che guidano ogni aspetto della nostra collaborazione con i distributori.</p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="glass-card-solid p-8 text-center hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 rounded-2xl gradient-ocean flex items-center justify-center mx-auto mb-6">
              <f.icon className="text-primary-foreground" size={28} />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground mb-3">{f.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ChiSiamoSection;
