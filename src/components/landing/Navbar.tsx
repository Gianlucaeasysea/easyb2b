import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/easysea-logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Easysea" className="h-8" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</a>
          <a href="#products" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Products</a>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          <a href="#partners" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Partners</a>
          <Link to="/login">
            <Button size="sm" className="rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold">
              Dealer Login
            </Button>
          </Link>
          <Link to="/become-a-dealer">
            <Button variant="outline" size="sm" className="rounded-lg border-foreground/20 text-foreground hover:bg-foreground/10 font-heading font-semibold">
              Become a Dealer
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
            className="md:hidden bg-background border-t border-border"
          >
            <div className="flex flex-col gap-3 p-4">
              <a href="#about" onClick={() => setOpen(false)} className="text-sm text-muted-foreground">About</a>
              <a href="#products" onClick={() => setOpen(false)} className="text-sm text-muted-foreground">Products</a>
              <a href="#how-it-works" onClick={() => setOpen(false)} className="text-sm text-muted-foreground">How it works</a>
              <a href="#partners" onClick={() => setOpen(false)} className="text-sm text-muted-foreground">Partners</a>
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full rounded-lg bg-foreground text-background font-heading font-semibold">Dealer Login</Button>
              </Link>
              <Link to="/become-a-dealer" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full rounded-lg border-foreground/20 text-foreground font-heading font-semibold">Become a Dealer</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
