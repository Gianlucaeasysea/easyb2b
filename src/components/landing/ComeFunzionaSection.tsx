import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";

const steps = [
  { step: "01", title: "Apply", desc: "Fill out the dealer application form with your business details." },
  { step: "02", title: "Get Approved", desc: "Our team reviews your application and contacts you within 2 business days." },
  { step: "03", title: "Start Selling", desc: "Access your portal with exclusive pricing, stock data, and marketing materials." },
];

const TYPING_SPEED = 50;
const DELETING_SPEED = 30;
const PAUSE_AFTER_TYPE = 2500;
const PAUSE_AFTER_DELETE = 400;

const PHRASES = [
  "Invia la tua candidatura in meno di 3 minuti",
  "Three steps to become a dealer",
];

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

const HowItWorksSection = () => {
  const typedText = useTypewriter(PHRASES);

  return (
    <section id="how-it-works" className="py-28 bg-background">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-heading font-semibold mb-4">How it works</p>
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground min-h-[1.3em]">
            {typedText}
            <span className="inline-block w-[3px] h-[0.85em] bg-primary ml-1 animate-[pulse_1s_steps(1)_infinite] align-middle" />
          </h2>
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
};

export default HowItWorksSection;
