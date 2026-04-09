import { supabase } from "@/integrations/supabase/client";
import { convertDealerRequestToPipeline } from "@/lib/crmRequestPipeline";

type InvokePayload = {
  action: "convert_request_to_pipeline" | "delete_clients" | "delete_leads" | "delete_contacts";
  requestId?: string;
  ids?: string[];
};

const invokeCrmEntityAction = async <T>(payload: InvokePayload): Promise<T> => {
  // Always use direct fetch for reliability (avoids CORS/preflight issues in preview)
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sessione non valida. Effettua di nuovo il login.");
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-entity-actions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
    }
  );

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Error calling backend (${response.status}).`);
  }

  return body as T;
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

export const deleteContactsCascade = async (ids: string[]) => {
  return invokeCrmEntityAction<{ success: true; deletedIds: string[] }>({
    action: "delete_contacts",
    ids,
  });
};
