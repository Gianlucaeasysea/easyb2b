import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-ocean.jpg";

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
    {/* Background image with dark overlay */}
    <div className="absolute inset-0">
      <img src={heroImg} alt="Ocean sailing" className="w-full h-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
    </div>

    <div className="relative z-10 container mx-auto px-4 text-center pt-16">
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-8 font-heading font-medium"
      >
        B2B Platform — Worldwide Distribution
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="font-heading text-5xl md:text-7xl lg:text-8xl font-extrabold text-foreground mb-8 leading-[0.95] tracking-tight"
      >
        Your B2B Partner in{" "}
        <span className="text-gradient-blue">Nautical Innovation</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 font-light"
      >
        Join 250+ dealers worldwide. Exclusive pricing, premium products, and dedicated support to grow your nautical business.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <Link to="/login">
          <Button size="lg" className="rounded-lg text-base px-10 py-6 bg-foreground text-background hover:bg-foreground/90 font-heading font-bold">
            Dealer Login
          </Button>
        </Link>
        <Link to="/become-a-dealer">
          <Button size="lg" variant="outline" className="rounded-lg text-base px-10 py-6 border-foreground/20 text-foreground hover:bg-foreground/5 font-heading font-bold">
            Become a Dealer
          </Button>
        </Link>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7 }}
        className="mt-24 grid grid-cols-3 gap-8 max-w-xl mx-auto"
      >
        {[
          { value: "250+", label: "Dealers Worldwide" },
          { value: "16+", label: "Innovative Products" },
          { value: "431+", label: "5-Star Reviews" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-heading text-3xl md:text-4xl font-extrabold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </div>

    {/* Scroll indicator */}
    <motion.div
      animate={{ y: [0, 8, 0] }}
      transition={{ repeat: Infinity, duration: 2 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2"
    >
      <div className="w-5 h-8 border border-foreground/20 rounded-full flex justify-center pt-1.5">
        <div className="w-1 h-2 bg-foreground/40 rounded-full" />
      </div>
    </motion.div>
  </section>
);

export default HeroSection;
