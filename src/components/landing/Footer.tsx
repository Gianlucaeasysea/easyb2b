import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => (
  <footer className="bg-foreground text-primary-foreground/70 py-16">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-4 gap-10 mb-12">
        <div>
          <h3 className="font-heading text-2xl font-extrabold text-primary-foreground mb-4">EASYSEA</h3>
          <p className="text-sm leading-relaxed">Il tuo partner B2B di fiducia nel settore nautico. Qualità, affidabilità e innovazione.</p>
        </div>
        <div>
          <h4 className="font-heading font-bold text-primary-foreground mb-4">Link utili</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#chi-siamo" className="hover:text-primary-foreground transition-colors">Chi siamo</a></li>
            <li><a href="#prodotti" className="hover:text-primary-foreground transition-colors">Prodotti</a></li>
            <li><Link to="/diventa-distributore" className="hover:text-primary-foreground transition-colors">Diventa distributore</Link></li>
            <li><Link to="/login" className="hover:text-primary-foreground transition-colors">Accedi</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-bold text-primary-foreground mb-4">Contatti</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2"><Mail size={14} /> info@easysea.it</li>
            <li className="flex items-center gap-2"><Phone size={14} /> +39 02 1234567</li>
            <li className="flex items-center gap-2"><MapPin size={14} /> Milano, Italia</li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-bold text-primary-foreground mb-4">Legale</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-primary-foreground transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-primary-foreground transition-colors">Termini di servizio</a></li>
            <li><a href="#" className="hover:text-primary-foreground transition-colors">Cookie Policy</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 pt-6 text-center text-xs">
        &copy; {new Date().getFullYear()} Easysea. Tutti i diritti riservati.
      </div>
    </div>
  </footer>
);

export default Footer;
