import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkAndRunAutomations } from "@/hooks/useAutomations";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { format, isValid } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft, Calendar, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useRef } from "react";
import { CRMOrderDetailModal } from "@/components/crm/CRMOrderDetailModal";

const stages = ["qualification", "proposal", "negotiation", "closed_won", "closed_lost"];

const stageConfig: Record<string, { label: string; borderColor: string; bgColor: string }> = {
  qualification: { label: "Qualification", borderColor: "border-t-primary", bgColor: "bg-primary/5" },
  proposal: { label: "Proposal", borderColor: "border-t-warning", bgColor: "bg-warning/5" },
  negotiation: { label: "Negotiation", borderColor: "border-t-chart-4", bgColor: "bg-chart-4/5" },
  closed_won: { label: "Won", borderColor: "border-t-success", bgColor: "bg-success/5" },
  closed_lost: { label: "Lost", borderColor: "border-t-destructive", bgColor: "bg-destructive/5" },
};

const cardAccents: Record<string, string> = {
  qualification: "border-l-primary", proposal: "border-l-warning", negotiation: "border-l-chart-4",
  closed_won: "border-l-success", closed_lost: "border-l-destructive",
};

const stageProbMap: Record<string, number> = {
  qualification: 20, proposal: 50, negotiation: 75, closed_won: 100, closed_lost: 0,
};

const fmtCurrency = (v: number | null) =>
  `€${(v || 0).toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "";
  const dt = new Date(d);
  return isValid(dt) ? format(dt, "dd/MM") : "";
};

/* ── Animated counter badge ────────────────────────────── */
const AnimatedCount = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    const from = prev.current;
    const diff = value - from;
    const steps = Math.min(Math.abs(diff), 12);
    const duration = 300;
    const stepTime = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setDisplay(Math.round(from + (diff * step) / steps));
      if (step >= steps) clearInterval(timer);
    }, stepTime);
    prev.current = value;
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.span
      key={value}
      initial={{ scale: 1.3, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="text-xs font-mono bg-background/60 rounded-full px-2 py-0.5 text-muted-foreground inline-block"
    >
      {display}
    </motion.span>
  );
};

const CRMDealsPipeline = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [orderModalId, setOrderModalId] = useState<string | null>(null);

  const { data: deals } = useQuery({
    queryKey: ["crm-deals-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, clients:client_id(id, company_name), contact:contact_id(contact_name), order:order_id(id, order_code)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  /* ── Realtime subscription ───────────────────────────── */
  const highlightDeal = useCallback((id: string) => {
    setHighlightedIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setHighlightedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2000);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("deals-pipeline-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deals" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["crm-deals-pipeline"] });
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const id = (payload.new as { id: string }).id;
            highlightDeal(id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient, highlightDeal]);

  const updateStage = async (id: string, stage: string) => {
    const updates = {
      stage,
      probability: stageProbMap[stage] ?? 20,
      closed_at: (stage === "closed_won" || stage === "closed_lost") ? new Date().toISOString() : undefined,
    };
    const { error } = await supabase.from("deals").update(updates).eq("id", id);
    if (error) {
      queryClient.invalidateQueries({ queryKey: ["crm-deals-pipeline"] });
      toast({ title: "Errore nello spostamento", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["crm-deals-pipeline"] });
    const deal = deals?.find(d => d.id === id);
    if (deal) {
      checkAndRunAutomations("deal_stage_changed", {
        deal_id: id, to_stage: stage, deal_title: deal.title, client_id: deal.client_id || undefined,
      });
    }
    toast({ title: `Spostato in ${stageConfig[stage]?.label}` });
  };

  const grouped = stages.reduce((acc, s) => {
    acc[s] = deals?.filter(d => d.stage === s) || [];
    return acc;
  }, {} as Record<string, typeof deals extends (infer U)[] | undefined ? U[] : never[]>);

  const onDragEnd = (result: DropResult) => {
    setIsDragging(false);
    if (!result.destination) return;
    const newStage = result.destination.droppableId;
    const dealId = result.draggableId;
    const deal = deals?.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    // Optimistic update
    queryClient.setQueryData(["crm-deals-pipeline"], (old: typeof deals) =>
      old?.map(d => d.id === dealId ? { ...d, stage: newStage, probability: stageProbMap[newStage] ?? d.probability } : d)
    );

    highlightDeal(dealId);
    updateStage(dealId, newStage);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Deals Pipeline</h1>
          <p className="text-sm text-muted-foreground">Drag and drop deals between stages</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/crm/deals")} className="gap-1">
          <ArrowLeft size={14} /> Lista Deals
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd} onDragStart={() => setIsDragging(true)}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 flex-1">
          {stages.map(stage => {
            const sc = stageConfig[stage];
            const stageDeals = grouped[stage] || [];
            const totalValue = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
            return (
              <div key={stage} className="flex flex-col">
                <div className={`rounded-t-lg border-t-2 px-3 py-2 ${sc.borderColor} ${sc.bgColor}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading font-bold text-foreground uppercase tracking-wider">
                      {sc.label}
                    </span>
                    <AnimatedCount value={stageDeals.length} />
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{fmtCurrency(totalValue)}</p>
                </div>

                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 p-2 rounded-b-lg border border-t-0 border-border/50 min-h-[200px] transition-colors ${
                        snapshot.isDraggingOver ? "bg-primary/10" : "bg-card/30"
                      }`}
                    >
                      <AnimatePresence mode="popLayout">
                        {stageDeals.map((deal, index) => {
                          const org = deal.clients;
                          const contact = deal.contact;
                          const isHighlighted = highlightedIds.has(deal.id);
                          return (
                            <Draggable key={deal.id} draggableId={deal.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                >
                                  <motion.div
                                    layout={!isDragging}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{
                                      opacity: 1,
                                      y: 0,
                                      scale: 1,
                                      boxShadow: isHighlighted
                                        ? "0 0 16px 4px hsl(var(--success) / 0.35)"
                                        : "0 0 0 0 transparent",
                                    }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                    onClick={() => {
                                      if (deal.source === "order" && (deal as any).order?.id) {
                                        navigate(`/admin/orders/${(deal as any).order.id}`);
                                      } else {
                                        navigate("/crm/deals");
                                      }
                                    }}
                                    className={`glass-card-solid p-3 border-l-2 ${cardAccents[stage]} cursor-pointer hover:shadow-md transition-colors ${
                                      dragSnapshot.isDragging ? "shadow-lg ring-2 ring-primary/30 rotate-1" : ""
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-heading font-semibold text-foreground truncate flex-1">
                                        {deal.title}
                                      </p>
                                      {deal.source === "order" && (
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 gap-0.5 border-primary/30 text-primary">
                                          <ShoppingBag size={8} /> Da ordine
                                        </Badge>
                                      )}
                                    </div>
                                    {org && (
                                      <button
                                        className="text-[10px] text-primary truncate flex items-center gap-1 mt-0.5 hover:underline"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/crm/organizations/${org.id}`); }}
                                      >
                                        <Building2 size={8} /> {org.company_name}
                                      </button>
                                    )}
                                    {contact && (
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {contact.contact_name}
                                      </p>
                                    )}
                                    <div className="flex items-center justify-between mt-1.5">
                                      <span className="text-xs font-mono font-bold text-foreground">{fmtCurrency(deal.value)}</span>
                                      {deal.expected_close_date && (
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                          <Calendar size={8} /> {fmtDate(deal.expected_close_date)}
                                        </span>
                                      )}
                                    </div>
                                  </motion.div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                      </AnimatePresence>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default CRMDealsPipeline;
