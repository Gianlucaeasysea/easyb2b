import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { cleanupOrphanedDealerAccountByEmail, deleteDealerAuthArtifacts } from "../_shared/dealer-account-cleanup.ts";

type AppRole = "admin" | "sales" | "dealer" | "operations";

const json = (body: unknown, headers: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

const ensure = async (
  operation: PromiseLike<{ error: { message: string } | null }>,
  message: string,
) => {
  const { error } = await operation;
  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }
};

const getAuthorizedContext = async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) throw new Error("Unauthorized");

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await anonClient.auth.getUser(token);

  if (authError || !user) throw new Error("Unauthorized");

  const { data: role } = await adminClient.rpc("get_user_role", { _user_id: user.id });

  if (!role || !["admin", "sales"].includes(role)) throw new Error("Forbidden");

  return { adminClient, user, role: role as AppRole };
};

const getExistingClient = async (adminClient: any, request: Record<string, unknown>) => {
  const email = typeof request.email === "string" ? request.email : null;
  const companyName = typeof request.company_name === "string" ? request.company_name : null;

  if (email && companyName) {
    const { data } = await adminClient
      .from("clients")
      .select("id, assigned_sales_id")
      .eq("email", email)
      .eq("company_name", companyName)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  if (companyName) {
    const { data } = await adminClient
      .from("clients")
      .select("id, assigned_sales_id")
      .eq("company_name", companyName)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  return null;
};

const getExistingLead = async (adminClient: any, request: Record<string, unknown>) => {
  const email = typeof request.email === "string" ? request.email : null;
  const companyName = typeof request.company_name === "string" ? request.company_name : null;

  if (email && companyName) {
    const { data } = await adminClient
      .from("leads")
      .select("id")
      .eq("email", email)
      .eq("company_name", companyName)
      .eq("source", "Dealer Application")
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  if (companyName) {
    const { data } = await adminClient
      .from("leads")
      .select("id")
      .eq("company_name", companyName)
      .eq("source", "Dealer Application")
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  return null;
};

const ensurePrimaryContact = async (adminClient: any, clientId: string, request: Record<string, unknown>) => {
  const contactName = typeof request.contact_name === "string" ? request.contact_name : null;
  if (!contactName) return;

  const { data: existingContact, error } = await adminClient
    .from("client_contacts")
    .select("id")
    .eq("client_id", clientId)
    .eq("contact_name", contactName)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to check client contact: ${error.message}`);
  if (existingContact) return;

  await ensure(
    adminClient.from("client_contacts").insert({
      client_id: clientId,
      contact_name: contactName,
      email: typeof request.email === "string" ? request.email : null,
      phone: typeof request.phone === "string" ? request.phone : null,
      is_primary: true,
    }),
    "Failed to create primary contact",
  );
};

const convertRequestToPipeline = async (adminClient: any, requestId: string, userId: string, role: AppRole) => {
  const { data: request, error: requestError } = await adminClient
    .from("distributor_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (requestError || !request) throw new Error("Request not found");

  let clientId: string;
  const existingClient = await getExistingClient(adminClient, request);

  if (existingClient) {
    clientId = existingClient.id;
    if (role === "sales" && !existingClient.assigned_sales_id) {
      await ensure(
        adminClient.from("clients").update({ assigned_sales_id: userId }).eq("id", clientId),
        "Failed to assign organization to sales user",
      );
    }
  } else {
    const { data: newClient, error: clientError } = await adminClient
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
      throw new Error(`Failed to create organization: ${clientError?.message || "Unknown error"}`);
    }
    clientId = newClient.id;
  }

  await ensurePrimaryContact(adminClient, clientId, request);

  let leadId: string;
  const existingLead = await getExistingLead(adminClient, request);

  if (existingLead) {
    leadId = existingLead.id;

    await ensure(
      adminClient
        .from("leads")
        .update({
          contact_name: request.contact_name,
          email: request.email,
          phone: request.phone,
          zone: request.zone,
          status: "new",
          assigned_to: role === "sales" ? userId : null,
          notes: `[Dealer Request] Business type: ${request.business_type || "—"}\nWebsite: ${request.website || "—"}\nCountry: ${request.country || "—"}\nVAT: ${request.vat_number || "—"}\nMessage: ${request.message || "—"}`,
        })
        .eq("id", leadId),
      "Failed to refresh existing lead",
    );
  } else {
    const { data: newLead, error: leadError } = await adminClient
      .from("leads")
      .insert({
        company_name: request.company_name,
        contact_name: request.contact_name,
        email: request.email,
        phone: request.phone,
        zone: request.zone,
        source: "Dealer Application",
        status: "new",
        notes: `[Dealer Request] Business type: ${request.business_type || "—"}\nWebsite: ${request.website || "—"}\nCountry: ${request.country || "—"}\nVAT: ${request.vat_number || "—"}\nMessage: ${request.message || "—"}`,
        assigned_to: userId,
      })
      .select("id")
      .single();

    if (leadError || !newLead) {
      throw new Error(`Failed to create lead: ${leadError?.message || "Unknown error"}`);
    }
    leadId = newLead.id;
  }

  await ensure(
    adminClient.from("distributor_requests").update({ status: "converted" }).eq("id", requestId),
    "Failed to update request status",
  );

  return { success: true, requestId, clientId, leadId };
};

const deleteClientGraph = async (adminClient: any, clientId: string) => {
  // Use atomic RPC for all DB deletions in a single transaction
  const { data, error } = await adminClient.rpc("delete_client_cascade", {
    p_client_id: clientId,
  });

  if (error) throw new Error(`Failed to delete client cascade: ${error.message}`);

  // Auth cleanup is separate (not in DB transaction — acceptable)
  if (data?.had_dealer_account && data?.dealer_user_id) {
    await deleteDealerAuthArtifacts(adminClient, data.dealer_user_id);
  }
};

const deleteLeadGraph = async (adminClient: any, leadId: string) => {
  await ensure(adminClient.from("tasks").delete().eq("lead_id", leadId), "Failed to delete lead tasks");
  await ensure(adminClient.from("deals").delete().eq("lead_id", leadId), "Failed to delete lead deals");
  await ensure(adminClient.from("activities").delete().eq("lead_id", leadId), "Failed to delete lead activities");
  await ensure(adminClient.from("leads").delete().eq("id", leadId), "Failed to delete lead");
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminClient, user, role } = await getAuthorizedContext(req);
    const body = await req.json();
    const action = body?.action as string | undefined;

    if (action === "convert_request_to_pipeline") {
      if (!body?.requestId) return json({ error: "Missing requestId" }, corsHeaders, 400);
      return json(await convertRequestToPipeline(adminClient, body.requestId, user.id, role), corsHeaders);
    }

    if (action === "cleanup_orphaned_dealer_account") {
      const email = typeof body?.email === "string" ? body.email : "";
      if (!email.trim()) return json({ error: "Missing email" }, corsHeaders, 400);
      return json(await cleanupOrphanedDealerAccountByEmail(adminClient, email), corsHeaders);
    }

    if (action === "delete_clients") {
      const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
      if (!ids.length) return json({ error: "Missing organization ids" }, corsHeaders, 400);

      if (role === "sales") {
        const { data: allowedClients, error } = await adminClient
          .from("clients")
          .select("id")
          .in("id", ids)
          .or(`assigned_sales_id.eq.${user.id},assigned_sales_id.is.null`);

        if (error) throw new Error(`Failed to verify organization permissions: ${error.message}`);

        const allowedIds = new Set((allowedClients || []).map((client: { id: string }) => client.id));
        if (ids.some((id: string) => !allowedIds.has(id))) {
          return json({ error: "Some organizations cannot be deleted by this sales user." }, corsHeaders, 403);
        }
      }

      for (const id of ids) {
        await deleteClientGraph(adminClient, id);
      }

      return json({ success: true, deletedIds: ids }, corsHeaders);
    }

    if (action === "delete_leads") {
      const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
      if (!ids.length) return json({ error: "Missing lead ids" }, corsHeaders, 400);

      for (const id of ids) {
        await deleteLeadGraph(adminClient, id);
      }

      return json({ success: true, deletedIds: ids }, corsHeaders);
    }

    if (action === "delete_contacts") {
      const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
      if (!ids.length) return json({ error: "Missing contact ids" }, corsHeaders, 400);

      for (const id of ids) {
        // Delete activities linked to this contact
        await ensure(adminClient.from("activities").delete().eq("contact_id", id), "Failed to delete contact activities");
        // Delete tasks linked to this contact
        await ensure(adminClient.from("tasks").delete().eq("contact_id", id), "Failed to delete contact tasks");
        // Delete deals linked to this contact
        await ensure(adminClient.from("deals").update({ contact_id: null }).eq("contact_id", id), "Failed to unlink contact deals");
        // Delete communications linked to this contact
        await ensure(adminClient.from("client_communications").update({ contact_id: null }).eq("contact_id", id), "Failed to unlink contact communications");
        // Delete the contact
        await ensure(adminClient.from("client_contacts").delete().eq("id", id), "Failed to delete contact");
      }

      return json({ success: true, deletedIds: ids }, corsHeaders);
    }

    return json({ error: "Unsupported action" }, corsHeaders, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return json({ error: message }, corsHeaders, status);
  }
});
