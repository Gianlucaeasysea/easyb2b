import { Phone } from "lucide-react";

const CRMContacts = () => (
  <div>
    <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Contacts</h1>
    <p className="text-sm text-muted-foreground mb-8">All business contacts from leads and clients</p>
    <div className="text-center py-20 glass-card-solid">
      <Phone className="mx-auto text-muted-foreground mb-4" size={48} />
      <p className="text-muted-foreground">Contacts will populate from leads and client data.</p>
    </div>
  </div>
);

export default CRMContacts;
