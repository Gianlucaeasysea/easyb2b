import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

const CTASection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const glowScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.6, 1.2, 0.8]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], [60, 0]);

  return (
    <section ref={ref} className="py-32 section-alt relative overflow-hidden">
      {/* Animated glow */}
      <motion.div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ scale: glowScale }}>
        <div className="w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px]" />
      </motion.div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div style={{ y: contentY }}>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="font-heading text-3xl md:text-5xl lg:text-6xl font-black text-foreground mb-6 leading-tight"
          >
            Ready to <span className="text-gradient-blue">grow with us?</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="text-muted-foreground max-w-lg mx-auto mb-12 text-base md:text-lg font-light leading-relaxed"
          >
            Join 250+ dealers worldwide and start selling award-winning nautical accessories with exclusive B2B conditions.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5, type: "spring", stiffness: 200 }}
          >
            <Link to="/become-a-dealer">
              <Button size="lg" className="rounded-full text-sm px-10 py-6 gradient-blue text-primary-foreground hover:opacity-90 font-heading font-bold gap-2 shadow-lg shadow-primary/20">
                Become a Dealer <ArrowRight size={16} />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
