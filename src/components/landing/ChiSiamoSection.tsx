import { Shield, Handshake, Award } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

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

const cardVariants = {
  hidden: { opacity: 0, y: 50, rotateX: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const AboutSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const headerY = useTransform(scrollYProgress, [0, 0.3], [50, 0]);

  return (
    <section ref={ref} id="about" className="py-32 bg-background overflow-hidden" style={{ perspective: 1000 }}>
      <div className="container mx-auto px-4">
        <motion.div style={{ y: headerY }} className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[11px] uppercase tracking-[0.4em] text-primary font-heading font-bold mb-5"
          >
            Why Easysea
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="font-heading text-3xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight"
          >
            Built for dealers
            <br />
            <span className="text-gradient-blue">who demand the best</span>
          </motion.h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              whileHover={{ y: -6, transition: { duration: 0.3 } }}
              className="glass-card-solid p-8 md:p-10 hover:border-primary/20 transition-all duration-300 group"
            >
              <motion.div
                className="w-12 h-12 rounded-2xl gradient-blue flex items-center justify-center mb-7"
                whileHover={{ scale: 1.15, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <f.icon className="text-primary-foreground" size={20} />
              </motion.div>
              <h3 className="font-heading text-lg font-bold text-foreground mb-3">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
