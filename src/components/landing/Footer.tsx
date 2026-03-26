import { Link } from "react-router-dom";
import { Mail, Globe, MapPin } from "lucide-react";
import logo from "@/assets/easysea-logo.png";

const Footer = () => (
  <footer className="border-t border-border py-16 bg-background">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-4 gap-10 mb-12">
        <div>
          <img src={logo} alt="Easysea" className="h-7 mb-4" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Italian innovative company designing beautiful and innovative nautical accessories. Worldwide distribution.
          </p>
        </div>
        <div>
          <h4 className="font-heading text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#about" className="hover:text-foreground transition-colors">About</a></li>
            <li><a href="#products" className="hover:text-foreground transition-colors">Products</a></li>
            <li><Link to="/become-a-dealer" className="hover:text-foreground transition-colors">Become a Dealer</Link></li>
            <li><Link to="/login" className="hover:text-foreground transition-colors">Dealer Login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Contact</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Mail size={14} /> b2b@easysea.org</li>
            <li className="flex items-center gap-2"><Globe size={14} /> easysea.org</li>
            <li className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 flex-shrink-0" /> Via Per Curnasco 52, 24127 Bergamo (BG), Italia</li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service" className="hover:text-foreground transition-colors">Termini e Condizioni</Link></li>
            <li><Link to="/cookie-policy" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border pt-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Easysea Srl — Italian Innovative Company. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span>P.IVA IT15126351004</span>
            <span className="hidden md:inline">·</span>
            <span>Capitale Sociale € 13.781,28</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
