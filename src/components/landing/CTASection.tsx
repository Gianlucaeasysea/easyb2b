import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const CTASection = () => (
  <section className="py-28 bg-background relative overflow-hidden">
    {/* Subtle gradient accent */}
    <div className="absolute inset-0 opacity-5">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full gradient-blue blur-[120px]" />
    </div>

    <div className="container mx-auto px-4 text-center relative z-10">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground mb-6">
          Ready to grow with us?
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto mb-10 text-lg font-light">
          Join 250+ dealers worldwide and start selling award-winning nautical accessories with exclusive B2B conditions.
        </p>
        <Link to="/become-a-dealer">
          <Button size="lg" className="rounded-lg text-base px-10 py-6 bg-foreground text-background hover:bg-foreground/90 font-heading font-bold">
            Become a Dealer
          </Button>
        </Link>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
