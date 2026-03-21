import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Marco Bianchi", company: "Nautica Bianchi Srl", quote: "Da quando siamo partner Easysea il nostro fatturato nel settore è cresciuto del 40%. Servizio impeccabile.", stars: 5 },
  { name: "Laura Conti", company: "Mediterranean Marine", quote: "Il portale B2B è intuitivo e veloce. I prezzi dedicati e le promo rendono tutto molto competitivo.", stars: 5 },
  { name: "Giuseppe Ferro", company: "Cantiere del Sud", quote: "Finalmente un fornitore che capisce le esigenze dei professionisti della nautica. Consegne sempre puntuali.", stars: 5 },
];

const TestimonianzeSection = () => (
  <section id="testimonianze" className="py-24 gradient-ocean-light">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">Cosa dicono i nostri partner</h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {testimonials.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
            className="glass-card-solid p-8">
            <div className="flex gap-1 mb-4">
              {Array.from({ length: t.stars }).map((_, j) => (
                <Star key={j} size={18} className="fill-warning text-warning" />
              ))}
            </div>
            <p className="text-foreground/80 italic mb-6 leading-relaxed">"{t.quote}"</p>
            <div>
              <p className="font-heading font-bold text-foreground">{t.name}</p>
              <p className="text-sm text-muted-foreground">{t.company}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonianzeSection;
