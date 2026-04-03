import { Shield, Handshake, Award } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Shield,
    title: "Premium Quality",
    desc: "Award-winning nautical accessories, designed and engineered in Italy with cutting-edge materials.",
  },
  {
    icon: Handshake,
    title: "Dedicated Support",
    desc: "Personal account manager, real-time stock updates, and priority shipping for all dealers.",
  },
  {
    icon: Award,
    title: "Growth Partnership",
    desc: "Exclusive pricing tiers, gamification rewards, and marketing assets to boost your sales.",
  },
];

const AboutSection = () => (
  <section id="about" className="py-32 bg-background">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-20"
      >
        <p className="text-[11px] uppercase tracking-[0.4em] text-primary font-heading font-bold mb-5">
          Why Easysea
        </p>
        <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight">
          Built for dealers
          <br />
          <span className="text-gradient-blue">who demand the best</span>
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.6 }}
            className="glass-card-solid p-8 md:p-10 hover:border-primary/20 transition-all duration-300 group"
          >
            <div className="w-12 h-12 rounded-2xl gradient-blue flex items-center justify-center mb-7 group-hover:scale-110 transition-transform duration-300">
              <f.icon className="text-primary-foreground" size={20} />
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
