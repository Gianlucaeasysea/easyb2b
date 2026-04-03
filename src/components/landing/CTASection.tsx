import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const CTASection = () => (
  <section className="py-32 section-alt relative overflow-hidden">
    {/* Glow */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px]" />
    </div>

    <div className="container mx-auto px-4 text-center relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl font-black text-foreground mb-6 leading-tight">
          Ready to <span className="text-gradient-blue">grow with us?</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto mb-12 text-base md:text-lg font-light leading-relaxed">
          Join 250+ dealers worldwide and start selling award-winning nautical accessories with exclusive B2B conditions.
        </p>
        <Link to="/become-a-dealer">
          <Button size="lg" className="rounded-full text-sm px-10 py-6 gradient-blue text-primary-foreground hover:opacity-90 font-heading font-bold gap-2 shadow-lg shadow-primary/20">
            Become a Dealer <ArrowRight size={16} />
          </Button>
        </Link>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
