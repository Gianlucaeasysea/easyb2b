import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
    {/* Subtle radial glow */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-primary/5 blur-[150px]" />
    </div>

    <div className="relative z-10 container mx-auto px-4 text-center pt-20 pb-16">
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-10 font-heading font-semibold"
      >
        B2B Dealer Platform
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.1 }}
        className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-foreground leading-[0.95] tracking-tight mb-4"
      >
        We Design
      </motion.h1>

      <motion.h2
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2 }}
        className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-10 leading-snug"
      >
        <span className="text-gradient-blue">Beautiful and innovative</span>
        <br className="hidden sm:block" />
        <span className="text-foreground"> nautical accessories</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-14 font-light leading-relaxed"
      >
        Join 250+ dealers worldwide. Exclusive pricing, premium products, and dedicated support to grow your nautical business.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <Link to="/become-a-dealer">
          <Button size="lg" className="rounded-full text-sm px-8 py-6 gradient-blue text-primary-foreground hover:opacity-90 font-heading font-bold gap-2 shadow-lg shadow-primary/20">
            Become a Dealer <ArrowRight size={16} />
          </Button>
        </Link>
        <Link to="/login">
          <Button size="lg" variant="outline" className="rounded-full text-sm px-8 py-6 border-foreground/15 text-foreground hover:bg-foreground/5 font-heading font-semibold">
            Dealer Login
          </Button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="mt-28 grid grid-cols-3 gap-8 max-w-md mx-auto"
      >
        {[
          { value: "250+", label: "Dealers" },
          { value: "16+", label: "Products" },
          { value: "431+", label: "Reviews" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-heading text-3xl md:text-4xl font-black text-foreground">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-[0.2em] font-heading">{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </div>

    <motion.div
      animate={{ y: [0, 8, 0] }}
      transition={{ repeat: Infinity, duration: 2.5 }}
      className="absolute bottom-10 left-1/2 -translate-x-1/2"
    >
      <div className="w-5 h-8 border border-foreground/15 rounded-full flex justify-center pt-1.5">
        <div className="w-1 h-2 bg-foreground/30 rounded-full" />
      </div>
    </motion.div>
  </section>
);

export default HeroSection;
