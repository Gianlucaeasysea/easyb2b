import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const steps = [
  { step: "01", title: "Apply", desc: "Fill out the dealer application form with your business details." },
  { step: "02", title: "Get Approved", desc: "Our team reviews your application and contacts you within 2 business days." },
  { step: "03", title: "Start Selling", desc: "Access your portal with exclusive pricing, stock data, and marketing materials." },
];

const stepVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const HowItWorksSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);

  return (
    <section ref={ref} id="how-it-works" className="py-32 section-alt relative overflow-hidden">
      <motion.div className="absolute inset-0 pointer-events-none" style={{ y: bgY }}>
        <div className="absolute top-0 right-0 w-[600px] h-[400px] rounded-full bg-primary/3 blur-[180px]" />
      </motion.div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-20"
        >
          <p className="text-[11px] uppercase tracking-[0.4em] text-primary font-heading font-bold mb-5">
            How it works
          </p>
          <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight">
            Three steps to
            <br />
            <span className="text-gradient-blue">become a dealer</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              custom={i}
              variants={stepVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="text-center relative"
            >
              <motion.span
                className="font-heading text-7xl font-black text-gradient-blue opacity-40 select-none inline-block"
                whileInView={{ scale: [0.8, 1.05, 1], opacity: [0, 0.4] }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
              >
                {s.step}
              </motion.span>
              <h3 className="font-heading text-xl font-bold text-foreground -mt-2 mb-3">{s.title}</h3>
              <p className="text-muted-foreground text-sm max-w-[260px] mx-auto leading-relaxed">{s.desc}</p>
              {i < 2 && (
                <motion.div
                  className="hidden md:block absolute top-10 -right-5 w-10 h-px bg-border"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 + 0.4, duration: 0.5 }}
                  style={{ originX: 0 }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
