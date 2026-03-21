import { Shield, Handshake, Award } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Shield, title: "Premium Quality", desc: "Award-winning nautical accessories, designed and engineered in Italy with cutting-edge materials." },
  { icon: Handshake, title: "Dedicated Support", desc: "Personal account manager, real-time stock updates, and priority shipping for all dealers." },
  { icon: Award, title: "Growth Partnership", desc: "Exclusive pricing tiers, gamification rewards, and marketing assets to boost your sales." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6 } }),
};

const AboutSection = () => (
  <section id="about" className="py-28 bg-background">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-heading font-semibold mb-4">Why Easysea</p>
        <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground">Built for dealers who demand the best</h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="glass-card-solid p-8 hover:border-primary/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl gradient-blue flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <f.icon className="text-primary-foreground" size={22} />
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground mb-3">{f.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default AboutSection;
