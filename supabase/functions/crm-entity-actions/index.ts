import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type AppRole = "admin" | "sales" | "dealer" | "operations";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

  if (email) {
    const { data } = await adminClient
      .from("clients")
      .select("id, assigned_sales_id")
      .eq("email", email)
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

  if (email) {
    const { data } = await adminClient
      .from("leads")
      .select("id")
      .eq("email", email)
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
        discount_class: "standard",
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
  // 1. Look up the auth user_id linked to this client BEFORE deleting
  const { data: clientRow } = await adminClient
    .from("clients")
    .select("user_id")
    .eq("id", clientId)
    .maybeSingle();

  const linkedUserId = clientRow?.user_id as string | null;

  const { data: orders, error: ordersError } = await adminClient
    .from("orders")
    .select("id")
    .eq("client_id", clientId);

  if (ordersError) throw new Error(`Failed to read client orders: ${ordersError.message}`);

  const orderIds = (orders || []).map((order: { id: string }) => order.id);

  if (orderIds.length) {
    await ensure(adminClient.from("order_items").delete().in("order_id", orderIds), "Failed to delete order items");
    await ensure(adminClient.from("order_documents").delete().in("order_id", orderIds), "Failed to delete order documents");
    await ensure(adminClient.from("order_events").delete().in("order_id", orderIds), "Failed to delete order events");
  }

  await ensure(adminClient.from("tasks").delete().eq("client_id", clientId), "Failed to delete client tasks");
  await ensure(adminClient.from("deals").delete().eq("client_id", clientId), "Failed to delete client deals");
  await ensure(adminClient.from("activities").delete().eq("client_id", clientId), "Failed to delete client activities");
  await ensure(adminClient.from("client_bank_details").delete().eq("client_id", clientId), "Failed to delete bank details");
  await ensure(adminClient.from("client_notifications").delete().eq("client_id", clientId), "Failed to delete notifications");
  await ensure(adminClient.from("client_notification_preferences").delete().eq("client_id", clientId), "Failed to delete notification preferences");
  await ensure(adminClient.from("client_documents").delete().eq("client_id", clientId), "Failed to delete client documents");
  await ensure(adminClient.from("client_shipping_addresses").delete().eq("client_id", clientId), "Failed to delete shipping addresses");
  await ensure(adminClient.from("price_list_clients").delete().eq("client_id", clientId), "Failed to delete price list links");
  await ensure(adminClient.from("price_lists").delete().eq("client_id", clientId), "Failed to delete client price lists");
  await ensure(adminClient.from("client_communications").delete().eq("client_id", clientId), "Failed to delete communications");
  await ensure(adminClient.from("client_contacts").delete().eq("client_id", clientId), "Failed to delete contacts");
  await ensure(adminClient.from("orders").delete().eq("client_id", clientId), "Failed to delete orders");
  await ensure(adminClient.from("clients").delete().eq("id", clientId), "Failed to delete organization");

  // Clean up auth user, roles, and profile if a dealer account was linked
  if (linkedUserId) {
    // Delete user_roles
    await adminClient.from("user_roles").delete().eq("user_id", linkedUserId);
    // Delete profile
    await adminClient.from("profiles").delete().eq("user_id", linkedUserId);
    // Delete auth user (frees the email for reuse)
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(linkedUserId);
    if (authDeleteError) {
      console.error(`Warning: failed to delete auth user ${linkedUserId}: ${authDeleteError.message}`);
    }
  }
};

const deleteLeadGraph = async (adminClient: any, leadId: string) => {
  await ensure(adminClient.from("tasks").delete().eq("lead_id", leadId), "Failed to delete lead tasks");
  await ensure(adminClient.from("deals").delete().eq("lead_id", leadId), "Failed to delete lead deals");
  await ensure(adminClient.from("activities").delete().eq("lead_id", leadId), "Failed to delete lead activities");
  await ensure(adminClient.from("leads").delete().eq("id", leadId), "Failed to delete lead");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminClient, user, role } = await getAuthorizedContext(req);
    const body = await req.json();
    const action = body?.action as string | undefined;

    if (action === "convert_request_to_pipeline") {
      if (!body?.requestId) return json({ error: "Missing requestId" }, 400);
      return json(await convertRequestToPipeline(adminClient, body.requestId, user.id, role));
    }

    if (action === "delete_clients") {
      const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
      if (!ids.length) return json({ error: "Missing organization ids" }, 400);

      if (role === "sales") {
        const { data: allowedClients, error } = await adminClient
          .from("clients")
          .select("id")
          .in("id", ids)
          .or(`assigned_sales_id.eq.${user.id},assigned_sales_id.is.null`);

        if (error) throw new Error(`Failed to verify organization permissions: ${error.message}`);

        const allowedIds = new Set((allowedClients || []).map((client: { id: string }) => client.id));
        if (ids.some((id: string) => !allowedIds.has(id))) {
          return json({ error: "Some organizations cannot be deleted by this sales user." }, 403);
        }
      }

      for (const id of ids) {
        await deleteClientGraph(adminClient, id);
      }

      return json({ success: true, deletedIds: ids });
    }

    if (action === "delete_leads") {
      const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
      if (!ids.length) return json({ error: "Missing lead ids" }, 400);

      for (const id of ids) {
        await deleteLeadGraph(adminClient, id);
      }

      return json({ success: true, deletedIds: ids });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return json({ error: message }, status);
  }
});