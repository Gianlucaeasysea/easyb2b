import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isValid, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft, Calendar } from "lucide-react";

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

const CRMDealsPipeline = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: deals } = useQuery({
    queryKey: ["crm-deals-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, clients:client_id(id, company_name), contact:contact_id(contact_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const updates: any = { stage, probability: stageProbMap[stage] ?? 20 };
      if (stage === "closed_won" || stage === "closed_lost") {
        updates.closed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("deals").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals-pipeline"] });
    },
  });

  const grouped = stages.reduce((acc, s) => {
    acc[s] = deals?.filter(d => d.stage === s) || [];
    return acc;
  }, {} as Record<string, any[]>);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStage = result.destination.droppableId;
    const dealId = result.draggableId;
    const deal = deals?.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    // Optimistic update
    queryClient.setQueryData(["crm-deals-pipeline"], (old: any) =>
      old?.map((d: any) => d.id === dealId ? { ...d, stage: newStage, probability: stageProbMap[newStage] ?? d.probability } : d)
    );

    updateStage.mutate(
      { id: dealId, stage: newStage },
      {
        onError: () => {
          queryClient.invalidateQueries({ queryKey: ["crm-deals-pipeline"] });
          toast({ title: "Errore nello spostamento", variant: "destructive" });
        },
        onSuccess: () => {
          toast({ title: `Spostato in ${stageConfig[newStage]?.label}` });
        },
      }
    );
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

      <DragDropContext onDragEnd={onDragEnd}>
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
                    <span className="text-xs font-mono bg-background/60 rounded-full px-2 py-0.5 text-muted-foreground">
                      {stageDeals.length}
                    </span>
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
                      {stageDeals.map((deal: any, index: number) => {
                        const org = deal.clients;
                        const contact = deal.contact;
                        return (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => navigate("/crm/deals")}
                                className={`glass-card-solid p-3 border-l-2 ${cardAccents[stage]} cursor-pointer hover:shadow-md transition-all ${
                                  snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30 rotate-1" : ""
                                }`}
                              >
                                <p className="text-xs font-heading font-semibold text-foreground truncate">
                                  {deal.title}
                                </p>
                                {org && (
                                  <p className="text-[10px] text-primary truncate flex items-center gap-1 mt-0.5">
                                    <Building2 size={8} /> {org.company_name}
                                  </p>
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
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
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
