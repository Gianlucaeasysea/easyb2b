import { supabase } from "@/integrations/supabase/client";
import { convertDealerRequestToPipeline } from "@/lib/crmRequestPipeline";

type InvokePayload = {
  action: "convert_request_to_pipeline" | "delete_clients" | "delete_leads";
  requestId?: string;
  ids?: string[];
};

const invokeViaFetch = async <T>(payload: InvokePayload): Promise<T> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sessione non valida. Effettua di nuovo il login.");
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-entity-actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(payload),
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.error || body?.message || "Errore durante la chiamata al backend.");
  }

  return body as T;
};

const invokeCrmEntityAction = async <T>(payload: InvokePayload): Promise<T> => {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Failed to send a request to the Edge Function") || message.includes("Failed to fetch")) {
      return invokeViaFetch<T>(payload);
    }

    throw error;
  }
};

export const convertRequestToPipeline = async (requestId: string) => {
  return convertDealerRequestToPipeline(requestId) as Promise<{
    success: true;
    clientId: string;
    leadId: string;
    requestId: string;
  }>;
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