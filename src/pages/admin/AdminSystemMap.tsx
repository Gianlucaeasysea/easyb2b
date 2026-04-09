import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Database, Users, Package, ShoppingBag, FileText, Tag, ArrowRight,
  CheckCircle, XCircle, RefreshCw, Layers, Shield, GitBranch, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TableStats {
  name: string;
  count: number;
}

const DB_TABLES = [
  { name: "clients", icon: Users, description: "Distributor/dealer registry", key_columns: ["company_name", "email", "discount_class", "status", "user_id", "zone"] },
  { name: "products", icon: Package, description: "Product variants (from Shopify)", key_columns: ["name", "sku", "price", "stock_quantity", "active_b2b", "category"] },
  { name: "product_details", icon: Layers, description: "Product family details (descriptions, specs, lead time)", key_columns: ["product_family", "display_name", "description", "features", "specifications", "lead_time"] },
  { name: "orders", icon: ShoppingBag, description: "Dealer orders", key_columns: ["client_id", "status", "total_amount", "order_code", "payment_status"] },
  { name: "order_items", icon: ShoppingBag, description: "Order items", key_columns: ["order_id", "product_id", "quantity", "unit_price", "discount_pct"] },
  { name: "order_documents", icon: FileText, description: "Order attached documents", key_columns: ["order_id", "file_name", "doc_type"] },
  { name: "price_lists", icon: Tag, description: "Custom price lists", key_columns: ["name", "client_id", "discount_tier_id"] },
  { name: "price_list_items", icon: Tag, description: "Custom prices per product in a list", key_columns: ["price_list_id", "product_id", "custom_price"] },
  { name: "price_list_clients", icon: Tag, description: "Price list → client association", key_columns: ["price_list_id", "client_id"] },
  { name: "discount_tiers", icon: Tag, description: "Discount tiers (A/B/C/D)", key_columns: ["name", "label", "discount_pct", "sort_order"] },
  { name: "leads", icon: GitBranch, description: "CRM leads for sales team", key_columns: ["company_name", "status", "source", "assigned_to"] },
  { name: "activities", icon: Zap, description: "CRM activities (call, email, meeting)", key_columns: ["title", "type", "lead_id", "client_id", "scheduled_at"] },
  { name: "distributor_requests", icon: FileText, description: "Distributor requests (public)", key_columns: ["company_name", "email", "status"] },
  { name: "user_roles", icon: Shield, description: "User roles (admin, dealer, sales, operations)", key_columns: ["user_id", "role"] },
  { name: "profiles", icon: Users, description: "Auth user profiles", key_columns: ["user_id", "email", "company_name"] },
  { name: "client_contacts", icon: Users, description: "Additional contacts per client", key_columns: ["client_id", "contact_name", "email", "role"] },
];

const RELATIONS = [
  { from: "clients", to: "orders", label: "client_id", description: "A client has many orders" },
  { from: "orders", to: "order_items", label: "order_id", description: "An order has many items" },
  { from: "products", to: "order_items", label: "product_id", description: "A product appears in many order items" },
  { from: "orders", to: "order_documents", label: "order_id", description: "An order has many documents" },
  { from: "price_lists", to: "price_list_items", label: "price_list_id", description: "A list has many custom prices" },
  { from: "products", to: "price_list_items", label: "product_id", description: "A product has prices in multiple lists" },
  { from: "price_lists", to: "price_list_clients", label: "price_list_id", description: "A list is assigned to multiple clients" },
  { from: "clients", to: "price_list_clients", label: "client_id", description: "A client can have multiple lists" },
  { from: "discount_tiers", to: "price_lists", label: "discount_tier_id", description: "A list can have a discount tier" },
  { from: "clients", to: "client_contacts", label: "client_id", description: "A client has multiple contacts" },
  { from: "leads", to: "activities", label: "lead_id", description: "A lead has many activities" },
  { from: "clients", to: "activities", label: "client_id", description: "Activities linked to a client" },
  { from: "products", to: "product_details", label: "category ↔ product_family", description: "Varianti raggruppate per famiglia" },
];

const USER_FLOWS = [
  {
    title: "Flusso Ordine Dealer",
    steps: [
      "Dealer accede al portale (/portal)",
      "Naviga il catalogo → vede prodotti attivi (active_b2b=true)",
      "Prezzo mostrato = listino personalizzato > sconto classe > prezzo base",
      "Aggiunge al carrello (CartContext locale)",
      "Conferma ordine → INSERT in orders + order_items",
      "Admin riceve ordine con status 'draft'",
      "Admin gestisce: conferma → spedito → consegnato",
      "Documenti (fatture, DDT) caricati in order_documents",
    ],
    color: "bg-primary/10 border-primary/30",
  },
  {
    title: "Flusso Pricing",
    steps: [
      "Admin crea discount_tiers (A=-30%, B=-20%, C=-15%, D=-10%)",
      "Ogni client ha un discount_class (A/B/C/D)",
      "Admin può creare price_lists con prezzi custom per prodotto",
      "Listino assegnato a client via price_list_clients",
      "Priorità prezzo: price_list_items.custom_price > sconto % su prezzo base",
      "Dealer vede il suo prezzo finale nel catalogo",
    ],
    color: "bg-accent/10 border-accent/30",
  },
  {
    title: "Flusso CRM / Lead → Cliente",
    steps: [
      "Richiesta pubblica → distributor_requests (status: new)",
      "Admin approva → crea lead nel CRM",
      "Sales lavora il lead (activities: call/email/meeting)",
      "Lead qualificato → viene convertito in client",
      "Admin crea account dealer (edge function create-dealer-account)",
      "Dealer riceve credenziali e accede al portale",
    ],
    color: "bg-green-500/10 border-green-500/30",
  },
  {
    title: "Flusso Prodotti / Stock",
    steps: [
      "Prodotti importati da Shopify (shopify-sync edge function)",
      "Ogni variante = 1 riga in products (sku, price, stock)",
      "product_details raggruppa per famiglia (descrizione, specifiche, lead_time)",
      "Admin può modificare stock manualmente",
      "Admin può risincronizzare stock singolo da Shopify",
      "Se stock=0 → dealer vede 'Esaurito' + lead_time stimato",
    ],
    color: "bg-orange-500/10 border-orange-500/30",
  },
];

const ROLES_MAP = [
  { role: "admin", access: ["/admin/*"], permissions: "Full CRUD on everything. Users, products, orders, price lists, CRM." },
  { role: "dealer", access: ["/portal/*"], permissions: "Views own data only: catalog, orders, cart, promos, support." },
  { role: "sales", access: ["/crm/*"], permissions: "Manages leads, activities, pipeline. Views assigned clients." },
  { role: "operations", access: ["/admin/*"], permissions: "Like admin but focused on orders and logistics." },
];

const AdminSystemMap = () => {
  const [stats, setStats] = useState<TableStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStats = async () => {
    setLoading(true);
    const tables = ["clients", "products", "product_details", "orders", "order_items", "leads", "activities", "distributor_requests", "user_roles", "profiles", "price_lists", "discount_tiers", "price_list_items", "price_list_clients", "order_documents", "client_contacts"];
    const results: TableStats[] = [];

    for (const table of tables) {
      const { count } = await supabase.from(table as any).select("*", { count: "exact", head: true });
      results.push({ name: table, count: count ?? 0 });
    }

    setStats(results);
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const getCount = (name: string) => stats.find(s => s.name === name)?.count ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">System Map</h1>
          <p className="text-sm text-muted-foreground">Platform architecture, relations and flows</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString("en-US")}
          </span>
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tables">Database</TabsTrigger>
          <TabsTrigger value="relations">Relations</TabsTrigger>
          <TabsTrigger value="flows">Flows</TabsTrigger>
          <TabsTrigger value="roles">Ruoli & RLS</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Clienti", table: "clients", icon: Users },
              { label: "Prodotti", table: "products", icon: Package },
              { label: "Ordini", table: "orders", icon: ShoppingBag },
              { label: "Lead CRM", table: "leads", icon: GitBranch },
            ].map(k => (
              <Card key={k.table} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <k.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{loading ? "…" : getCount(k.table)}</p>
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Architecture diagram */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" /> Architettura Generale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Public Layer */}
                <div className="rounded-lg border border-border/50 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Layer Pubblico</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-green-500" /> Landing Page (easysea.org)</div>
                    <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-green-500" /> Form "Diventa Distributore"</div>
                    <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-green-500" /> Login / Auth</div>
                  </div>
                </div>

                {/* App Layer */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Layer Applicativo</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-primary" /> Portale Dealer (/portal)</div>
                    <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-primary" /> Pannello Admin (/admin)</div>
                    <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-primary" /> CRM Sales (/crm)</div>
                  </div>
                </div>

                {/* Backend Layer */}
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-accent uppercase tracking-wider">Layer Backend</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-accent" /> Database (16 tabelle)</div>
                    <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-accent" /> Auth + RLS Policies</div>
                    <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-accent" /> Edge Functions (3)</div>
                    <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-accent" /> Storage (2 bucket)</div>
                  </div>
                </div>
              </div>

              {/* Integrations */}
              <div className="mt-4 rounded-lg border border-border/30 p-3 flex flex-wrap gap-3">
                <Badge variant="outline" className="text-xs">Shopify → shopify-sync</Badge>
                <Badge variant="outline" className="text-xs">Google Sheets → gsheet-sync</Badge>
                <Badge variant="outline" className="text-xs">Auth → create-dealer-account</Badge>
                <Badge variant="outline" className="text-xs">Storage: videos, order-documents</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick table stats */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stato Tabelle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DB_TABLES.map(t => (
                  <div key={t.name} className="flex items-center justify-between rounded-md border border-border/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <t.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground truncate">{t.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-mono">{loading ? "…" : getCount(t.name)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DATABASE */}
        <TabsContent value="tables">
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-3">
              {DB_TABLES.map(t => (
                <Card key={t.name} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <t.icon className="h-4 w-4 text-primary" />
                        <span className="font-mono font-bold text-sm text-foreground">{t.name}</span>
                        <Badge variant="secondary" className="text-[10px]">{loading ? "…" : getCount(t.name)} righe</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{t.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {t.key_columns.map(c => (
                        <Badge key={c} variant="outline" className="text-[10px] font-mono">{c}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* RELATIONS */}
        <TabsContent value="relations">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Da</TableHead>
                    <TableHead className="text-xs">→</TableHead>
                    <TableHead className="text-xs">A</TableHead>
                    <TableHead className="text-xs">FK</TableHead>
                    <TableHead className="text-xs">Descrizione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RELATIONS.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs font-medium text-foreground">{r.from}</TableCell>
                      <TableCell><ArrowRight className="h-3 w-3 text-primary" /></TableCell>
                      <TableCell className="font-mono text-xs font-medium text-foreground">{r.to}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] font-mono">{r.label}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FLOWS */}
        <TabsContent value="flows">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {USER_FLOWS.map(flow => (
              <Card key={flow.title} className={`border ${flow.color}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{flow.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {flow.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-1 flex-shrink-0 h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{step}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ROLES */}
        <TabsContent value="roles">
          <div className="space-y-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Ruoli & Permessi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Ruolo</TableHead>
                      <TableHead className="text-xs">Route</TableHead>
                      <TableHead className="text-xs">Permessi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ROLES_MAP.map(r => (
                      <TableRow key={r.role}>
                        <TableCell>
                          <Badge className="font-mono text-xs">{r.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {r.access.map(a => (
                              <Badge key={a} variant="outline" className="text-[10px] font-mono">{a}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-md">{r.permissions}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">RLS Policy Logic</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                  <p className="text-xs font-mono text-foreground">has_role(auth.uid(), 'admin') → <span className="text-green-400">FULL ACCESS</span></p>
                  <p className="text-xs font-mono text-foreground">has_role(auth.uid(), 'dealer') → <span className="text-primary">Solo dati propri (WHERE user_id = auth.uid())</span></p>
                  <p className="text-xs font-mono text-foreground">has_role(auth.uid(), 'sales') → <span className="text-orange-400">Lead + clienti assegnati</span></p>
                  <p className="text-xs font-mono text-foreground">has_role(auth.uid(), 'operations') → <span className="text-yellow-400">Ordini + logistica</span></p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Tutte le tabelle hanno RLS abilitato. I ruoli sono in tabella separata (user_roles).</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Funzione SECURITY DEFINER has_role() previene ricorsione RLS.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSystemMap;
