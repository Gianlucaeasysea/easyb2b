import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import DarkVeil from "@/components/ui/DarkVeil";

const HeroSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Dark Veil background */}
      <div className="absolute inset-0 pointer-events-none">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0.03}
          scanlineIntensity={0}
          speed={0.4}
          warpAmount={0.04}
          resolutionScale={0.75}
        />
      </div>
      {/* Fade to background at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none z-[1]" />

      <motion.div className="relative z-10 container mx-auto px-4 text-center pt-20 pb-16" style={{ y: textY, opacity }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <span className="inline-block px-5 py-2 rounded-full border border-primary/30 bg-primary/10 text-sm font-heading font-semibold tracking-wider text-primary uppercase">
            B2B Dealer Platform
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-foreground leading-[0.95] tracking-tight mb-4"
        >
          Your Nautical
          <br />
          <span className="text-gradient-blue">Business Hub</span>
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="font-heading text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-10 leading-snug text-muted-foreground"
        >
          Premium accessories, exclusive B2B pricing
          <br className="hidden sm:block" />
          <span className="text-foreground"> & dedicated dealer support</span>
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
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
      >
        <div className="w-5 h-8 border border-foreground/15 rounded-full flex justify-center pt-1.5">
          <div className="w-1 h-2 bg-foreground/30 rounded-full" />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
