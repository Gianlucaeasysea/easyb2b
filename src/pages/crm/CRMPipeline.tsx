import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, format, isValid } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";

const safeFormat = (d: string | null | undefined, fmt: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isValid(dt) ? format(dt, fmt) : "—";
};

const stages = ["lead", "qualifying", "onboarding", "active", "at_risk"];
const stageLabels: Record<string, string> = {
  lead: "Lead", qualifying: "Qualifying", onboarding: "Onboarding",
  active: "Active", at_risk: "At Risk",
};
const stageColors: Record<string, string> = {
  lead: "border-t-primary bg-primary/5",
  qualifying: "border-t-warning bg-warning/5",
  onboarding: "border-t-chart-4 bg-chart-4/5",
  active: "border-t-success bg-success/5",
  at_risk: "border-t-destructive bg-destructive/5",
};
const cardAccents: Record<string, string> = {
  lead: "border-l-primary", qualifying: "border-l-warning", onboarding: "border-l-chart-4",
  active: "border-l-success", at_risk: "border-l-destructive",
};

const CRMPipeline = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: clients } = useQuery({
    queryKey: ["crm-pipeline-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, contact_name, status, status_changed_at, last_order_date, days_since_last_order, zone")
        .in("status", stages)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: lastActivities } = useQuery({
    queryKey: ["crm-pipeline-last-activities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("client_id, created_at, title")
        .not("client_id", "is", null)
        .order("created_at", { ascending: false });
      const map: Record<string, { created_at: string; title: string }> = {};
      data?.forEach(a => {
        if (a.client_id && !map[a.client_id]) {
          map[a.client_id] = { created_at: a.created_at, title: a.title };
        }
      });
      return map;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("clients").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-pipeline-clients"] });
    },
  });

  const grouped = stages.reduce((acc, s) => {
    acc[s] = clients?.filter((c: any) => c.status === s) || [];
    return acc;
  }, {} as Record<string, any[]>);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStage = result.destination.droppableId;
    const clientId = result.draggableId;
    const client = clients?.find((c: any) => c.id === clientId);
    if (!client || client.status === newStage) return;

    queryClient.setQueryData(["crm-pipeline-clients"], (old: any) =>
      old?.map((c: any) => (c.id === clientId ? { ...c, status: newStage } : c))
    );

    updateStatus.mutate(
      { id: clientId, status: newStage },
      {
        onError: () => {
          queryClient.invalidateQueries({ queryKey: ["crm-pipeline-clients"] });
          toast({ title: "Error moving client", variant: "destructive" });
        },
        onSuccess: () => {
          toast({ title: `Moved to ${stageLabels[newStage]}` });
        },
      }
    );
  };

  const getDaysInStage = (client: any) => {
    if (!client.status_changed_at) return null;
    return differenceInDays(new Date(), new Date(client.status_changed_at));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Client Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Drag and drop organizations between lifecycle stages
        </p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 flex-1">
          {stages.map((stage) => (
            <div key={stage} className="flex flex-col">
              <div className={`rounded-t-lg border-t-2 px-3 py-2 ${stageColors[stage]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold text-foreground uppercase tracking-wider">
                    {stageLabels[stage]}
                  </span>
                  <span className="text-xs font-mono bg-background/60 rounded-full px-2 py-0.5 text-muted-foreground">
                    {grouped[stage]?.length || 0}
                  </span>
                </div>
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
                    {grouped[stage]?.map((client: any, index: number) => {
                      const daysInStage = getDaysInStage(client);
                      const lastAct = lastActivities?.[client.id];
                      return (
                        <Draggable key={client.id} draggableId={client.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => navigate(`/crm/organizations/${client.id}`)}
                              className={`glass-card-solid p-3 border-l-2 ${cardAccents[stage]} cursor-pointer hover:shadow-md transition-all ${
                                snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30 rotate-1" : ""
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Building2 size={10} className="text-muted-foreground shrink-0" />
                                <p className="text-xs font-heading font-semibold text-foreground truncate">
                                  {client.company_name}
                                </p>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {client.contact_name || "—"}
                              </p>
                              
                              {daysInStage !== null && (
                                <p className="text-[10px] text-muted-foreground/70 mt-1">
                                  ⏱ {daysInStage}d in stage
                                </p>
                              )}

                              {stage === "active" && client.last_order_date && (
                                <p className="text-[10px] text-success mt-0.5 truncate">
                                  🛒 Last order: {safeFormat(client.last_order_date, "dd/MM")} ({client.days_since_last_order || 0}d ago)
                                </p>
                              )}

                              {stage === "at_risk" && (
                                <p className="text-[10px] text-destructive font-semibold mt-0.5">
                                  ⚠ {client.days_since_last_order || "?"}d inactive
                                </p>
                              )}

                              {lastAct && (
                                <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5">
                                  📌 {lastAct.title}
                                </p>
                              )}
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
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default CRMPipeline;
