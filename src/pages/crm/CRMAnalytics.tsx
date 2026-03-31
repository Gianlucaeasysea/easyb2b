import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Users, Target, Euro, ShoppingBag, PieChart, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart as RPieChart, Pie, Cell, Tooltip, Legend
} from "recharts";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CRMAnalytics = () => {
  const [period, setPeriod] = useState("6");
  const monthsBack = parseInt(period);

  // Fetch orders
  const { data: orders } = useQuery({
    queryKey: ["analytics-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id, created_at, total_amount, status, client_id, payed_date, delivery_date").order("created_at", { ascending: true });
      return data || [];
    },
  });

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["analytics-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, company_name, status, total_orders_value, total_orders_count, last_order_date, created_at, zone, days_since_last_order");
      return data || [];
    },
  });

  // Fetch deals
  const { data: deals } = useQuery({
    queryKey: ["analytics-deals"],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("id, stage, value, created_at, expected_close_date, probability");
      return data || [];
    },
  });

  // Fetch leads
  const { data: leads } = useQuery({
    queryKey: ["analytics-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id, status, created_at, source");
      return data || [];
    },
  });

  // Monthly revenue data
  const monthlyRevenue = useMemo(() => {
    if (!orders) return [];
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), monthsBack - 1), end: now });
    return months.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const monthOrders = orders.filter(o => {
        const d = new Date(o.created_at);
        return d >= start && d <= end && o.status !== "cancelled";
      });
      const revenue = monthOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
      const paid = orders.filter(o => {
        if (!o.payed_date) return false;
        const d = new Date(o.payed_date);
        return d >= start && d <= end;
      }).reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
      return {
        month: format(m, "MMM yy", { locale: it }),
        ordinato: Math.round(revenue),
        incassato: Math.round(paid),
        ordini: monthOrders.length,
      };
    });
  }, [orders, monthsBack]);

  // Pipeline funnel
  const pipelineFunnel = useMemo(() => {
    if (!deals) return [];
    const stages = [
      { key: "qualification", label: "Qualificazione", color: "hsl(var(--chart-1))" },
      { key: "proposal", label: "Proposta", color: "hsl(var(--chart-2))" },
      { key: "negotiation", label: "Negoziazione", color: "hsl(var(--chart-3))" },
      { key: "closed_won", label: "Vinto", color: "hsl(var(--chart-4))" },
      { key: "closed_lost", label: "Perso", color: "hsl(var(--destructive))" },
    ];
    return stages.map(s => ({
      ...s,
      count: deals.filter(d => d.stage === s.key).length,
      value: deals.filter(d => d.stage === s.key).reduce((sum, d) => sum + (Number(d.value) || 0), 0),
    }));
  }, [deals]);

  // Client status distribution
  const clientDistribution = useMemo(() => {
    if (!clients) return [];
    const statuses: Record<string, { label: string; color: string }> = {
      lead: { label: "Lead", color: "hsl(var(--chart-1))" },
      prospect: { label: "Prospect", color: "hsl(var(--chart-2))" },
      onboarding: { label: "Onboarding", color: "hsl(var(--chart-3))" },
      active: { label: "Attivo", color: "hsl(var(--chart-4))" },
      at_risk: { label: "A Rischio", color: "hsl(var(--warning))" },
      churned: { label: "Perso", color: "hsl(var(--destructive))" },
    };
    return Object.entries(statuses).map(([key, cfg]) => ({
      name: cfg.label,
      value: clients.filter(c => c.status === key).length,
      color: cfg.color,
    })).filter(d => d.value > 0);
  }, [clients]);

  // Lead sources
  const leadSources = useMemo(() => {
    if (!leads) return [];
    const sources: Record<string, number> = {};
    leads.forEach(l => {
      const src = l.source || "Altro";
      sources[src] = (sources[src] || 0) + 1;
    });
    return Object.entries(sources).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [leads]);

  // Forecasting — weighted pipeline
  const forecastData = useMemo(() => {
    if (!deals) return { weighted: 0, bestCase: 0, count: 0 };
    const open = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage));
    const weighted = open.reduce((s, d) => s + (Number(d.value) || 0) * ((d.probability || 20) / 100), 0);
    const bestCase = open.reduce((s, d) => s + (Number(d.value) || 0), 0);
    return { weighted: Math.round(weighted), bestCase: Math.round(bestCase), count: open.length };
  }, [deals]);

  // Top clients
  const topClients = useMemo(() => {
    if (!clients) return [];
    return [...clients].sort((a, b) => (Number(b.total_orders_value) || 0) - (Number(a.total_orders_value) || 0)).slice(0, 8);
  }, [clients]);

  // KPIs
  const totalRevenue = orders?.filter(o => o.status !== "cancelled").reduce((s, o) => s + (Number(o.total_amount) || 0), 0) || 0;
  const activeClients = clients?.filter(c => c.status === "active").length || 0;
  const totalDealsValue = deals?.filter(d => d.stage === "closed_won").reduce((s, d) => s + (Number(d.value) || 0), 0) || 0;
  const conversionRate = leads?.length ? Math.round((leads.filter(l => l.status === "converted").length / leads.length) * 100) : 0;

  // Month-over-month growth
  const lastMonthRev = monthlyRevenue.length >= 2 ? monthlyRevenue[monthlyRevenue.length - 2]?.ordinato || 0 : 0;
  const thisMonthRev = monthlyRevenue.length >= 1 ? monthlyRevenue[monthlyRevenue.length - 1]?.ordinato || 0 : 0;
  const growthPct = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : 0;

  const revenueConfig = {
    ordinato: { label: "Ordinato", color: "hsl(var(--chart-1))" },
    incassato: { label: "Incassato", color: "hsl(var(--chart-4))" },
  };

  const ordersConfig = {
    ordini: { label: "Ordini", color: "hsl(var(--chart-2))" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <BarChart3 size={24} /> Analytics & Forecasting
          </h1>
          <p className="text-muted-foreground text-sm">Panoramica performance commerciale e previsioni</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Ultimi 3 mesi</SelectItem>
            <SelectItem value="6">Ultimi 6 mesi</SelectItem>
            <SelectItem value="12">Ultimo anno</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Fatturato Totale</p>
                <p className="text-2xl font-bold font-heading mt-1">€{totalRevenue.toLocaleString("it-IT")}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm ${growthPct >= 0 ? "text-chart-4" : "text-destructive"}`}>
                {growthPct >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {Math.abs(growthPct)}%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Clienti Attivi</p>
                <p className="text-2xl font-bold font-heading mt-1">{activeClients}</p>
              </div>
              <Users className="text-muted-foreground" size={20} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Deals Chiusi (Vinti)</p>
                <p className="text-2xl font-bold font-heading mt-1">€{totalDealsValue.toLocaleString("it-IT")}</p>
              </div>
              <Target className="text-muted-foreground" size={20} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Conversione Lead</p>
                <p className="text-2xl font-bold font-heading mt-1">{conversionRate}%</p>
              </div>
              <TrendingUp className="text-muted-foreground" size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Fatturato</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="clients">Clienti</TabsTrigger>
          <TabsTrigger value="forecast">Previsioni</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Andamento Fatturato</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={revenueConfig} className="h-[320px] w-full">
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="ordinato" fill="var(--color-ordinato)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="incassato" fill="var(--color-incassato)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Volume Ordini</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={ordersConfig} className="h-[320px] w-full">
                  <AreaChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="ordini" fill="var(--color-ordini)" fillOpacity={0.3} stroke="var(--color-ordini)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funnel Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pipelineFunnel.map((stage, i) => {
                    const maxCount = Math.max(...pipelineFunnel.map(s => s.count), 1);
                    const pct = (stage.count / maxCount) * 100;
                    return (
                      <div key={stage.key} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{stage.label}</span>
                          <span className="text-muted-foreground">{stage.count} deals · €{stage.value.toLocaleString("it-IT")}</span>
                        </div>
                        <div className="h-6 bg-muted rounded-md overflow-hidden">
                          <div className="h-full rounded-md transition-all" style={{ width: `${pct}%`, backgroundColor: stage.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sorgenti Lead</CardTitle>
              </CardHeader>
              <CardContent>
                {leadSources.length > 0 ? (
                  <div className="space-y-3">
                    {leadSources.map((src, i) => (
                      <div key={src.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(var(--chart-${(i % 5) + 1}))` }} />
                          <span className="text-sm">{src.name}</span>
                        </div>
                        <span className="text-sm font-medium">{src.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Nessun lead registrato</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuzione Clienti per Status</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                {clientDistribution.length > 0 ? (
                  <ChartContainer config={{}} className="h-[300px] w-full max-w-[400px]">
                    <RPieChart>
                      <Pie data={clientDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                        {clientDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RPieChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground py-8">Nessun dato</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 8 Clienti per Fatturato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topClients.map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}.</span>
                        <span className="text-sm font-medium truncate max-w-[180px]">{c.company_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold">€{(Number(c.total_orders_value) || 0).toLocaleString("it-IT")}</span>
                        <span className="text-xs text-muted-foreground ml-2">({c.total_orders_count || 0} ordini)</span>
                      </div>
                    </div>
                  ))}
                  {topClients.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nessun dato</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-chart-1/30 bg-chart-1/5">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Pipeline Aperta</p>
                <p className="text-3xl font-bold font-heading">€{forecastData.bestCase.toLocaleString("it-IT")}</p>
                <p className="text-xs text-muted-foreground mt-1">{forecastData.count} deal attivi</p>
              </CardContent>
            </Card>
            <Card className="border-chart-4/30 bg-chart-4/5">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Forecast Ponderato</p>
                <p className="text-3xl font-bold font-heading text-chart-4">€{forecastData.weighted.toLocaleString("it-IT")}</p>
                <p className="text-xs text-muted-foreground mt-1">basato su probabilità deal</p>
              </CardContent>
            </Card>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Trend MoM</p>
                <p className={`text-3xl font-bold font-heading ${growthPct >= 0 ? "text-chart-4" : "text-destructive"}`}>
                  {growthPct >= 0 ? "+" : ""}{growthPct}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">variazione mese corrente</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue trend with forecast line */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trend Ricavi e Proiezione</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={revenueConfig} className="h-[320px] w-full">
                <LineChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="ordinato" stroke="var(--color-ordinato)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="incassato" stroke="var(--color-incassato)" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Clients at risk */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">⚠️ Clienti a Rischio Churn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {clients?.filter(c => c.status === "active" && (c.days_since_last_order || 0) > 60).sort((a, b) => (b.days_since_last_order || 0) - (a.days_since_last_order || 0)).slice(0, 6).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm font-medium">{c.company_name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Ultimo ordine: {c.last_order_date || "mai"}</span>
                      <span className="text-sm font-bold text-destructive">{c.days_since_last_order || "∞"} giorni</span>
                    </div>
                  </div>
                ))}
                {(!clients || clients.filter(c => c.status === "active" && (c.days_since_last_order || 0) > 60).length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nessun cliente a rischio 🎉</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRMAnalytics;
