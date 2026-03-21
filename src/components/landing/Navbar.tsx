import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/20">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="font-heading text-2xl font-extrabold text-primary tracking-tight">
          EASYSEA
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#chi-siamo" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">Chi siamo</a>
          <a href="#prodotti" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">Prodotti</a>
          <a href="#come-funziona" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">Come funziona</a>
          <a href="#testimonianze" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">Testimonianze</a>
          <Link to="/login">
            <Button size="sm" className="rounded-lg">Accedi al portale</Button>
          </Link>
          <Link to="/diventa-distributore">
            <Button variant="outline" size="sm" className="rounded-lg border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Diventa distributore
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-card border-t border-white/20"
          >
            <div className="flex flex-col gap-3 p-4">
              <a href="#chi-siamo" onClick={() => setOpen(false)} className="text-sm font-medium text-foreground/80">Chi siamo</a>
              <a href="#prodotti" onClick={() => setOpen(false)} className="text-sm font-medium text-foreground/80">Prodotti</a>
              <a href="#come-funziona" onClick={() => setOpen(false)} className="text-sm font-medium text-foreground/80">Come funziona</a>
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full rounded-lg">Accedi al portale</Button>
              </Link>
              <Link to="/diventa-distributore" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full rounded-lg border-primary text-primary">Diventa distributore</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
