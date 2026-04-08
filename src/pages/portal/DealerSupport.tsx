import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HelpCircle, Mail, Phone, Clock, FileText, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const faqItems = [
  { q: "How do I place a B2B order?", a: "Browse the Product Catalog, click 'Add to Order' for items you want, then review and submit from the Orders page." },
  { q: "What is my discount class?", a: "Your discount class (A-D) determines your pricing tier. View your current tier on the Dashboard or Goals page. Place more orders to unlock higher tiers." },
  { q: "How do I track my shipment?", a: "Go to My Orders, expand the shipped order, and click 'Track shipment' to follow your package in real-time." },
  { q: "Can I modify an order after submitting?", a: "Orders in 'Draft' status can be modified. Once confirmed, contact your account manager for any changes." },
  { q: "What are the payment terms?", a: "Standard payment terms are Net 30. Premium tier dealers (Class A/B) may qualify for extended terms. Contact your account manager for details." },
  { q: "How do promotions work?", a: "Active promotions are shown in the Promotions page. Some require a promo code at checkout, while others are applied automatically based on your tier." },
];

const DealerSupport = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Support</h1>
        <p className="text-sm text-muted-foreground">Need help? We're here for you.</p>
      </div>

      {/* Contact Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card-solid p-5">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center mb-3">
            <Mail className="text-primary-foreground" size={18} />
          </div>
          <h3 className="font-heading font-semibold text-foreground text-sm mb-1">Email Support</h3>
          <p className="text-xs text-muted-foreground mb-3">Typically responds within 24h</p>
          <a href="mailto:b2b@easysea.org" className="text-sm text-primary hover:underline">b2b@easysea.org</a>
        </div>

        <div className="glass-card-solid p-5">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center mb-3">
            <MessageCircle className="text-primary-foreground" size={18} />
          </div>
          <h3 className="font-heading font-semibold text-foreground text-sm mb-1">WhatsApp</h3>
          <p className="text-xs text-muted-foreground mb-3">Quick questions & order updates</p>
          <a href="https://wa.me/390212345678" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">+39 02 1234 5678</a>
        </div>

        <div className="glass-card-solid p-5">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center mb-3">
            <Clock className="text-primary-foreground" size={18} />
          </div>
          <h3 className="font-heading font-semibold text-foreground text-sm mb-1">Business Hours</h3>
          <p className="text-xs text-muted-foreground mb-3">When we're available</p>
          <p className="text-sm text-foreground">Mon-Fri, 9:00 – 18:00 CET</p>
        </div>
      </div>

      {/* Account Info */}
      <div className="glass-card-solid p-6 mb-8">
        <h2 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <FileText size={18} /> Your Account Details
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Company</p>
            <p className="text-sm font-semibold text-foreground">{profile?.company_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Contact</p>
            <p className="text-sm font-semibold text-foreground">{profile?.contact_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
            <p className="text-sm text-foreground">{profile?.email || user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Region</p>
            <p className="text-sm text-foreground">{profile?.zone || "—"} {profile?.country ? `(${profile.country})` : ""}</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <h2 className="font-heading text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Frequently Asked Questions</h2>
      <div className="space-y-3">
        {faqItems.map((item, i) => (
          <details key={i} className="glass-card-solid group">
            <summary className="p-4 cursor-pointer flex items-center justify-between list-none">
              <span className="font-heading font-semibold text-sm text-foreground">{item.q}</span>
              <HelpCircle size={16} className="text-muted-foreground group-open:text-primary transition-colors flex-shrink-0 ml-2" />
            </summary>
            <div className="px-4 pb-4 -mt-1">
              <p className="text-sm text-muted-foreground">{item.a}</p>
            </div>
          </details>
        ))}
      </div>

      {/* Resources */}
      <div className="mt-8 glass-card-solid p-5">
        <h3 className="font-heading font-semibold text-foreground text-sm mb-3">Useful Resources</h3>
        <div className="flex flex-wrap gap-2">
          <a href="https://easysea.org" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="text-xs gap-1 rounded-lg">
              Product Website <ExternalLink size={12} />
            </Button>
          </a>
          <Button variant="outline" size="sm" className="text-xs gap-1 rounded-lg">
            Download Price List <FileText size={12} />
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1 rounded-lg">
            Marketing Materials <FileText size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DealerSupport;
