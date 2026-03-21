import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import LeadDetailPanel from "@/components/crm/LeadDetailPanel";

const stages = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const stageLabels: Record<string, string> = {
  new: "New", contacted: "Contacted", qualified: "Qualified",
  proposal: "Proposal", won: "Won", lost: "Lost",
};
const stageColors: Record<string, string> = {
  new: "border-t-primary bg-primary/5",
  contacted: "border-t-warning bg-warning/5",
  qualified: "border-t-success bg-success/5",
  proposal: "border-t-accent bg-accent/5",
  won: "border-t-success bg-success/10",
  lost: "border-t-destructive bg-destructive/5",
};
const cardAccents: Record<string, string> = {
  new: "border-l-primary", contacted: "border-l-warning", qualified: "border-l-success",
  proposal: "border-l-accent", won: "border-l-success", lost: "border-l-destructive",
};

const CRMPipeline = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const { data: leads } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    },
  });

  const grouped = stages.reduce((acc, s) => {
    acc[s] = leads?.filter((l) => l.status === s) || [];
    return acc;
  }, {} as Record<string, typeof leads>);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStage = result.destination.droppableId;
    const leadId = result.draggableId;
    const lead = leads?.find((l) => l.id === leadId);
    if (!lead || lead.status === newStage) return;

    // Optimistic update
    queryClient.setQueryData(["crm-leads"], (old: any) =>
      old?.map((l: any) => (l.id === leadId ? { ...l, status: newStage } : l))
    );

    updateStatus.mutate(
      { id: leadId, status: newStage },
      {
        onError: () => {
          queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
          toast({ title: "Error moving lead", variant: "destructive" });
        },
        onSuccess: () => {
          toast({ title: `Moved to ${stageLabels[newStage]}` });
        },
      }
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Drag and drop leads between stages • Click a card for full details
        </p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 flex-1">
          {stages.map((stage) => (
            <div key={stage} className="flex flex-col">
              {/* Stage header */}
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

              {/* Droppable area */}
              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-2 p-2 rounded-b-lg border border-t-0 border-border/50 min-h-[200px] transition-colors ${
                      snapshot.isDraggingOver ? "bg-primary/10" : "bg-card/30"
                    }`}
                  >
                    {grouped[stage]?.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setSelectedLead(lead)}
                            className={`glass-card-solid p-3 border-l-2 ${cardAccents[stage]} cursor-pointer hover:shadow-md transition-all ${
                              snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30 rotate-1" : ""
                            }`}
                          >
                            <p className="text-xs font-heading font-semibold text-foreground truncate">
                              {lead.company_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {lead.contact_name}
                            </p>
                            {lead.zone && (
                              <p className="text-[10px] text-muted-foreground/60 truncate mt-1">
                                📍 {lead.zone}
                              </p>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Lead detail panel */}
      <LeadDetailPanel
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
};

export default CRMPipeline;
