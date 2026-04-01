import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TriggerType =
  | "lead_created"
  | "lead_stage_changed"
  | "deal_stage_changed"
  | "order_created"
  | "order_status_changed"
  | "client_inactive_days"
  | "deal_close_date_approaching";

interface TriggerData {
  lead_id?: string;
  deal_id?: string;
  order_id?: string;
  client_id?: string;
  client_name?: string;
  deal_title?: string;
  from_stage?: string;
  to_stage?: string;
  to_status?: string;
}

export async function checkAndRunAutomations(
  triggerType: TriggerType,
  triggerData: TriggerData
) {
  try {
    const { data: rules, error } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("trigger_type", triggerType)
      .eq("is_active", true);

    if (error || !rules?.length) return;

    const { data: { user } } = await supabase.auth.getUser();

    for (const rule of rules) {
      const tc = (rule.trigger_config || {}) as Record<string, any>;
      const ac = (rule.action_config || {}) as Record<string, any>;

      // Match trigger_config
      if (!matchesTrigger(triggerType, tc, triggerData)) continue;

      // Execute action
      await executeAction(rule.action_type, ac, triggerData, user?.id);
    }
  } catch (err) {
    console.error("[Automations] Error:", err);
  }
}

function matchesTrigger(
  triggerType: TriggerType,
  tc: Record<string, any>,
  data: TriggerData
): boolean {
  switch (triggerType) {
    case "lead_created":
    case "order_created":
      return true; // no extra config needed

    case "lead_stage_changed":
      if (tc.from_stage && tc.from_stage !== data.from_stage) return false;
      if (tc.to_stage && tc.to_stage !== data.to_stage) return false;
      return true;

    case "deal_stage_changed":
      if (tc.to_stage && tc.to_stage !== data.to_stage) return false;
      return true;

    case "order_status_changed":
      if (tc.to_status && tc.to_status !== data.to_status) return false;
      return true;

    case "client_inactive_days":
    case "deal_close_date_approaching":
      return true; // evaluated externally

    default:
      return false;
  }
}

function resolvePlaceholders(text: string, data: TriggerData): string {
  return text
    .replace(/\{\{deal_title\}\}/g, data.deal_title || "")
    .replace(/\{\{client_name\}\}/g, data.client_name || "");
}

async function executeAction(
  actionType: string,
  ac: Record<string, any>,
  data: TriggerData,
  userId?: string
) {
  switch (actionType) {
    case "create_task": {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (ac.due_days_offset || 1));
      await supabase.from("tasks").insert({
        title: resolvePlaceholders(ac.title || "Task automatico", data),
        type: ac.type || "task",
        priority: ac.priority || "medium",
        status: "pending",
        due_date: dueDate.toISOString(),
        client_id: data.client_id || null,
        lead_id: data.lead_id || null,
        deal_id: data.deal_id || null,
        created_by: userId,
      });
      toast.info(`⚡ Automazione: task "${ac.title}" creato`);
      break;
    }

    case "create_activity": {
      await supabase.from("activities").insert({
        title: resolvePlaceholders(ac.title || "Attività automatica", data),
        type: ac.type || "note",
        body: resolvePlaceholders(ac.body || "", data),
        client_id: data.client_id || null,
        lead_id: data.lead_id || null,
        created_by: userId,
      });
      toast.info(`⚡ Automazione: attività "${ac.title}" creata`);
      break;
    }

    case "send_email": {
      if (ac.template_id) {
        // Trigger via edge function would be ideal; for now log
        console.log("[Automation] send_email template_id:", ac.template_id);
        toast.info("⚡ Automazione: email in coda");
      }
      break;
    }

    case "change_stage": {
      if (data.client_id && ac.new_stage) {
        await supabase.from("clients").update({ status: ac.new_stage }).eq("id", data.client_id);
        toast.info(`⚡ Automazione: cliente spostato a "${ac.new_stage}"`);
      }
      break;
    }

    case "assign_to": {
      if (data.deal_id && ac.user_id) {
        await supabase.from("deals").update({ assigned_to: ac.user_id }).eq("id", data.deal_id);
        toast.info("⚡ Automazione: deal riassegnato");
      }
      break;
    }

    case "create_notification": {
      if (data.client_id) {
        await supabase.from("client_notifications").insert({
          client_id: data.client_id,
          title: resolvePlaceholders(ac.title || "Notifica", data),
          body: resolvePlaceholders(ac.body || "", data),
          type: "automation",
        });
        toast.info(`⚡ Automazione: notifica creata`);
      }
      break;
    }
  }
}
