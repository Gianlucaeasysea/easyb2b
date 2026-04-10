import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  featureName: string;
}

export function ComingSoon({ featureName }: Props) {
  const navigate = useNavigate();

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-primary/10 rounded-full p-6">
        <Clock className="h-10 w-10 text-primary" />
      </div>
      <div>
        <h2 className="font-heading font-bold text-2xl text-foreground mb-2">
          {featureName}
        </h2>
        <p className="text-muted-foreground max-w-sm">
          Questa sezione è in preparazione e sarà disponibile a breve.
        </p>
      </div>
      <Button variant="outline" onClick={() => navigate("/portal")}>
        Torna alla dashboard
      </Button>
    </motion.div>
  );
}
