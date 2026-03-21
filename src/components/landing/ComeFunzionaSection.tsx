import { motion } from "framer-motion";

const steps = [
  { step: "01", title: "Apply", desc: "Fill out the dealer application form with your business details." },
  { step: "02", title: "Get Approved", desc: "Our team reviews your application and contacts you within 2 business days." },
  { step: "03", title: "Start Selling", desc: "Access your portal with exclusive pricing, stock data, and marketing materials." },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="py-28 bg-background">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-heading font-semibold mb-4">How it works</p>
        <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground">Three steps to become a dealer</h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {steps.map((s, i) => (
          <motion.div key={s.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }}
            className="text-center relative">
            <span className="font-heading text-6xl font-extrabold text-gradient-blue opacity-50">{s.step}</span>
            <h3 className="font-heading text-xl font-bold text-foreground mt-2 mb-3">{s.title}</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">{s.desc}</p>
            {i < 2 && (
              <div className="hidden md:block absolute top-8 -right-4 w-8 h-px bg-border" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
