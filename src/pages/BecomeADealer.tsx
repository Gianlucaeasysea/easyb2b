import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const regionCountries: Record<string, string[]> = {
  europe: [
    "Albania", "Andorra", "Austria", "Belgium", "Bosnia and Herzegovina", "Bulgaria",
    "Croatia", "Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", "France",
    "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy", "Kosovo", "Latvia",
    "Lithuania", "Luxembourg", "Malta", "Moldova", "Monaco", "Montenegro",
    "Netherlands", "North Macedonia", "Norway", "Poland", "Portugal", "Romania",
    "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland",
    "Turkey", "Ukraine", "United Kingdom",
  ],
  "north-america": [
    "Canada", "Mexico", "United States", "Bahamas", "Barbados", "Belize",
    "Costa Rica", "Cuba", "Dominican Republic", "El Salvador", "Guatemala",
    "Haiti", "Honduras", "Jamaica", "Nicaragua", "Panama", "Trinidad and Tobago",
  ],
  "south-america": [
    "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador",
    "Guyana", "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela",
  ],
  "asia-pacific": [
    "Bangladesh", "Cambodia", "China", "Hong Kong", "India", "Indonesia", "Japan",
    "Laos", "Malaysia", "Mongolia", "Myanmar", "Nepal", "North Korea", "Pakistan",
    "Philippines", "Singapore", "South Korea", "Sri Lanka", "Taiwan", "Thailand",
    "Vietnam",
  ],
  "middle-east-africa": [
    "Algeria", "Bahrain", "Egypt", "Ethiopia", "Ghana", "Iran", "Iraq", "Israel",
    "Jordan", "Kenya", "Kuwait", "Lebanon", "Libya", "Morocco", "Nigeria", "Oman",
    "Qatar", "Saudi Arabia", "Senegal", "South Africa", "Sudan", "Syria",
    "Tanzania", "Tunisia", "Uganda", "United Arab Emirates", "Yemen",
  ],
  oceania: [
    "Australia", "Fiji", "New Zealand", "Papua New Guinea", "Samoa", "Tonga", "Vanuatu",
  ],
};

const BecomeADealer = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    companyName: "", contactName: "", email: "", phone: "",
    zone: "", country: "", businessType: "", website: "", message: "", privacy: false, vatNumber: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Normalize website
    let website = form.website.trim();
    if (website && !website.startsWith("http://") && !website.startsWith("https://")) {
      website = `https://${website}`;
    }

    const { data, error } = await supabase.from("distributor_requests").insert({
      company_name: form.companyName,
      contact_name: form.contactName,
      email: form.email,
      phone: form.phone,
      zone: form.zone,
      country: (form as any).country || null,
      business_type: form.businessType,
      website: website || null,
      message: form.message || null,
      vat_number: (form as any).vatNumber || null,
    } as any).select().single();

    if (error) {
      setLoading(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Send notification emails
    try {
      await supabase.functions.invoke("send-dealer-request-notification", {
        body: {
          requestId: data.id,
          companyName: form.companyName,
          contactName: form.contactName,
          email: form.email,
          phone: form.phone,
          zone: form.zone,
          country: form.country,
          businessType: form.businessType,
          website: website || null,
          message: form.message || null,
          vatNumber: form.vatNumber || null,
        },
      });
    } catch (emailErr) {
      console.error("Notification email failed:", emailErr);
    }

    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-background pt-16">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card-solid p-12 text-center max-w-md">
            <CheckCircle className="mx-auto text-success mb-6" size={56} />
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Application Received!</h2>
            <p className="text-muted-foreground mb-8 text-sm">We'll review your application and get back to you within 2 business days.</p>
            <Link to="/">
              <Button className="rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold">Back to Home</Button>
            </Link>
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft size={16} /> Back to Home
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs uppercase tracking-[0.3em] text-primary font-heading font-semibold mb-3">Dealer Application</p>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">Become a Dealer</h1>
            <p className="text-muted-foreground mb-10 text-sm">Join our worldwide network of nautical dealers and retailers.</p>

            <form onSubmit={handleSubmit} className="glass-card-solid p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Company Name *</Label>
                  <Input required className="rounded-lg bg-secondary border-border" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Person *</Label>
                  <Input required className="rounded-lg bg-secondary border-border" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business Email *</Label>
                  <Input type="email" required className="rounded-lg bg-secondary border-border" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone *</Label>
                  <Input type="tel" required className="rounded-lg bg-secondary border-border" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Region *</Label>
                  <Select required onValueChange={v => setForm(f => ({ ...f, zone: v }))}>
                    <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="europe">Europe</SelectItem>
                      <SelectItem value="north-america">North America</SelectItem>
                      <SelectItem value="south-america">South America</SelectItem>
                      <SelectItem value="asia-pacific">Asia Pacific</SelectItem>
                      <SelectItem value="middle-east-africa">Middle East & Africa</SelectItem>
                      <SelectItem value="oceania">Oceania</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Country *</Label>
                  <Input required className="rounded-lg bg-secondary border-border" placeholder="e.g. Italy" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business Type *</Label>
                  <Select required onValueChange={v => setForm(f => ({ ...f, businessType: v }))}>
                    <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chandlery">Chandlery / Marine Store</SelectItem>
                      <SelectItem value="marina">Marina</SelectItem>
                      <SelectItem value="boatyard">Boatyard / Shipyard</SelectItem>
                      <SelectItem value="online">Online Retailer</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">VAT ID (optional)</Label>
                  <Input className="rounded-lg bg-secondary border-border" placeholder="e.g. IT12345678901" value={form.vatNumber} onChange={e => setForm(f => ({ ...f, vatNumber: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Website</Label>
                <Input type="text" className="rounded-lg bg-secondary border-border" placeholder="www.example.com" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Message</Label>
                <Textarea className="rounded-lg bg-secondary border-border min-h-[100px]" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              </div>

              <div className="flex items-start gap-3">
                <Checkbox id="privacy" required checked={form.privacy} onCheckedChange={c => setForm(f => ({ ...f, privacy: !!c }))} />
                <Label htmlFor="privacy" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                  I agree to the Privacy Policy and Terms of Service *
                </Label>
              </div>

              <Button type="submit" size="lg" disabled={loading} className="w-full rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-bold py-6">
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default BecomeADealer;
