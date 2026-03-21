import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-ocean.jpg";

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0">
      <img src={heroImg} alt="Oceano con barca a vela" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-foreground/70" />
    </div>

    {/* Content */}
    <div className="relative z-10 container mx-auto px-4 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="font-heading text-4xl md:text-6xl lg:text-7xl font-extrabold text-primary-foreground mb-6 leading-tight"
      >
        Il tuo partner B2B<br />
        <span className="text-accent">nel settore nautico</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10"
      >
        Qualità premium, sconti dedicati e supporto continuo per far crescere il tuo business nel mondo della nautica.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <Link to="/login">
          <Button size="lg" className="rounded-lg text-base px-8 py-6 gradient-ocean border-0 text-primary-foreground font-heading font-bold shadow-lg hover:shadow-xl transition-shadow">
            Accedi al portale
          </Button>
        </Link>
        <Link to="/diventa-distributore">
          <Button size="lg" variant="outline" className="rounded-lg text-base px-8 py-6 border-2 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 font-heading font-bold backdrop-blur-sm">
            Diventa distributore
          </Button>
        </Link>
      </motion.div>
    </div>

    {/* Scroll indicator */}
    <motion.div
      animate={{ y: [0, 10, 0] }}
      transition={{ repeat: Infinity, duration: 2 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2"
    >
      <div className="w-6 h-10 border-2 border-primary-foreground/40 rounded-full flex justify-center pt-2">
        <div className="w-1.5 h-3 bg-primary-foreground/60 rounded-full" />
      </div>
    </motion.div>
  </section>
);

export default HeroSection;
