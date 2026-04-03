import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/white_logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-background/90 backdrop-blur-xl border-b border-border" : "bg-transparent"
    }`}>
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Easysea" className="h-10 md:h-11" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#about" className="text-xs font-heading font-semibold uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors">About</a>
          <a href="#products" className="text-xs font-heading font-semibold uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors">Products</a>
          <a href="#how-it-works" className="text-xs font-heading font-semibold uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          <a href="#partners" className="text-xs font-heading font-semibold uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors">Partners</a>
          <Link to="/login">
            <Button size="sm" className="rounded-full gradient-blue text-primary-foreground hover:opacity-90 font-heading font-bold text-xs px-5">
              Dealer Login
            </Button>
          </Link>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border"
          >
            <div className="flex flex-col gap-4 p-6">
              <a href="#about" onClick={() => setOpen(false)} className="text-sm font-heading font-semibold text-muted-foreground">About</a>
              <a href="#products" onClick={() => setOpen(false)} className="text-sm font-heading font-semibold text-muted-foreground">Products</a>
              <a href="#how-it-works" onClick={() => setOpen(false)} className="text-sm font-heading font-semibold text-muted-foreground">How it works</a>
              <a href="#partners" onClick={() => setOpen(false)} className="text-sm font-heading font-semibold text-muted-foreground">Partners</a>
              <div className="flex flex-col gap-2 pt-2">
                <Link to="/login" onClick={() => setOpen(false)}>
                  <Button size="sm" className="w-full rounded-full gradient-blue text-primary-foreground font-heading font-bold">Dealer Login</Button>
                </Link>
                <Link to="/become-a-dealer" onClick={() => setOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full rounded-full border-foreground/15 text-foreground font-heading font-semibold">Become a Dealer</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
