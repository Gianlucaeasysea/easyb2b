import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { deleteClientsCascade } from "@/lib/crmEntityActions";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import { useState, useEffect, useRef } from "react";

export function useClientDetail(id: string | undefined) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Form state ──
  const [form, setForm] = useState({
    company_name: "", contact_name: "", email: "", phone: "", country: "", zone: "",
    status: "", notes: "", address: "", website: "", business_type: "", vat_number: "",
    payment_terms: "100% upfront", payment_terms_notes: "",
  });
  const [bank, setBank] = useState({ bank_name: "", iban: "", swift_bic: "", account_holder: "" });
  const [bankInitialized, setBankInitialized] = useState(false);
  const [newContact, setNewContact] = useState({ contact_name: "", email: "", phone: "", role: "" });
  const [showAddContact, setShowAddContact] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: "", address_line: "", city: "", province: "", postal_code: "", country: "" });
  const [showAddAddress, setShowAddAddress] = useState(false);

  // ── Doc state ──
  const [docCategory, setDocCategory] = useState("contract");
  const [docTitle, setDocTitle] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  // ── Order state ──
  const [orderItems, setOrderItems] = useState<{ product_id: string; quantity: number; unit_price: number }[]>([]);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [newOrderNotes, setNewOrderNotes] = useState("");

  // ── Account state ──
  const generatePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState(() => generatePassword());
  const [creatingAccount, setCreatingAccount] = useState(false);

  // ── Compose email state ──
  const [showComposeFromOrder, setShowComposeFromOrder] = useState(false);
  const [composeOrderContext, setComposeOrderContext] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // ── Clipboard ──
  const [copied, setCopied] = useState<string | null>(null);
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Queries ──
  const { data: client, isLoading } = useQuery({
    queryKey: ["admin-client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useQuery({
    queryKey: ["discount-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("discount_tiers").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-client-orders", id],
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

  const { data: contacts } = useQuery({
    queryKey: ["admin-client-contacts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: addresses } = useQuery({
    queryKey: ["admin-client-addresses", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_shipping_addresses")
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: true });
      return (data as any[]) || [];
    },
    enabled: !!id,
  });

  const { data: bankDetails } = useQuery({
    queryKey: ["admin-client-bank", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_bank_details")
        .select("*")
        .eq("client_id", id!)
        .maybeSingle();
      return data as any;
    },
    enabled: !!id,
  });

  const { data: clientDocs } = useQuery({
    queryKey: ["admin-client-documents", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_documents")
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-for-order"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, sku, price").eq("active_b2b", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: assignedPriceLists, refetch: refetchAssignedLists } = useQuery({
    queryKey: ["admin-client-pricelists", id],
    queryFn: async () => {
      const { data } = await supabase.from("price_list_clients").select("*, price_lists(id, name, description)").eq("client_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: allPriceLists } = useQuery({
    queryKey: ["all-price-lists"],
    queryFn: async () => {
      const { data } = await supabase.from("price_lists").select("*").order("name");
      return data || [];
    },
  });

  // ── Sync form state ──
  useEffect(() => {
    if (client) {
      setForm({
        company_name: client.company_name || "", contact_name: client.contact_name || "",
        email: client.email || "", phone: client.phone || "", country: client.country || "",
        zone: client.zone || "", status: client.status || "lead",
        notes: client.notes || "", address: client.address || "", website: client.website || "",
        business_type: client.business_type || "", vat_number: client.vat_number || "",
        payment_terms: (client as any).payment_terms || "100% upfront",
        payment_terms_notes: (client as any).payment_terms_notes || "",
      });
    }
  }, [client]);

  useEffect(() => {
    if (bankDetails && !bankInitialized) {
      setBank({
        bank_name: bankDetails.bank_name || "", iban: bankDetails.iban || "",
        swift_bic: bankDetails.swift_bic || "", account_holder: bankDetails.account_holder || "",
      });
      setBankInitialized(true);
    }
  }, [bankDetails, bankInitialized]);

  // ── Mutations ──
  const updateClient = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").update(form).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast.success("Client updated");
    },
    onError: (error) => showErrorToast(error, "AdminClientDetail.updateClient"),
  });

  const deleteClient = useMutation({
    mutationFn: async () => { await deleteClientsCascade([id!]); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast.success("Client deleted");
      navigate("/admin/clients");
    },
    onError: (error) => showErrorToast(error, "AdminClientDetail.deleteClient"),
  });

  const addContact = useMutation({
    mutationFn: async () => {
      if (!newContact.contact_name) throw new Error("Name is required");
      const { error } = await supabase.from("client_contacts").insert({ client_id: id!, ...newContact });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-contacts", id] });
      setNewContact({ contact_name: "", email: "", phone: "", role: "" });
      setShowAddContact(false);
      toast.success("Contact added");
    },
    onError: (error) => showErrorToast(error, "AdminClientDetail.addContact"),
  });

  const removeContact = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase.from("client_contacts").delete().eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-contacts", id] });
      toast.success("Contact removed");
    },
    onError: (error) => showErrorToast(error, "AdminClientDetail.removeContact"),
  });

  const addAddress = useMutation({
    mutationFn: async () => {
      if (!newAddr.address_line) throw new Error("Address is required");
      const { error } = await supabase.from("client_shipping_addresses").insert({ client_id: id!, ...newAddr } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-addresses", id] });
      setNewAddr({ label: "", address_line: "", city: "", province: "", postal_code: "", country: "" });
      setShowAddAddress(false);
      toast.success("Address added");
    },
    onError: (error) => showErrorToast(error, "AdminClientDetail.addAddress"),
  });

  const removeAddress = useMutation({
    mutationFn: async (addrId: string) => {
      const { error } = await supabase.from("client_shipping_addresses").delete().eq("id", addrId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-addresses", id] });
      toast.success("Address removed");
    },
    onError: (error) => showErrorToast(error, "AdminClientDetail.removeAddress"),
  });

  const saveBank = useMutation({
    mutationFn: async () => {
      if (bankDetails?.id) {
        const { error } = await supabase.from("client_bank_details").update(bank as any).eq("id", bankDetails.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_bank_details").insert({ ...bank, client_id: id! } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-bank", id] });
      toast.success("Bank details saved");
    },
    onError: (error) => showErrorToast(error, "AdminClientDetail.saveBank"),
  });

  // ── Actions ──
  const createDealerAccount = async () => {
    if (!client?.email) { toast.error("Client must have an email"); return; }
    if (accountPassword.length < 10) { toast.error("Password must be at least 10 characters"); return; }
    setCreatingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-dealer-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ client_id: id, email: client.email, password: accountPassword }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success("Dealer account created!");
      queryClient.invalidateQueries({ queryKey: ["admin-client", id] });
      setShowCreateAccount(false);
    } catch (error) { showErrorToast(error, "AdminClientDetail.createDealerAccount"); } finally { setCreatingAccount(false); }
  };

  const createManualOrder = async () => {
    if (!id || orderItems.length === 0) return;
    setCreatingOrder(true);
    try {
      const { data: order, error: orderErr } = await supabase.rpc("create_order_with_items", {
        p_client_id: id,
        p_status: "confirmed",
        p_notes: newOrderNotes || undefined,
        p_order_type: "MANUAL B2B",
        p_internal_notes: undefined,
        p_items: orderItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_pct: 0,
          subtotal: item.unit_price * item.quantity,
        })),
      });
      if (orderErr) throw orderErr;
      const orderResult = order as any;
      await supabase.from("order_events").insert({
        order_id: orderResult.id,
        event_type: "created",
        title: "Order created manually by admin",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-client-orders", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-new-orders"] });
      toast.success("Manual order created!");
      setShowCreateOrder(false);
      setOrderItems([]);
      setNewOrderNotes("");
    } catch (error) {
      showErrorToast(error, "AdminClientDetail.createOrder");
    } finally { setCreatingOrder(false); }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingDoc(true);
    try {
      const filePath = `${id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("client-documents").upload(filePath, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("client_documents").insert({
        client_id: id!,
        title: docTitle.trim() || file.name,
        file_name: file.name,
        file_path: filePath,
        doc_category: docCategory,
        uploaded_by: user.id,
      });
      if (dbErr) throw dbErr;
      queryClient.invalidateQueries({ queryKey: ["admin-client-documents", id] });
      toast.success("Document uploaded");
      setDocTitle("");
    } catch (error) {
      showErrorToast(error, "AdminClientDetail.docUpload");
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const deleteDoc = async (doc: any) => {
    try {
      await supabase.storage.from("client-documents").remove([doc.file_path]);
      await supabase.from("client_documents").delete().eq("id", doc.id);
      queryClient.invalidateQueries({ queryKey: ["admin-client-documents", id] });
      toast.success("Document deleted");
    } catch (error) { showErrorToast(error, "AdminClientDetail.deleteDoc"); }
  };

  const handleDocDownload = async (filePath: string) => {
    const { data } = await supabase.storage.from("client-documents").createSignedUrl(filePath, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const togglePortalVisibility = async (field: string, checked: boolean) => {
    const { error } = await supabase.from("clients").update({ [field]: checked } as any).eq("id", id!);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); queryClient.invalidateQueries({ queryKey: ["admin-client", id] }); }
  };

  const removePriceList = async (plcId: string) => {
    const { error } = await supabase.from("price_list_clients").delete().eq("id", plcId);
    if (error) toast.error(error.message);
    else { toast.success("Listino rimosso"); refetchAssignedLists(); }
  };

  const assignPriceList = async (priceListId: string) => {
    const { error } = await supabase.from("price_list_clients").insert({ price_list_id: priceListId, client_id: id! } as any);
    if (error) {
      if (error.code === "23505") toast.info("Listino già assegnato");
      else toast.error(error.message);
    } else {
      toast.success("Listino assegnato");
      refetchAssignedLists();
    }
  };

  const resetDealerPassword = async (email: string) => {
    try {
      const { error } = await supabase.functions.invoke("reset-dealer-password", { body: { email } });
      if (error) throw error;
      toast.success(`Password reset email sent to ${email}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error sending reset"); }
  };

  // ── Derived ──
  const totalSpent = orders?.filter(o => o.status !== "draft").reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
  const totalOrders = orders?.length || 0;

  return {
    // Data
    client, isLoading, orders, contacts, addresses, bankDetails, clientDocs, products,
    assignedPriceLists, allPriceLists, totalSpent, totalOrders,
    // Form state
    form, setForm, bank, setBank,
    newContact, setNewContact, showAddContact, setShowAddContact,
    newAddr, setNewAddr, showAddAddress, setShowAddAddress,
    // Doc state
    docCategory, setDocCategory, docTitle, setDocTitle, uploadingDoc, docInputRef,
    // Order state
    orderItems, setOrderItems, showCreateOrder, setShowCreateOrder, creatingOrder, newOrderNotes, setNewOrderNotes,
    // Account state
    showCreateAccount, setShowCreateAccount, accountPassword, setAccountPassword, creatingAccount,
    // Compose email
    showComposeFromOrder, setShowComposeFromOrder, composeOrderContext, setComposeOrderContext,
    selectedOrder, setSelectedOrder,
    // Clipboard
    copied, copyToClipboard,
    // Mutations
    updateClient, deleteClient, addContact, removeContact, addAddress, removeAddress, saveBank,
    // Actions
    createDealerAccount, createManualOrder, handleDocUpload, deleteDoc, handleDocDownload,
    generatePassword, togglePortalVisibility, removePriceList, assignPriceList, resetDealerPassword,
    // Navigation
    navigate,
  };
}
