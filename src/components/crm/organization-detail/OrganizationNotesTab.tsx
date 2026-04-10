import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "lucide-react";
import { useState } from "react";
import { fmtDate } from "./constants";

interface OrganizationNotesTabProps {
  notes: string | null;
  activities: any[];
  onSaveNotes: (notes: string) => Promise<void>;
}

export function OrganizationNotesTab({ notes, activities, onSaveNotes }: OrganizationNotesTabProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveNotes(value);
      setEditing(false);
    } catch { /* handled in hook */ }
    finally { setSaving(false); }
  };

  return (
    <div className="glass-card-solid p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><StickyNote size={16} /> Note Azienda</h3>
        {!editing ? (
          <Button size="sm" variant="ghost" onClick={() => { setEditing(true); setValue(notes || ""); }}>
            {notes ? "Edit" : "Add"}
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Annulla</Button>
            <Button size="sm" disabled={saving} onClick={handleSave}>
              {saving ? "..." : "Save"}
            </Button>
          </div>
        )}
      </div>
      {editing ? (
        <Textarea value={value} onChange={e => setValue(e.target.value)} placeholder="Write company notes..." className="text-sm min-h-[150px] resize-none" />
      ) : notes ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
      ) : (
        <p className="text-xs text-muted-foreground italic">No notes.</p>
      )}

      {/* Note activities (type = note) */}
      <div className="mt-6">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-heading mb-3">Sales Team Notes</h4>
        {(() => {
          const noteActs = activities?.filter((a: any) => a.type === "note") || [];
          if (!noteActs.length) return <p className="text-xs text-muted-foreground italic">No notes from the team.</p>;
          return (
            <div className="space-y-2">
              {noteActs.map((a: any) => (
                <div key={a.id} className="p-3 bg-secondary/50 rounded-lg">
                  <div className="flex justify-between mb-1">
                    <p className="text-sm font-semibold">{a.title}</p>
                    <span className="text-[10px] text-muted-foreground">{fmtDate(a.created_at)}</span>
                  </div>
                  {a.body && <p className="text-xs text-muted-foreground">{a.body}</p>}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
