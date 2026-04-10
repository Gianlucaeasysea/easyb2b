import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Plus, Check } from "lucide-react";
import { useState } from "react";
import { isPast } from "date-fns";
import { fmtDate } from "./constants";

interface OrganizationTasksTabProps {
  tasks: any[];
  onAddTask: (form: { title: string; type: string; priority: string; due_date: string; description: string }) => Promise<void>;
  onCompleteTask: (id: string) => Promise<void>;
}

export function OrganizationTasksTab({ tasks, onAddTask, onCompleteTask }: OrganizationTasksTabProps) {
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", type: "call", priority: "medium", due_date: "", description: "" });

  const handleAdd = async () => {
    if (!taskForm.title.trim()) return;
    try {
      await onAddTask(taskForm);
      setAddTaskOpen(false);
      setTaskForm({ title: "", type: "call", priority: "medium", due_date: "", description: "" });
    } catch { /* handled in hook */ }
  };

  return (
    <>
      <div className="glass-card-solid p-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><CheckSquare size={16} /> Task</h3>
          <Button size="sm" onClick={() => setAddTaskOpen(true)} className="gap-1"><Plus size={14} /> New Task</Button>
        </div>
        {!tasks?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No linked tasks</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t: any) => {
              const isOverdue = t.status === "pending" && t.due_date && isPast(new Date(t.due_date));
              return (
                <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg bg-secondary/50 ${isOverdue ? "border-l-2 border-l-destructive" : ""} ${t.status === "completed" ? "opacity-50" : ""}`}>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${t.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                    <div className="flex gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{t.type || "task"}</Badge>
                      <Badge className={`text-[10px] border-0 ${t.priority === "high" || t.priority === "urgent" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"}`}>{t.priority}</Badge>
                      {t.due_date && <span className={`text-[10px] ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>{fmtDate(t.due_date)}</span>}
                    </div>
                  </div>
                  {t.status !== "completed" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-success" onClick={() => onCompleteTask(t.id)}>
                      <Check size={14} />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-heading">New Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Title *</Label>
              <Input className="bg-secondary border-border" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Type</Label>
                <Select value={taskForm.type} onValueChange={v => setTaskForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Priorità</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Scadenza</Label>
              <Input type="datetime-local" className="bg-secondary border-border" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Descrizione</Label>
              <Textarea className="bg-secondary border-border min-h-[60px]" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <Button disabled={!taskForm.title.trim()} className="w-full" onClick={handleAdd}>Create Task</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
