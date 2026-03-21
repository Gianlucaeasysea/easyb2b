import { motion } from "framer-motion";
import { FileText, CheckCircle, ShoppingBag } from "lucide-react";

const steps = [
  { icon: FileText, step: "01", title: "Richiedi", desc: "Compila il form di richiesta distributore con i dati della tua azienda." },
  { icon: CheckCircle, step: "02", title: "Vieni approvato", desc: "Il nostro team valuta la richiesta e ti contatta entro 2 giorni lavorativi." },
  { icon: ShoppingBag, step: "03", title: "Ordina", desc: "Accedi al portale con i tuoi sconti dedicati e inizia ad ordinare." },
];

const ComeFunzionaSection = () => (
  <section id="come-funziona" className="py-24 bg-background">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">Come funziona</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">Tre semplici passi per diventare partner Easysea.</p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 relative">
        {/* Connecting line */}
        <div className="hidden md:block absolute top-20 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

        {steps.map((s, i) => (
          <motion.div key={s.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }}
            className="relative text-center">
            <div className="w-20 h-20 rounded-full gradient-ocean flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg">
              <s.icon className="text-primary-foreground" size={32} />
            </div>
            <span className="font-mono text-sm text-primary font-bold">{s.step}</span>
            <h3 className="font-heading text-xl font-bold text-foreground mt-2 mb-3">{s.title}</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ComeFunzionaSection;
