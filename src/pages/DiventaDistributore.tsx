import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const DiventaDistributore = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    companyName: "", contactName: "", email: "", phone: "",
    zone: "", businessType: "", website: "", message: "", privacy: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In futuro: salva in Supabase distributor_requests
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-background pt-16">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card-solid p-12 text-center max-w-md">
            <CheckCircle className="mx-auto text-success mb-6" size={64} />
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Richiesta ricevuta!</h2>
            <p className="text-muted-foreground mb-8">Ti contatteremo entro 2 giorni lavorativi per valutare la partnership.</p>
            <Link to="/">
              <Button className="rounded-lg gradient-ocean border-0 text-primary-foreground">Torna alla home</Button>
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
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
            <ArrowLeft size={16} /> Torna alla home
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">Diventa distributore</h1>
            <p className="text-muted-foreground mb-10">Compila il form per richiedere l'accesso alla nostra rete di distribuzione B2B.</p>

            <form onSubmit={handleSubmit} className="glass-card-solid p-8 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ragione Sociale *</Label>
                  <Input required className="rounded-lg" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Nome e Cognome referente *</Label>
                  <Input required className="rounded-lg" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email aziendale *</Label>
                  <Input type="email" required className="rounded-lg" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Telefono *</Label>
                  <Input type="tel" required className="rounded-lg" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Zona geografica *</Label>
                  <Select required onValueChange={v => setForm(f => ({ ...f, zone: v }))}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nord">Nord Italia</SelectItem>
                      <SelectItem value="centro">Centro Italia</SelectItem>
                      <SelectItem value="sud">Sud e Isole</SelectItem>
                      <SelectItem value="europa">Europa</SelectItem>
                      <SelectItem value="altro">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipologia attività *</Label>
                  <Select required onValueChange={v => setForm(f => ({ ...f, businessType: v }))}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="negozio">Negozio specializzato</SelectItem>
                      <SelectItem value="marina">Marina</SelectItem>
                      <SelectItem value="cantiere">Cantiere navale</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="altro">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sito web</Label>
                <Input type="url" className="rounded-lg" placeholder="https://" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Messaggio / note aggiuntive</Label>
                <Textarea className="rounded-lg min-h-[100px]" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              </div>

              <div className="flex items-start gap-3">
                <Checkbox id="privacy" required checked={form.privacy} onCheckedChange={c => setForm(f => ({ ...f, privacy: !!c }))} />
                <Label htmlFor="privacy" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                  Accetto la privacy policy e i termini di servizio *
                </Label>
              </div>

              <Button type="submit" size="lg" className="w-full rounded-lg gradient-ocean border-0 text-primary-foreground font-heading font-bold py-6">
                Invia richiesta
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default DiventaDistributore;
