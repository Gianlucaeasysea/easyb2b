import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-ocean.jpg";
import { useState, useEffect, useCallback } from "react";

const PHRASES = [
  "Act now. Start selling today.",
  "Sell the most in-demand products on the market.",
  "We're not just a brand. We're a community.",
];

const TYPING_SPEED = 60;
const DELETING_SPEED = 35;
const PAUSE_AFTER_TYPE = 2000;
const PAUSE_AFTER_DELETE = 400;

const useTypewriter = (phrases: string[]) => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const tick = useCallback(() => {
    const current = phrases[phraseIndex];

    if (!isDeleting) {
      if (displayText.length < current.length) {
        return { text: current.slice(0, displayText.length + 1), delay: TYPING_SPEED };
      }
      return { text: displayText, delay: PAUSE_AFTER_TYPE, startDelete: true };
    }

    if (displayText.length > 0) {
      return { text: displayText.slice(0, -1), delay: DELETING_SPEED };
    }
    return { text: "", delay: PAUSE_AFTER_DELETE, nextPhrase: true };
  }, [displayText, isDeleting, phraseIndex, phrases]);

  useEffect(() => {
    const result = tick();
    const timeout = setTimeout(() => {
      setDisplayText(result.text);
      if (result.startDelete) setIsDeleting(true);
      if (result.nextPhrase) {
        setIsDeleting(false);
        setPhraseIndex((i) => (i + 1) % phrases.length);
      }
    }, result.delay);
    return () => clearTimeout(timeout);
  }, [tick]);

  return displayText;
};

const HeroSection = () => {
  const typedText = useTypewriter(PHRASES);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-heading text-4xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-8 leading-[1.1] tracking-tight min-h-[2.4em] flex items-center justify-center"
        >
          <span>
            {typedText}
            <span className="inline-block w-[3px] h-[0.85em] bg-primary ml-1 animate-[pulse_1s_steps(1)_infinite] align-middle" />
          </span>
        </motion.div>

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
};

export default HeroSection;
