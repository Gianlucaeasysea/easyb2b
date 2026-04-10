import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { crmQueryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { deleteContactsCascade } from "@/lib/crmEntityActions";
import { invokeDealerAccountAction } from "@/lib/dealerAccountActions";

export function useOrganizationDetail(id: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: client, isLoading } = useQuery({
    queryKey: crmQueryKeys.organizations.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: orders } = useQuery({
    queryKey: crmQueryKeys.organizations.orders(id!),
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name, sku))")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: contacts, refetch: refetchContacts } = useQuery({
    queryKey: crmQueryKeys.organizations.contacts(id!),
    queryFn: async () => {
      const { data } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", id!)
        .order("is_primary", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: addresses } = useQuery({
    queryKey: crmQueryKeys.organizations.addresses(id!),
    queryFn: async () => {
      const { data } = await supabase.from("client_shipping_addresses").select("*").eq("client_id", id!);
      return (data as any[]) || [];
    },
    enabled: !!id,
  });

  const { data: activities } = useQuery({
    queryKey: crmQueryKeys.organizations.activities(id!),
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*, client_contacts(contact_name)")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: orgTasks, refetch: refetchTasks } = useQuery({
    queryKey: crmQueryKeys.organizations.tasks(id!),
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").eq("client_id", id!).order("due_date", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: orgDeals } = useQuery({
    queryKey: crmQueryKeys.organizations.deals(id!),
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("*, contact:contact_id(contact_name)").eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: crmQueryKeys.organizations.documents(id!),
    queryFn: async () => {
      const { data: clientDocs } = await supabase.from("client_documents").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      const { data: orderIds } = await supabase.from("orders").select("id").eq("client_id", id!);
      let orderDocs: any[] = [];
      if (orderIds?.length) {
        const { data } = await supabase.from("order_documents").select("*").in("order_id", orderIds.map(o => o.id));
        orderDocs = data || [];
      }
      return [...(clientDocs || []), ...orderDocs];
    },
    enabled: !!id,
  });

  const { data: assignedPriceLists, refetch: refetchAssignedLists } = useQuery({
    queryKey: crmQueryKeys.organizations.priceLists(id!),
    queryFn: async () => {
      const { data } = await supabase.from("price_list_clients").select("*, price_lists(id, name, description, discount_tier_id)").eq("client_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: priceListItemCounts } = useQuery({
    queryKey: crmQueryKeys.shared.priceListItemCounts,
    queryFn: async () => {
      const { data } = await supabase.from("price_list_items").select("price_list_id");
      const counts: Record<string, number> = {};
      data?.forEach((i: any) => { counts[i.price_list_id] = (counts[i.price_list_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: allPriceLists } = useQuery({
    queryKey: crmQueryKeys.shared.allPriceLists,
    queryFn: async () => {
      const { data } = await supabase.from("price_lists").select("*").order("name");
      return data || [];
    },
  });

  const { data: discountTiers } = useQuery({
    queryKey: crmQueryKeys.shared.discountTiers,
    queryFn: async () => {
      const { data } = await supabase.from("discount_tiers").select("*").order("sort_order");
      return data || [];
    },
  });

  // Mutations
  const saveContact = async (
    contactForm: Record<string, any>,
    editContactId: string | null,
  ) => {
    const payload = {
      client_id: id!,
      contact_name: contactForm.contact_name.trim(),
      email: contactForm.email?.trim() || null,
      phone: contactForm.phone?.trim() || null,
      role: contactForm.role?.trim() || null,
      notes: contactForm.notes?.trim() || null,
      job_title: contactForm.job_title?.trim() || null,
      department: contactForm.department?.trim() || null,
      contact_type: contactForm.contact_type,
      preferred_channel: contactForm.preferred_channel,
      linkedin_url: contactForm.linkedin_url?.trim() || null,
      is_primary: contactForm.is_primary,
      is_decision_maker: contactForm.is_decision_maker,
    } as any;

    if (editContactId) {
      const { error } = await supabase.from("client_contacts").update(payload).eq("id", editContactId);
      if (error) { toast.error("Failed to update contact"); throw error; }
      toast.success("Contact updated");
    } else {
      const { error } = await supabase.from("client_contacts").insert(payload);
      if (error) { toast.error("Failed to save contact"); throw error; }
      toast.success("Contact added");
    }
    refetchContacts();
    queryClient.invalidateQueries({ queryKey: crmQueryKeys.shared.primaryContacts });
  };

  const deleteContact = async (contactId: string) => {
    try {
      await deleteContactsCascade([contactId]);
      toast.success("Contact removed");
      refetchContacts();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete contact");
    }
  };

  const addActivity = async (actForm: { title: string; type: string; body: string; contact_id: string }) => {
    if (!actForm.title.trim()) return;
    const { error } = await supabase.from("activities").insert({
      client_id: id!,
      title: actForm.title.trim(),
      type: actForm.type,
      body: actForm.body.trim() || null,
      contact_id: actForm.contact_id || null,
      created_by: user?.id,
    } as any);
    if (error) { toast.error("Error"); throw error; }
    toast.success("Activity added");
    queryClient.invalidateQueries({ queryKey: crmQueryKeys.organizations.activities(id!) });
  };

  const addTask = async (taskForm: { title: string; type: string; priority: string; due_date: string; description: string }) => {
    const { error } = await supabase.from("tasks").insert({
      title: taskForm.title,
      type: taskForm.type,
      priority: taskForm.priority,
      due_date: taskForm.due_date || null,
      description: taskForm.description || null,
      client_id: id!,
      assigned_to: user?.id,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); throw error; }
    toast.success("Task creato");
    refetchTasks();
    queryClient.invalidateQueries({ queryKey: crmQueryKeys.tasks.all });
    queryClient.invalidateQueries({ queryKey: crmQueryKeys.tasks.overdueCount });
  };

  const completeTask = async (taskId: string) => {
    await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", taskId);
    refetchTasks();
    queryClient.invalidateQueries({ queryKey: crmQueryKeys.tasks.overdueCount });
    toast.success("Task completed");
  };

  const saveNotes = async (notes: string) => {
    const trimmed = notes.trim() || null;
    const { error } = await supabase.from("clients").update({ notes: trimmed }).eq("id", id!);
    if (error) { toast.error("Failed to save"); throw error; }
    toast.success("Notes saved");
    queryClient.invalidateQueries({ queryKey: crmQueryKeys.organizations.detail(id!) });
  };

  const updatePaymentTerms = async (terms: string) => {
    const { error } = await supabase.from("clients").update({ payment_terms: terms } as any).eq("id", id!);
    if (error) { toast.error(error.message); throw error; }
    toast.success("Payment terms updated");
    queryClient.invalidateQueries({ queryKey: crmQueryKeys.organizations.detail(id!) });
  };

  const assignPriceList = async (priceListId: string) => {
    const { error } = await supabase.from("price_list_clients").insert({ price_list_id: priceListId, client_id: id! } as any);
    if (error) {
      if (error.code === "23505") toast.info("Price list already assigned");
      else toast.error(error.message);
      return;
    }
    const plName = allPriceLists?.find(pl => pl.id === priceListId)?.name || "Price list";
    toast.success(`Price list "${plName}" assigned to ${client?.company_name}`);
    refetchAssignedLists();
    if (client?.id) {
      await supabase.from("client_notifications").insert({
        client_id: client.id,
        title: "Price list updated",
        body: "Your price list has been updated. Visit the catalog to see the new prices.",
        type: "info",
        target_role: "dealer",
      } as any);
    }
  };

  const removePriceList = async (plcId: string) => {
    const { error } = await supabase.from("price_list_clients").delete().eq("id", plcId);
    if (error) toast.error(error.message);
    else { toast.success("Price list removed"); refetchAssignedLists(); }
  };

  const createCredentials = async () => {
    if (!client?.email) {
      toast.error("This organization has no email configured");
      throw new Error("No email");
    }
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
    const password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const result = await invokeDealerAccountAction<{ email_sent?: boolean }>({ client_id: id!, email: client.email, password });
    if (result?.email_sent) {
      toast.success("Credentials created and sent via email to the dealer");
    } else {
      toast.success("Credentials created (email not sent — check Gmail configuration)");
    }
    queryClient.invalidateQueries({ queryKey: crmQueryKeys.organizations.detail(id!) });
  };

  const deleteCredentials = async () => {
    await invokeDealerAccountAction<{ success: boolean }>({ client_id: id!, action: "delete" });
    toast.success("Dealer credentials deleted");
    queryClient.invalidateQueries({ queryKey: crmQueryKeys.organizations.detail(id!) });
  };

  const resetPassword = async () => {
    const { error } = await supabase.functions.invoke("reset-dealer-password", { body: { email: client?.email } });
    if (error) throw error;
    toast.success(`Password reset email sent to ${client?.email}`);
  };

  const updateVisibility = async (field: "show_discount_tiers" | "show_goals", value: boolean) => {
    const { error } = await supabase.from("clients").update({ [field]: value } as any).eq("id", id!);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); queryClient.invalidateQueries({ queryKey: crmQueryKeys.organizations.detail(id!) }); }
  };

  const totalSpent = orders?.filter(o => o.status !== "draft").reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;

  return {
    client,
    isLoading,
    orders: orders || [],
    contacts: contacts || [],
    addresses: addresses || [],
    activities: activities || [],
    orgTasks: orgTasks || [],
    orgDeals: orgDeals || [],
    documents: documents || [],
    assignedPriceLists: assignedPriceLists || [],
    priceListItemCounts: priceListItemCounts || {},
    allPriceLists: allPriceLists || [],
    discountTiers: discountTiers || [],
    totalSpent,
    // mutations
    saveContact,
    deleteContact,
    addActivity,
    addTask,
    completeTask,
    saveNotes,
    updatePaymentTerms,
    assignPriceList,
    removePriceList,
    createCredentials,
    deleteCredentials,
    resetPassword,
    updateVisibility,
    queryClient,
    user,
  };
}
