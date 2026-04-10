import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send } from "lucide-react";
import { getClientStatusColor, getClientStatusLabel } from "@/lib/constants";
import type { Tables } from "@/integrations/supabase/types";

interface OrganizationHeaderProps {
  client: Tables<"clients">;
  onBack: () => void;
  onCompose: () => void;
}

export function OrganizationHeader({ client, onBack, onCompose }: OrganizationHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        <ArrowLeft size={16} />
      </Button>
      <div className="flex-1">
        <h1 className="font-heading text-2xl font-bold text-foreground">{client.company_name}</h1>
        <p className="text-sm text-muted-foreground">
          {client.contact_name && `${client.contact_name} · `}
          {client.country || ""} {client.zone ? `· ${client.zone}` : ""}
        </p>
      </div>
      <Badge className={`border-0 ${getClientStatusColor(client.status || "lead")}`}>
        {getClientStatusLabel(client.status || "lead")}
      </Badge>
      {client.email && (
        <Button size="sm" onClick={onCompose} className="gap-1">
          <Send size={14} /> Email
        </Button>
      )}
    </div>
  );
}
