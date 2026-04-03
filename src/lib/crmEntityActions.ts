import { supabase } from "@/integrations/supabase/client";

type InvokePayload = {
  action: "convert_request_to_pipeline" | "delete_clients" | "delete_leads";
  requestId?: string;
  ids?: string[];
};

const invokeCrmEntityAction = async <T>(payload: InvokePayload): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("crm-entity-actions", {
    body: payload,
  });

  if (error) {
    const response = (error as { context?: Response }).context;

    if (response instanceof Response) {
      try {
        const body = await response.json();
        throw new Error(body?.error || body?.message || error.message);
      } catch {
        throw new Error(error.message);
      }
    }

    throw new Error(error.message);
  }

  return data as T;
};

export const convertRequestToPipeline = async (requestId: string) => {
  return invokeCrmEntityAction<{
    success: true;
    clientId: string;
    leadId: string;
    requestId: string;
  }>({ action: "convert_request_to_pipeline", requestId });
};

export const deleteClientsCascade = async (ids: string[]) => {
  return invokeCrmEntityAction<{ success: true; deletedIds: string[] }>({
    action: "delete_clients",
    ids,
  });
};

export const deleteLeadsCascade = async (ids: string[]) => {
  return invokeCrmEntityAction<{ success: true; deletedIds: string[] }>({
    action: "delete_leads",
    ids,
  });
};