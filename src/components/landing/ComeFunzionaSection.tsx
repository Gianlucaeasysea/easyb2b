import { motion } from "framer-motion";

const steps = [
  { step: "01", title: "Apply", desc: "Fill out the dealer application form with your business details." },
  { step: "02", title: "Get Approved", desc: "Our team reviews your application and contacts you within 2 business days." },
  { step: "03", title: "Start Selling", desc: "Access your portal with exclusive pricing, stock data, and marketing materials." },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="py-32 section-alt">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
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
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="text-center relative"
          >
            <span className="font-heading text-7xl font-black text-gradient-blue opacity-40 select-none">
              {s.step}
            </span>
            <h3 className="font-heading text-xl font-bold text-foreground -mt-2 mb-3">{s.title}</h3>
            <p className="text-muted-foreground text-sm max-w-[260px] mx-auto leading-relaxed">{s.desc}</p>
            {i < 2 && (
              <div className="hidden md:block absolute top-10 -right-5 w-10 h-px bg-border" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
