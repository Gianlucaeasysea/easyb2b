import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const CTASection = () => (
  <section className="py-24 gradient-hero relative overflow-hidden">
    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
    <div className="container mx-auto px-4 text-center relative z-10">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
          Pronto a navigare con noi?
        </h2>
        <p className="text-primary-foreground/80 max-w-lg mx-auto mb-10 text-lg">
          Unisciti alla rete di distributori Easysea e accedi a condizioni esclusive, supporto dedicato e un catalogo in costante crescita.
        </p>
        <Link to="/diventa-distributore">
          <Button size="lg" className="rounded-lg text-base px-10 py-6 bg-primary-foreground text-primary font-heading font-bold hover:bg-primary-foreground/90 shadow-xl">
            Diventa distributore
          </Button>
        </Link>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
