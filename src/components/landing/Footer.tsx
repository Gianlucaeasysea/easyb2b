import { Link } from "react-router-dom";
import { Mail, Globe, MapPin } from "lucide-react";
import logo from "@/assets/easysea-logo.png";

const Footer = () => (
  <footer className="border-t border-border py-16 bg-background">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-4 gap-10 mb-14">
        <div>
          <img src={logo} alt="Easysea" className="h-6 mb-5 opacity-80" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Italian innovative company designing beautiful and innovative nautical accessories. Worldwide distribution.
          </p>
        </div>
        <div>
          <h4 className="font-heading text-[11px] font-bold text-foreground mb-5 uppercase tracking-[0.2em]">Quick Links</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><a href="#about" className="hover:text-foreground transition-colors">About</a></li>
            <li><a href="#products" className="hover:text-foreground transition-colors">Products</a></li>
            <li><Link to="/become-a-dealer" className="hover:text-foreground transition-colors">Become a Dealer</Link></li>
            <li><Link to="/login" className="hover:text-foreground transition-colors">Dealer Login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading text-[11px] font-bold text-foreground mb-5 uppercase tracking-[0.2em]">Contact</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2.5"><Mail size={13} className="text-primary" /> business@easysea.org</li>
            <li className="flex items-center gap-2.5">
              <Globe size={13} className="text-primary" />
              <a href="https://easysea.org" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">easysea.org</a>
            </li>
            <li className="flex items-start gap-2.5"><MapPin size={13} className="mt-0.5 flex-shrink-0 text-primary" /> Via Per Curnasco 52, 24127 Bergamo (BG), Italia</li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading text-[11px] font-bold text-foreground mb-5 uppercase tracking-[0.2em]">Legal</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service" className="hover:text-foreground transition-colors">Terms & Conditions</Link></li>
            <li><Link to="/cookie-policy" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="section-divider mb-6" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Easysea Srl — Italian Innovative Company. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-4">
          <span>P.IVA IT15126351004</span>
          <span className="hidden md:inline text-border">·</span>
          <span>Capitale Sociale € 13.781,28</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
