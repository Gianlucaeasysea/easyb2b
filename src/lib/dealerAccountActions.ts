import { supabase } from "@/integrations/supabase/client";

type DealerAccountPayload = {
  client_id: string;
  email?: string;
  password?: string;
  action?: "delete";
};

export const invokeDealerAccountAction = async <T>(payload: DealerAccountPayload): Promise<T> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sessione non valida. Effettua di nuovo il login.");
  }

  try {
    const { data, error } = await supabase.functions.invoke("create-dealer-account", {
      body: payload,
    });

    if (error) {
      throw error;
    }

    return data as T;
  } catch {
    // Fallback for preview/runtime environments where the SDK transport can fail intermittently.
  }

  let response: Response;

  try {
    response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-dealer-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Impossibile raggiungere il backend. Riprova tra qualche secondo.");
  }

  let result: any = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.error || `Errore nella gestione credenziali dealer (${response.status})`);
  }

  if (result?.error) {
    throw new Error(result.error);
  }

  return result as T;
};