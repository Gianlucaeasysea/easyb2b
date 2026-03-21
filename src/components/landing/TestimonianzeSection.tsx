import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Thomas Berger", company: "Segelshop Hamburg, Germany", quote: "Easysea products sell themselves. The Flipper winch handle is our #1 bestseller — customers love it.", stars: 5 },
  { name: "Sophie Martin", company: "Voiles & Mer, France", quote: "The B2B portal makes ordering effortless. Real-time stock, dedicated pricing, and fast shipping across Europe.", stars: 5 },
  { name: "James Whitfield", company: "SailTech UK, United Kingdom", quote: "250+ 5-star reviews speak for themselves. Easysea delivers quality and innovation like no other brand.", stars: 5 },
];

const TestimonialsSection = () => (
  <section id="partners" className="py-28 section-alt">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-heading font-semibold mb-4">Trusted worldwide</p>
        <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground">What our dealers say</h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
            className="glass-card-solid p-8 hover:border-primary/30 transition-colors">
            <div className="flex gap-0.5 mb-5">
              {Array.from({ length: t.stars }).map((_, j) => (
                <Star key={j} size={14} className="fill-warning text-warning" />
              ))}
            </div>
            <p className="text-foreground/80 text-sm italic mb-6 leading-relaxed">"{t.quote}"</p>
            <div>
              <p className="font-heading text-sm font-bold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.company}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
