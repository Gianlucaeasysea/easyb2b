import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, LogIn } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In futuro: Supabase Auth login
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/5 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-secondary/10 translate-y-1/2 -translate-x-1/2" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md px-4 relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft size={16} /> Torna alla home
        </Link>

        <div className="glass-card-solid p-8">
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-extrabold text-primary mb-2">EASYSEA</h1>
            <p className="text-muted-foreground">Accedi al tuo portale B2B</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required className="rounded-lg" placeholder="nome@azienda.it" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Password</Label>
                <a href="#" className="text-xs text-primary hover:underline">Hai dimenticato la password?</a>
              </div>
              <Input type="password" required className="rounded-lg" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <Button type="submit" size="lg" className="w-full rounded-lg gradient-ocean border-0 text-primary-foreground font-heading font-bold py-6">
              <LogIn size={18} className="mr-2" /> Accedi
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            L'accesso è riservato ai distributori autorizzati.<br />
            <Link to="/diventa-distributore" className="text-primary hover:underline">Richiedi l'accesso</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
