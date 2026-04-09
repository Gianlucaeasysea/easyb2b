import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import OrderDetailsTable from "@/components/crm/OrderDetailsTable";
import { BarChart3, TrendingUp, Users, Target, Euro, Clock, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, eachMonthOfInterval, differenceInDays } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, PieChart as RPieChart, Pie, Cell, Tooltip, Legend
} from "recharts";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const ACTIVITY_COLORS: Record<string, string> = {
  call: "hsl(var(--chart-1))",
  email: "hsl(var(--chart-4))",
  meeting: "hsl(var(--chart-3))",
  note: "hsl(var(--muted-foreground))",
};

const ACTIVITY_LABELS: Record<string, string> = {
  call: "Chiamate",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
};

const CRMAnalytics = () => {
  const navigate = useNavigate();
  const [periodKey, setPeriodKey] = useState("30d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  // Compute date range from period key
  const { rangeStart, rangeEnd, prevStart, prevEnd } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = now;

    switch (periodKey) {
      case "7d": start = subDays(now, 7); break;
      case "30d": start = subDays(now, 30); break;
      case "90d": start = subDays(now, 90); break;
      case "year": start = startOfYear(now); break;
      case "custom":
        start = customFrom || subDays(now, 30);
        end = customTo || now;
        break;
      default: start = subDays(now, 30);
    }

    const duration = end.getTime() - start.getTime();
    const prevEnd2 = new Date(start.getTime() - 1);
    const prevStart2 = new Date(prevEnd2.getTime() - duration);

    return { rangeStart: start, rangeEnd: end, prevStart: prevStart2, prevEnd: prevEnd2 };
  }, [periodKey, customFrom, customTo]);

  // Fetch all data
  const { data: orders } = useQuery({
    queryKey: ["analytics-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id, created_at, total_amount, status, client_id, payed_date, delivery_date, payment_status").order("created_at", { ascending: true });
      return data || [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["analytics-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, company_name, status, total_orders_value, total_orders_count, last_order_date, days_since_last_order");
      return data || [];
    },
  });

  const { data: deals } = useQuery({
    queryKey: ["analytics-deals"],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("id, stage, value, created_at, closed_at, expected_close_date, probability, client_id");
      return data || [];
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["analytics-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id, status, created_at, source");
      return data || [];
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["analytics-activities"],
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("id, type, created_at");
      return data || [];
    },
  });

  const inRange = (dateStr: string | null, start: Date, end: Date) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d <= end;
  };

  // ── KPI 1: Revenue chiuso (delivered/completed in period)
  const revenueChiuso = useMemo(() => {
    if (!orders) return { current: 0, prev: 0 };
    const delivered = ["delivered", "completed"];
    const current = orders.filter(o => delivered.includes(o.status || "") && inRange(o.created_at, rangeStart, rangeEnd)).reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const prev = orders.filter(o => delivered.includes(o.status || "") && inRange(o.created_at, prevStart, prevEnd)).reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    return { current, prev };
  }, [orders, rangeStart, rangeEnd, prevStart, prevEnd]);

  // ── KPI 2: Revenue pipeline (weighted)
  const revenuePipeline = useMemo(() => {
    if (!deals) return 0;
    return deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage)).reduce((s, d) => s + (Number(d.value) || 0) * ((d.probability || 20) / 100), 0);
  }, [deals]);

  // ── KPI 3: Nuovi lead
  const newLeads = useMemo(() => {
    if (!leads) return { current: 0, prev: 0 };
    const current = leads.filter(l => inRange(l.created_at, rangeStart, rangeEnd)).length;
    const prev = leads.filter(l => inRange(l.created_at, prevStart, prevEnd)).length;
    return { current, prev };
  }, [leads, rangeStart, rangeEnd, prevStart, prevEnd]);

  // ── KPI 4: Conversion rate (last 90 days)
  const conversionRate = useMemo(() => {
    if (!leads) return 0;
    const recent = leads.filter(l => inRange(l.created_at, subDays(new Date(), 90), new Date()));
    if (!recent.length) return 0;
    return Math.round((recent.filter(l => l.status === "won" || l.status === "converted").length / recent.length) * 100);
  }, [leads]);

  // ── KPI 5: Deal size medio (closed_won in period)
  const avgDealSize = useMemo(() => {
    if (!deals) return 0;
    const won = deals.filter(d => d.stage === "closed_won" && inRange(d.closed_at, rangeStart, rangeEnd));
    if (!won.length) return 0;
    return Math.round(won.reduce((s, d) => s + (Number(d.value) || 0), 0) / won.length);
  }, [deals, rangeStart, rangeEnd]);

  // ── KPI 6: Ciclo di vendita medio (days created→closed for closed_won)
  const avgSalesCycle = useMemo(() => {
    if (!deals) return 0;
    const won = deals.filter(d => d.stage === "closed_won" && d.closed_at && inRange(d.closed_at, rangeStart, rangeEnd));
    if (!won.length) return 0;
    const totalDays = won.reduce((s, d) => s + differenceInDays(new Date(d.closed_at!), new Date(d.created_at!)), 0);
    return Math.round(totalDays / won.length);
  }, [deals, rangeStart, rangeEnd]);

  const pctChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  // ── Chart 1: Revenue trend (line, 6 months, 2 lines)
  const revenueTrend = useMemo(() => {
    if (!orders || !deals) return [];
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: now });
    return months.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const rev = orders.filter(o => ["delivered", "completed"].includes(o.status || "") && inRange(o.created_at, start, end))
        .reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
      const pipe = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage) && inRange(d.created_at, start, end))
        .reduce((s, d) => s + (Number(d.value) || 0) * ((d.probability || 20) / 100), 0);
      return { month: format(m, "MMM yy"), revenue: Math.round(rev), pipeline: Math.round(pipe) };
    });
  }, [orders, deals]);

  // ── Chart 2: Pipeline funnel
  const pipelineFunnel = useMemo(() => {
    if (!deals) return [];
    const stages = [
      { key: "qualification", label: "Qualificazione", color: "hsl(var(--chart-1))" },
      { key: "proposal", label: "Proposta", color: "hsl(var(--chart-2))" },
      { key: "negotiation", label: "Negoziazione", color: "hsl(var(--chart-3))" },
      { key: "closed_won", label: "Vinto", color: "hsl(var(--chart-4))" },
    ];
    return stages.map(s => ({
      ...s,
      count: deals.filter(d => d.stage === s.key).length,
      value: deals.filter(d => d.stage === s.key).reduce((sum, d) => sum + (Number(d.value) || 0), 0),
    }));
  }, [deals]);

  // ── Chart 3: Deals won vs lost per month
  const wonVsLost = useMemo(() => {
    if (!deals) return [];
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: now });
    return months.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const won = deals.filter(d => d.stage === "closed_won" && inRange(d.closed_at, start, end)).length;
      const lost = deals.filter(d => d.stage === "closed_lost" && inRange(d.closed_at, start, end)).length;
      return { month: format(m, "MMM yy"), won, lost };
    });
  }, [deals]);

  // ── Chart 4: Top 5 organizzazioni per revenue
  const topOrgs = useMemo(() => {
    if (!clients) return [];
    return [...clients]
      .sort((a, b) => (Number(b.total_orders_value) || 0) - (Number(a.total_orders_value) || 0))
      .slice(0, 5)
      .map(c => ({ id: c.id, name: c.company_name, value: Number(c.total_orders_value) || 0 }));
  }, [clients]);

  // ── Chart 5: Attività per tipo
  const activityByType = useMemo(() => {
    if (!activities) return [];
    const counts: Record<string, number> = {};
    activities.filter(a => inRange(a.created_at, rangeStart, rangeEnd)).forEach(a => {
      const t = a.type || "note";
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: ACTIVITY_LABELS[type] || type,
      value: count,
      color: ACTIVITY_COLORS[type] || "hsl(var(--chart-5))",
    }));
  }, [activities, rangeStart, rangeEnd]);

  // ── Churn risk
  const churnRisk = useMemo(() => {
    if (!clients) return [];
    return clients.filter(c => c.status === "active" && (c.days_since_last_order || 0) > 60)
      .sort((a, b) => (b.days_since_last_order || 0) - (a.days_since_last_order || 0)).slice(0, 6);
  }, [clients]);

  const revGrowth = pctChange(revenueChiuso.current, revenueChiuso.prev);
  const leadGrowth = pctChange(newLeads.current, newLeads.prev);

  const revenueConfig = {
    revenue: { label: "Revenue Ordini", color: "hsl(var(--chart-1))" },
    pipeline: { label: "Pipeline Pesato", color: "hsl(var(--chart-3))" },
  };

  const wonLostConfig = {
    won: { label: "Vinti", color: "hsl(var(--chart-4))" },
    lost: { label: "Persi", color: "hsl(var(--destructive))" },
  };

  return (
    <div className="space-y-6">
      {/* Header + Period Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <BarChart3 size={24} /> Analytics & Forecasting
          </h1>
          <p className="text-muted-foreground text-sm">Panoramica performance commerciale e previsioni</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodKey} onValueChange={setPeriodKey}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Ultimi 7 giorni</SelectItem>
              <SelectItem value="30d">Ultimi 30 giorni</SelectItem>
              <SelectItem value="90d">Ultimi 90 giorni</SelectItem>
              <SelectItem value="year">Quest'anno</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          {periodKey === "custom" && (
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[130px] text-xs", !customFrom && "text-muted-foreground")}>
                    <Calendar className="mr-1 h-3 w-3" />
                    {customFrom ? format(customFrom, "dd/MM/yyyy") : "Da"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={customFrom} onSelect={setCustomFrom} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[130px] text-xs", !customTo && "text-muted-foreground")}>
                    <Calendar className="mr-1 h-3 w-3" />
                    {customTo ? format(customTo, "dd/MM/yyyy") : "A"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={customTo} onSelect={setCustomTo} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Revenue chiuso */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenue Chiuso</p>
            <p className="text-xl font-bold font-heading mt-1">€{Math.round(revenueChiuso.current).toLocaleString("en-US")}</p>
            <div className={`flex items-center gap-0.5 text-xs mt-1 ${revGrowth >= 0 ? "text-chart-4" : "text-destructive"}`}>
              {revGrowth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(revGrowth)}%
            </div>
          </CardContent>
        </Card>
        {/* 2. Revenue pipeline */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenue Pipeline</p>
            <p className="text-xl font-bold font-heading mt-1">€{Math.round(revenuePipeline).toLocaleString("en-US")}</p>
            <p className="text-[10px] text-muted-foreground mt-1">ponderato per probabilità</p>
          </CardContent>
        </Card>
        {/* 3. Nuovi lead */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nuovi Lead</p>
            <p className="text-xl font-bold font-heading mt-1">{newLeads.current}</p>
            <div className={`flex items-center gap-0.5 text-xs mt-1 ${leadGrowth >= 0 ? "text-chart-4" : "text-destructive"}`}>
              {leadGrowth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(leadGrowth)}%
            </div>
          </CardContent>
        </Card>
        {/* 4. Conversion rate */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversion Rate</p>
            <p className="text-xl font-bold font-heading mt-1">{conversionRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">ultimi 90 giorni</p>
          </CardContent>
        </Card>
        {/* 5. Deal size medio */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Deal Size Medio</p>
            <p className="text-xl font-bold font-heading mt-1">€{avgDealSize.toLocaleString("en-US")}</p>
            <p className="text-[10px] text-muted-foreground mt-1">closed_won nel periodo</p>
          </CardContent>
        </Card>
        {/* 6. Ciclo di vendita */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ciclo di Vendita</p>
            <p className="text-xl font-bold font-heading mt-1">{avgSalesCycle} <span className="text-sm font-normal">gg</span></p>
            <p className="text-[10px] text-muted-foreground mt-1">media giorni</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Trend (ultimi 6 mesi)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueConfig} className="h-[300px] w-full">
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="pipeline" stroke="var(--color-pipeline)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                <Legend />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipelineFunnel.map((stage) => {
                const maxCount = Math.max(...pipelineFunnel.map(s => s.count), 1);
                const pct = (stage.count / maxCount) * 100;
                return (
                  <div key={stage.key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{stage.label}</span>
                      <span className="text-muted-foreground">{stage.count} deals · €{stage.value.toLocaleString("en-US")}</span>
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

        {/* Deals Won vs Lost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Deals Vinti vs Persi (6 mesi)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={wonLostConfig} className="h-[260px] w-full">
              <BarChart data={wonVsLost}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="won" fill="var(--color-won)" radius={[4, 4, 0, 0]} label={{ position: "top", className: "text-[10px] fill-foreground" }} />
                <Bar dataKey="lost" fill="var(--color-lost)" radius={[4, 4, 0, 0]} label={{ position: "top", className: "text-[10px] fill-foreground" }} />
                <Legend />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top 5 Organizzazioni */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 5 Organizzazioni per Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[260px] w-full">
              <BarChart data={topOrgs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis type="number" className="text-xs" tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" className="text-xs" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `€${v.toLocaleString("en-US")}`} />
                <Bar
                  dataKey="value"
                  fill="hsl(var(--chart-2))"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(data: any) => {
                    if (data?.id) navigate(`/crm/organizations/${data.id}`);
                  }}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Attività per Tipo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attività per Tipo</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {activityByType.length > 0 ? (
              <ChartContainer config={{}} className="h-[260px] w-full max-w-[360px]">
                <RPieChart>
                  <Pie
                    data={activityByType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={95}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {activityByType.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RPieChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8">Nessuna attività nel periodo</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Churn Risk */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">⚠️ Clienti a Rischio Churn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {churnRisk.map(c => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-sm font-medium cursor-pointer hover:text-primary" onClick={() => navigate(`/crm/organizations/${c.id}`)}>{c.company_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Ultimo ordine: {c.last_order_date || "mai"}</span>
                  <span className="text-sm font-bold text-destructive">{c.days_since_last_order || "∞"} giorni</span>
                </div>
              </div>
            ))}
            {churnRisk.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nessun cliente a rischio 🎉</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Order Details Table */}
      <OrderDetailsTable title="Dettaglio Ordini (Live Sync)" />
    </div>
  );
};

export default CRMAnalytics;
