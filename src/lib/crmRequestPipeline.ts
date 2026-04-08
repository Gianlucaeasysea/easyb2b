import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type AppRole = "admin" | "sales" | "dealer" | "operations";

type DistributorRequestRow = Tables<"distributor_requests">;

const DEALER_REQUEST_SOURCE = "Dealer Application";

const buildLeadNotes = (request: DistributorRequestRow) =>
  `[Dealer Request] Business type: ${request.business_type || "—"}\nWebsite: ${request.website || "—"}\nCountry: ${request.country || "—"}\nVAT: ${request.vat_number || "—"}\nMessage: ${request.message || "—"}`;

const getAuthorizedUserContext = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Sessione non valida. Effettua di nuovo il login.");
  }

  const { data: role, error: roleError } = await supabase.rpc("get_user_role", { _user_id: user.id });

  if (roleError || !role || !["admin", "sales"].includes(role)) {
    throw new Error("Non hai i permessi per convertire questa richiesta.");
  }

  return { userId: user.id, role: role as AppRole };
};

const getExistingClient = async (request: DistributorRequestRow) => {
  if (request.email && request.company_name) {
    const { data, error } = await supabase
      .from("clients")
      .select("id, assigned_sales_id")
      .eq("email", request.email)
      .eq("company_name", request.company_name)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Errore controllo organizzazione: ${error.message}`);
    if (data) return data;
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id, assigned_sales_id")
    .eq("company_name", request.company_name)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Errore controllo organizzazione: ${error.message}`);
  return data;
};

const getExistingLead = async (request: DistributorRequestRow) => {
  if (request.email && request.company_name) {
    const { data, error } = await supabase
      .from("leads")
      .select("id")
      .eq("email", request.email)
      .eq("company_name", request.company_name)
      .eq("source", DEALER_REQUEST_SOURCE)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Errore controllo lead: ${error.message}`);
    if (data) return data;
  }

  const { data, error } = await supabase
    .from("leads")
    .select("id")
    .eq("company_name", request.company_name)
    .eq("source", DEALER_REQUEST_SOURCE)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Errore controllo lead: ${error.message}`);
  return data;
};

const ensurePrimaryContact = async (clientId: string, request: DistributorRequestRow) => {
  if (!request.contact_name) return;

  const { data: existingContact, error: contactCheckError } = await supabase
    .from("client_contacts")
    .select("id")
    .eq("client_id", clientId)
    .eq("contact_name", request.contact_name)
    .limit(1)
    .maybeSingle();

  if (contactCheckError) {
    throw new Error(`Errore controllo contatto: ${contactCheckError.message}`);
  }

  if (existingContact) return;

  const { error: contactInsertError } = await supabase.from("client_contacts").insert({
    client_id: clientId,
    contact_name: request.contact_name,
    email: request.email,
    phone: request.phone,
    is_primary: true,
  });

  if (contactInsertError) {
    throw new Error(`Errore creazione contatto: ${contactInsertError.message}`);
  }
};

export const convertDealerRequestToPipeline = async (requestId: string) => {
  const { userId, role } = await getAuthorizedUserContext();

  const { data: request, error: requestError } = await supabase
    .from("distributor_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message || "Richiesta non trovata.");
  }

  let clientId: string;
  const existingClient = await getExistingClient(request);

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        company_name: request.company_name,
        contact_name: request.contact_name,
        email: request.email,
        phone: request.phone,
        zone: request.zone,
        country: request.country,
        vat_number: request.vat_number,
        business_type: request.business_type,
        website: request.website,
        status: "lead",
        discount_class: "D",
        assigned_sales_id: role === "sales" ? userId : null,
      })
      .select("id")
      .single();

    if (clientError || !newClient) {
      throw new Error(`Errore creazione organizzazione: ${clientError?.message || "Unknown error"}`);
    }

    clientId = newClient.id;
  }

  await ensurePrimaryContact(clientId, request);

  let leadId: string;
  const existingLead = await getExistingLead(request);

  if (existingLead) {
    leadId = existingLead.id;

    const { error: leadUpdateError } = await supabase
      .from("leads")
      .update({
        contact_name: request.contact_name,
        email: request.email,
        phone: request.phone,
        zone: request.zone,
        status: "new",
        assigned_to: role === "sales" ? userId : null,
        notes: buildLeadNotes(request),
      })
      .eq("id", leadId);

    if (leadUpdateError) {
      throw new Error(`Errore aggiornamento lead: ${leadUpdateError.message}`);
    }
  } else {
    const { data: newLead, error: leadInsertError } = await supabase
      .from("leads")
      .insert({
        company_name: request.company_name,
        contact_name: request.contact_name,
        email: request.email,
        phone: request.phone,
        zone: request.zone,
        source: DEALER_REQUEST_SOURCE,
        status: "new",
        notes: buildLeadNotes(request),
        assigned_to: userId,
      })
      .select("id")
      .single();

    if (leadInsertError || !newLead) {
      throw new Error(`Errore creazione lead: ${leadInsertError?.message || "Unknown error"}`);
    }

    leadId = newLead.id;
  }

  const { error: requestUpdateError } = await supabase
    .from("distributor_requests")
    .update({ status: "converted" })
    .eq("id", requestId);

  if (requestUpdateError) {
    throw new Error(`Errore aggiornamento richiesta: ${requestUpdateError.message}`);
  }

  return { success: true as const, requestId, clientId, leadId };
};