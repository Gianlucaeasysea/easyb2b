import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { deleteClientsCascade } from "@/lib/crmEntityActions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Save, ShoppingBag, TrendingUp, MapPin, Mail, Phone, Globe, Building2, UserPlus, Trash2, X, Eye, KeyRound, Copy, Check, CreditCard, Plus, Bell, Send, FileText, Upload, Download, PackagePlus, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientCommunications } from "@/components/crm/ClientCommunications";
import { ComposeEmailDialog } from "@/components/crm/ComposeEmailDialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";

const NOTIFICATION_TYPES = [
  { key: "account_credentials", label: "Account Credentials", description: "Email with portal access credentials", category: "Account" },
  { key: "dealer_request_confirmation", label: "Dealer Request Confirmation", description: "Confirmation email after submitting 'Become a Dealer' form", category: "Account" },
  { key: "order_received", label: "Order Received", description: "Order receipt confirmation from portal", category: "Orders" },
  { key: "order_confirmed", label: "Order Confirmed", description: "Order confirmation and approval notification", category: "Orders" },
  { key: "order_status_update", label: "Order Status Update", description: "Order status changes (shipped, processing, etc.)", category: "Orders" },
  { key: "order_documents_ready", label: "Documents Ready", description: "New documents uploaded (invoice, DDT, packing list)", category: "Orders" },
  { key: "shipping_update", label: "Shipping Update", description: "Tracking number and delivery notifications", category: "Shipping" },
  { key: "promotional_updates", label: "Promos & News", description: "Promotions, new products, and special offers", category: "Marketing" },
];

const ClientNotificationPreferences = ({ clientId }: { clientId: string }) => {
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["client-notification-prefs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notification_preferences")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
  });

  const togglePref = useMutation({
    mutationFn: async ({ type, enabled }: { type: string; enabled: boolean }) => {
      const existing = prefs?.find(p => p.notification_type === type);
      if (existing) {
        const { error } = await supabase
          .from("client_notification_preferences")
          .update({ enabled })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_notification_preferences")
          .insert({ client_id: clientId, notification_type: type, enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-notification-prefs", clientId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isEnabled = (type: string) => {
    const pref = prefs?.find(p => p.notification_type === type);
    return pref ? pref.enabled : true; // default enabled
  };

  return (
    <div className="glass-card-solid p-6">
      <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
        <Bell size={16} /> Notifications
      </h2>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-4">
          {["Account", "Orders", "Shipping", "Marketing"].map(cat => {
            const items = NOTIFICATION_TYPES.filter(nt => nt.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{cat}</p>
                <div className="space-y-2">
                  {items.map(nt => (
                    <div key={nt.key} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{nt.label}</p>
                        <p className="text-xs text-muted-foreground">{nt.description}</p>
                      </div>
                      <Switch
                        checked={isEnabled(nt.key)}
                        onCheckedChange={(checked) => togglePref.mutate({ type: nt.key, enabled: checked })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import { getOrderStatusLabel, getOrderStatusColor, getPaymentStatusLabel, getPaymentStatusColor } from "@/lib/constants";

const AdminClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newContact, setNewContact] = useState({ contact_name: "", email: "", phone: "", role: "" });
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const generatePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };
  const [accountPassword, setAccountPassword] = useState(() => generatePassword());
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [showComposeFromOrder, setShowComposeFromOrder] = useState(false);
  const [composeOrderContext, setComposeOrderContext] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: "", address_line: "", city: "", province: "", postal_code: "", country: "" });
  const [docCategory, setDocCategory] = useState("contract");
  const [docTitle, setDocTitle] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [newOrderNotes, setNewOrderNotes] = useState("");

  const { data: client, isLoading } = useQuery({
    queryKey: ["admin-client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: discountTiers } = useQuery({
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

  const DOC_CATEGORIES = [
    { value: "contract", label: "Contract" },
    { value: "price_list", label: "Price List (PDF)" },
    { value: "marketing", label: "Marketing Material" },
    { value: "certificate", label: "Certificate" },
    { value: "other", label: "Other" },
  ];

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

  const [orderItems, setOrderItems] = useState<{ product_id: string; quantity: number; unit_price: number }[]>([]);

  const createManualOrder = async () => {
    if (!id || orderItems.length === 0) return;
    setCreatingOrder(true);
    try {
      const { data: order, error: orderErr } = await supabase.rpc("create_order_with_items", {
        p_client_id: id,
        p_status: "confirmed",
        p_notes: newOrderNotes || null,
        p_order_type: "MANUAL B2B",
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
    } finally {
      setCreatingOrder(false);
    }
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
    } catch (error) {
      showErrorToast(error, "AdminClientDetail.deleteDoc");
    }
  };

  const handleDocDownload = async (filePath: string) => {
    const { data } = await supabase.storage.from("client-documents").createSignedUrl(filePath, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const [form, setForm] = useState({
    company_name: "", contact_name: "", email: "", phone: "", country: "", zone: "",
    status: "", notes: "", address: "", website: "", business_type: "", vat_number: "",
    payment_terms: "30_days", payment_terms_notes: "",
  });

  const [bank, setBank] = useState({ bank_name: "", iban: "", swift_bic: "", account_holder: "" });
  const [bankInitialized, setBankInitialized] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        company_name: client.company_name || "", contact_name: client.contact_name || "",
        email: client.email || "", phone: client.phone || "", country: client.country || "",
        zone: client.zone || "", status: client.status || "lead",
        notes: client.notes || "", address: client.address || "", website: client.website || "",
        business_type: client.business_type || "", vat_number: client.vat_number || "",
        payment_terms: (client as any).payment_terms || "30_days",
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
    mutationFn: async () => {
      await deleteClientsCascade([id!]);
    },
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const totalSpent = orders?.filter(o => o.status !== "draft").reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
  const totalOrders = orders?.length || 0;

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy"); } catch { return "—"; }
  };

  if (isLoading) return <div className="text-muted-foreground p-6">Loading...</div>;
  if (!client) return <div className="text-muted-foreground p-6">Client not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clients")} className="text-muted-foreground">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-foreground">{form.company_name}</h1>
          <p className="text-sm text-muted-foreground">{form.country} · {form.business_type || "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={form.status === "active" ? "bg-success/20 text-success border-0" : form.status === "inactive" ? "bg-destructive/20 text-destructive border-0" : "bg-warning/20 text-warning border-0"}>
            {form.status}
          </Badge>
          <Button variant="destructive" size="sm" onClick={() => { if (confirm("Are you sure you want to delete this client?")) deleteClient.mutate(); }} className="gap-1">
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-primary" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Payment Terms</span>
          </div>
          <p className="font-heading text-xl font-bold text-foreground">
            {{ prepaid: "Anticipato", "30_days": "30 gg", "60_days": "60 gg", "90_days": "90 gg", end_of_month: "Fine mese" }[(client as any).payment_terms] || "30 gg"}
          </p>
          <p className="text-xs text-muted-foreground">Listino: {assignedPriceLists && assignedPriceLists.length > 0 ? (assignedPriceLists as any[]).map((plc: any) => plc.price_lists?.name).join(", ") : "—"}</p>
        </div>
        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={16} className="text-primary" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Total Orders</span>
          </div>
          <p className="font-heading text-xl font-bold text-foreground">{totalOrders}</p>
        </div>
        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-primary" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Total Revenue</span>
          </div>
          <p className="font-heading text-xl font-bold text-foreground">€{totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Form + Contacts + Addresses + Bank */}
        <div className="lg:col-span-1 space-y-6">
          {/* Company Details */}
          <div className="glass-card-solid p-6">
            <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2"><Building2 size={16} /> Company Details</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Company Name</Label>
                <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Business Type</Label>
                <Select value={form.business_type || "_custom"} onValueChange={v => { if (v !== "_custom") setForm(f => ({ ...f, business_type: v })); }}>
                  <SelectTrigger className="mt-1 bg-secondary border-border rounded-lg"><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reseller">Reseller</SelectItem>
                    <SelectItem value="Distributor">Distributor</SelectItem>
                    <SelectItem value="Rigger">Rigger</SelectItem>
                    <SelectItem value="Dropshipper">Dropshipper</SelectItem>
                    <SelectItem value="Boat Builder">Boat Builder</SelectItem>
                    <SelectItem value="_custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {(form.business_type && !["Reseller","Distributor","Rigger","Dropshipper","Boat Builder"].includes(form.business_type)) && (
                  <Input value={form.business_type} onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))} placeholder="Enter custom type..." className="mt-2 bg-secondary border-border rounded-lg" />
                )}
                {form.business_type && <Badge className="mt-2 bg-primary/15 text-primary border-0">{form.business_type}</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} /> Country</Label>
                  <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Globe size={10} /> Region</Label>
                  <Input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Website</Label>
                <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">VAT Number</Label>
                <Input value={form.vat_number} onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="glass-card-solid p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><Phone size={16} /> Contacts</h2>
              <Button size="sm" variant="outline" onClick={() => setShowAddContact(true)} className="gap-1 text-xs"><UserPlus size={12} /> Add</Button>
            </div>
            {form.contact_name && (
              <div className="p-3 bg-secondary/50 rounded-lg mb-3 text-sm space-y-1">
                <p className="font-semibold text-foreground">{form.contact_name} <span className="text-muted-foreground font-normal text-xs">· Main</span></p>
                {form.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10} /> {form.email}</p>}
                {form.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {form.phone}</p>}
              </div>
            )}
            {contacts?.map(c => (
              <div key={c.id} className="p-3 bg-secondary/50 rounded-lg mb-2 text-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{c.contact_name} {c.role && <span className="text-muted-foreground font-normal text-xs">· {c.role}</span>}</p>
                    {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10} /> {c.email}</p>}
                    {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {c.phone}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeContact.mutate(c.id)} className="text-destructive h-6 w-6 p-0"><X size={12} /></Button>
                </div>
              </div>
            ))}
            {showAddContact && (
              <div className="p-3 border border-border rounded-lg space-y-2 mt-3">
                <Input placeholder="Name *" value={newContact.contact_name} onChange={e => setNewContact(c => ({ ...c, contact_name: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                <Input placeholder="Role" value={newContact.role} onChange={e => setNewContact(c => ({ ...c, role: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                <Input placeholder="Email" value={newContact.email} onChange={e => setNewContact(c => ({ ...c, email: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                <Input placeholder="Phone" value={newContact.phone} onChange={e => setNewContact(c => ({ ...c, phone: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => addContact.mutate()} disabled={addContact.isPending} className="bg-foreground text-background text-xs flex-1">Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddContact(false)} className="text-xs">Cancel</Button>
                </div>
              </div>
            )}
            {!contacts?.length && !form.contact_name && !showAddContact && (
              <p className="text-xs text-muted-foreground">No contacts added yet</p>
            )}
          </div>

          {/* Shipping Addresses */}
          <div className="glass-card-solid p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><MapPin size={16} /> Shipping Addresses</h2>
              <Button size="sm" variant="outline" onClick={() => setShowAddAddress(true)} className="gap-1 text-xs"><Plus size={12} /> Add</Button>
            </div>
            {addresses?.map((a: any) => (
              <div key={a.id} className="p-3 bg-secondary/50 rounded-lg mb-2 text-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {a.label || "Address"}
                      {a.is_default && <Badge className="ml-2 text-[10px] bg-primary/20 text-primary border-0">Default</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">{[a.address_line, a.city, a.province, a.postal_code, a.country].filter(Boolean).join(", ")}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeAddress.mutate(a.id)} className="text-destructive h-6 w-6 p-0"><X size={12} /></Button>
                </div>
              </div>
            ))}
            {showAddAddress && (
              <div className="p-3 border border-border rounded-lg space-y-2 mt-3">
                <Input placeholder="Label (e.g. Main)" value={newAddr.label} onChange={e => setNewAddr(a => ({ ...a, label: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                <Input placeholder="Address *" value={newAddr.address_line} onChange={e => setNewAddr(a => ({ ...a, address_line: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="City" value={newAddr.city} onChange={e => setNewAddr(a => ({ ...a, city: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                  <Input placeholder="Province" value={newAddr.province} onChange={e => setNewAddr(a => ({ ...a, province: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Postal Code" value={newAddr.postal_code} onChange={e => setNewAddr(a => ({ ...a, postal_code: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                  <Input placeholder="Country" value={newAddr.country} onChange={e => setNewAddr(a => ({ ...a, country: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => addAddress.mutate()} disabled={addAddress.isPending} className="bg-foreground text-background text-xs flex-1">Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddAddress(false)} className="text-xs">Cancel</Button>
                </div>
              </div>
            )}
            {!addresses?.length && !showAddAddress && (
              <p className="text-xs text-muted-foreground">No shipping addresses</p>
            )}
          </div>

          {/* Bank Details */}
          <div className="glass-card-solid p-6">
            <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2"><CreditCard size={16} /> Bank Details</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Account Holder</Label>
                <Input value={bank.account_holder} onChange={e => setBank(b => ({ ...b, account_holder: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Bank Name</Label>
                <Input value={bank.bank_name} onChange={e => setBank(b => ({ ...b, bank_name: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">IBAN</Label>
                <Input value={bank.iban} onChange={e => setBank(b => ({ ...b, iban: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SWIFT / BIC</Label>
                <Input value={bank.swift_bic} onChange={e => setBank(b => ({ ...b, swift_bic: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
              </div>
              <Button size="sm" onClick={() => saveBank.mutate()} disabled={saveBank.isPending} className="w-full bg-foreground text-background hover:bg-foreground/90 gap-1 font-heading font-semibold">
                <Save size={14} /> Save Bank Details
              </Button>
            </div>
          </div>

          {/* Portal Access */}
          <div className="glass-card-solid p-6">
            <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2"><KeyRound size={16} /> Portal Access</h2>
            {client?.user_id ? (
              <div className="space-y-3">
                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-xs text-success font-semibold mb-2">✅ Account Active</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono text-foreground">{client.email}</p>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(client.email || "", "email")}>
                          {copied === "email" ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={async () => {
                        try {
                          const { error } = await supabase.functions.invoke("reset-dealer-password", { body: { email: client.email } });
                          if (error) throw error;
                          toast.success(`Password reset email sent to ${client.email}`);
                        } catch (e) { toast.error(e instanceof Error ? e.message : "Error sending reset"); }
                      }}>
                        <KeyRound size={12} /> Reset Password
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">No portal account created</p>
                <Button size="sm" onClick={() => setShowCreateAccount(true)} className="w-full gap-1" disabled={!client?.email}>
                  <UserPlus size={14} /> Create Dealer Account
                </Button>
                {!client?.email && <p className="text-[10px] text-destructive">⚠️ Please add an email to the client first</p>}
              </div>
            )}
          </div>

          {/* Notification Preferences */}
          <ClientNotificationPreferences clientId={id!} />

          {/* Pricing & Status */}
          <div className="glass-card-solid p-6">
            <h2 className="font-heading font-bold text-foreground mb-4">Pricing & Status</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Price List</Label>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {assignedPriceLists && assignedPriceLists.length > 0
                    ? (assignedPriceLists as any[]).map((plc: any) => plc.price_lists?.name).filter(Boolean).join(", ")
                    : "No price list assigned"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-semibold">Payment Terms</Label>
                <Select value={form.payment_terms || "30_days"} onValueChange={v => setForm(f => ({ ...f, payment_terms: v }))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prepaid">Prepaid</SelectItem>
                    <SelectItem value="30_days">Net 30</SelectItem>
                    <SelectItem value="60_days">Net 60</SelectItem>
                    <SelectItem value="90_days">Net 90</SelectItem>
                    <SelectItem value="end_of_month">End of Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Payment Notes</Label>
                <Textarea value={form.payment_terms_notes || ""} onChange={e => setForm(f => ({ ...f, payment_terms_notes: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" rows={2} placeholder="Special conditions..." />
              </div>

              {/* Dealer Portal Visibility */}
              <div className="glass-card-solid p-4 mt-4 space-y-3">
                <h3 className="font-heading font-bold text-foreground text-sm flex items-center gap-2">
                  <Eye size={14} /> Dealer Portal Visibility
                </h3>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Discount Tiers</p>
                    <p className="text-xs text-muted-foreground">Show discount tiers to the dealer</p>
                  </div>
                  <Switch
                    checked={client?.show_discount_tiers ?? true}
                    onCheckedChange={async (checked) => {
                      const { error } = await supabase.from("clients").update({ show_discount_tiers: checked } as any).eq("id", id!);
                      if (error) toast.error(error.message);
                      else { toast.success("Updated"); queryClient.invalidateQueries({ queryKey: ["admin-client", id] }); }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Goals & Rewards</p>
                    <p className="text-xs text-muted-foreground">Show the Goals & Rewards page to the dealer</p>
                  </div>
                  <Switch
                    checked={client?.show_goals ?? true}
                    onCheckedChange={async (checked) => {
                      const { error } = await supabase.from("clients").update({ show_goals: checked } as any).eq("id", id!);
                      if (error) toast.error(error.message);
                      else { toast.success("Updated"); queryClient.invalidateQueries({ queryKey: ["admin-client", id] }); }
                    }}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">✅ Active</SelectItem>
                    <SelectItem value="inactive">❌ Inactive</SelectItem>
                    <SelectItem value="onboarding">🔄 Onboarding</SelectItem>
                    <SelectItem value="lead">📋 Lead</SelectItem>
                    <SelectItem value="suspended">⛔ Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg min-h-[80px]" />
              </div>
            </div>
          </div>

          <Button onClick={() => updateClient.mutate()} disabled={updateClient.isPending} className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-lg font-heading font-semibold gap-2">
            <Save size={16} /> Save Changes
          </Button>
        </div>

        {/* Right: Tabs - Orders & Communications */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="mb-4 bg-secondary flex-wrap">
              <TabsTrigger value="orders" className="gap-1 text-xs"><ShoppingBag size={14} /> Orders ({totalOrders})</TabsTrigger>
              <TabsTrigger value="communications" className="gap-1 text-xs"><Mail size={14} /> Communications</TabsTrigger>
              <TabsTrigger value="documents" className="gap-1 text-xs"><FileText size={14} /> Documents ({clientDocs?.length || 0})</TabsTrigger>
              <TabsTrigger value="pricing" className="gap-1 text-xs"><Tag size={14} /> Price Lists</TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              <div className="glass-card-solid overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><ShoppingBag size={16} /> Order History</h2>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowCreateOrder(true)}>
                      <PackagePlus size={14} /> Create Manual Order
                    </Button>
                    <Badge variant="outline" className="text-xs">{totalOrders} orders</Badge>
                  </div>
                </div>
                {!orders?.length ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No orders yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Order Code</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Payment</TableHead>
                        <TableHead className="text-xs">Items</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map(o => (
                        <TableRow key={o.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => setSelectedOrder(o)}>
                          <TableCell className="font-mono text-xs font-semibold">{(o as any).order_code || `#${o.id.slice(0, 8)}`}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</TableCell>
                          <TableCell><Badge className={`border-0 text-[10px] ${getOrderStatusColor(o.status || "draft")}`}>{getOrderStatusLabel(o.status || "draft")}</Badge></TableCell>
                          <TableCell>
                            {(o as any).payment_status ? (
                              <Badge className={`border-0 text-[10px] ${getPaymentStatusColor((o as any).payment_status)}`}>{getPaymentStatusLabel((o as any).payment_status)}</Badge>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{(o.order_items as any[])?.length || 0}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">€{Number(o.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Eye size={14} className="text-muted-foreground" />
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {
                                e.stopPropagation();
                                setComposeOrderContext({
                                  orderId: o.id,
                                  orderCode: (o as any).order_code || `#${o.id.slice(0, 8)}`,
                                  orderStatus: o.status,
                                  orderTotal: o.total_amount,
                                  trackingNumber: (o as any).tracking_number,
                                });
                                setShowComposeFromOrder(true);
                              }}>
                                <Send size={12} className="text-primary" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="communications">
              <div className="glass-card-solid p-6">
                <ClientCommunications
                  clientId={id!}
                  clientName={form.company_name}
                  clientEmail={form.email}
                />
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <div className="glass-card-solid p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
                    <FileText size={16} /> Client Documents
                  </h2>
                  <Badge variant="outline" className="text-xs">{clientDocs?.length || 0} files</Badge>
                </div>

                {/* Upload section */}
                <div className="p-4 bg-secondary/50 rounded-lg border border-border mb-6 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Upload New Document</p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[180px]">
                      <label className="text-[10px] text-muted-foreground mb-1 block">Title (optional)</label>
                      <Input
                        placeholder="e.g. Q1 2026 Price List"
                        value={docTitle}
                        onChange={e => setDocTitle(e.target.value)}
                        className="bg-background border-border rounded-lg h-8 text-xs"
                      />
                    </div>
                    <div className="min-w-[160px]">
                      <label className="text-[10px] text-muted-foreground mb-1 block">Category</label>
                      <Select value={docCategory} onValueChange={setDocCategory}>
                        <SelectTrigger className="bg-background border-border rounded-lg h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOC_CATEGORIES.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <input ref={docInputRef} type="file" className="hidden" onChange={handleDocUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.zip" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => docInputRef.current?.click()}
                        disabled={uploadingDoc}
                        className="gap-1.5 text-xs h-8 rounded-lg"
                      >
                        <Upload size={12} />
                        {uploadingDoc ? "Uploading..." : "Select & Upload"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Documents list */}
                {!clientDocs?.length ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <FileText size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No documents uploaded yet.</p>
                    <p className="text-xs mt-1">Upload contracts, price lists, or marketing materials for this client.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clientDocs.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText size={14} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{doc.title || doc.file_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {DOC_CATEGORIES.find(c => c.value === doc.doc_category)?.label || doc.doc_category}
                              {" · "}{doc.file_name}
                              {" · "}{format(new Date(doc.created_at), "dd MMM yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className="text-[10px]">
                            {DOC_CATEGORIES.find(c => c.value === doc.doc_category)?.label || doc.doc_category}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleDocDownload(doc.file_path)}>
                            <Download size={12} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDoc(doc)}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pricing">
              <div className="glass-card-solid p-6 space-y-6">
                <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
                  <Tag size={16} /> Listini Assegnati
                </h2>
                
                {assignedPriceLists && assignedPriceLists.length > 0 ? (
                  <div className="space-y-2">
                    {assignedPriceLists.map((plc: any) => (
                      <div key={plc.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{plc.price_lists?.name}</p>
                          {plc.price_lists?.description && <p className="text-xs text-muted-foreground">{plc.price_lists.description}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20" onClick={async () => {
                          const { error } = await supabase.from("price_list_clients").delete().eq("id", plc.id);
                          if (error) toast.error(error.message);
                          else { toast.success("Listino rimosso"); refetchAssignedLists(); }
                        }}>
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessun listino assegnato a questo cliente.</p>
                )}
                
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Aggiungi listino:</p>
                  <div className="flex flex-wrap gap-2">
                    {allPriceLists?.filter(pl => !assignedPriceLists?.some((a: any) => a.price_list_id === pl.id)).map(pl => (
                      <Button key={pl.id} variant="outline" size="sm" className="text-xs gap-1" onClick={async () => {
                        const { error } = await supabase.from("price_list_clients").insert({ price_list_id: pl.id, client_id: id! } as any);
                        if (error) {
                          if (error.code === "23505") toast.info("Listino già assegnato");
                          else toast.error(error.message);
                        } else {
                          toast.success("Listino assegnato");
                          refetchAssignedLists();
                        }
                      }}>
                        <Plus size={12} /> {pl.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Order Detail Popup */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-lg">Order {(selectedOrder as any).order_code || `#${selectedOrder.id.slice(0, 8)}`}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {fmtDate(selectedOrder.created_at)} · <Badge className={`border-0 text-[10px] ${getOrderStatusColor(selectedOrder.status || "draft")}`}>{getOrderStatusLabel(selectedOrder.status || "draft")}</Badge>
                </p>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm my-4">
                <div><p className="text-muted-foreground text-xs">Payment</p><p className="font-semibold">{(selectedOrder as any).payment_status || "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Shipping</p><p className="font-semibold">€{Number((selectedOrder as any).shipping_cost_client || 0).toFixed(2)}</p></div>
                <div><p className="text-muted-foreground text-xs">Payed Date</p><p className="font-semibold">{fmtDate((selectedOrder as any).payed_date)}</p></div>
                <div><p className="text-muted-foreground text-xs">Delivery Date</p><p className="font-semibold">{fmtDate((selectedOrder as any).delivery_date)}</p></div>
              </div>
              {selectedOrder.notes && (
                <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                    <TableHead className="text-xs text-right">Unit Price</TableHead>
                    <TableHead className="text-xs text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((selectedOrder.order_items || []) as any[]).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="text-sm font-semibold">{item.products?.name || "—"}</p>
                        {item.products?.sku && <p className="text-xs text-muted-foreground font-mono">{item.products.sku}</p>}
                      </TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">€{Number(item.unit_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">€{Number(item.subtotal).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
                <span className="text-sm text-muted-foreground">Products Total</span>
                <span className="font-heading text-lg font-bold">€{Number(selectedOrder.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              {Number((selectedOrder as any).shipping_cost_client || 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">+ Shipping</span>
                  <span className="text-sm text-muted-foreground">€{Number((selectedOrder as any).shipping_cost_client).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={() => { setSelectedOrder(null); navigate(`/admin/orders/${selectedOrder.id}`); }}>
                  Open Full Detail
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Compose Email from Order */}
      {composeOrderContext && (
        <ComposeEmailDialog
          open={showComposeFromOrder}
          onOpenChange={setShowComposeFromOrder}
          clientId={id!}
          clientName={form.company_name}
          clientEmail={form.email}
          orderId={composeOrderContext.orderId}
          orderCode={composeOrderContext.orderCode}
          orderStatus={composeOrderContext.orderStatus}
          orderTotal={composeOrderContext.orderTotal}
          trackingNumber={composeOrderContext.trackingNumber}
        />
      )}

      {/* Create Account Dialog */}
      <Dialog open={showCreateAccount} onOpenChange={setShowCreateAccount}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Crea Account Dealer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={client?.email || ""} disabled className="mt-1 bg-secondary border-border rounded-lg" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Password</Label>
              <div className="flex gap-2">
                <Input value={accountPassword} onChange={e => setAccountPassword(e.target.value)} className="mt-1 bg-secondary border-border rounded-lg font-mono flex-1" />
                <Button variant="outline" size="sm" className="mt-1 shrink-0" onClick={() => setAccountPassword(generatePassword())} title="Regenerate">
                  <RefreshCw size={14} />
                </Button>
              </div>
              {accountPassword.length < 10 && <p className="text-[11px] text-destructive">Min 10 characters</p>}
            </div>
            <Button onClick={createDealerAccount} disabled={creatingAccount || accountPassword.length < 10} className="w-full gap-1">
              <UserPlus size={14} /> {creatingAccount ? "Creazione..." : "Crea Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Order Dialog */}
      <Dialog open={showCreateOrder} onOpenChange={setShowCreateOrder}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">Crea Ordine Manuale</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Crea un ordine manuale per <strong>{client?.company_name}</strong></p>
            
            {/* Product selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase">Aggiungi Prodotti</Label>
              <Select onValueChange={v => {
                const prod = products?.find(p => p.id === v);
                if (prod && !orderItems.find(i => i.product_id === v)) {
                  setOrderItems(prev => [...prev, { product_id: v, quantity: 1, unit_price: Number(prod.price || 0) }]);
                }
              }}>
                <SelectTrigger className="bg-secondary border-border rounded-lg"><SelectValue placeholder="Seleziona prodotto..." /></SelectTrigger>
                <SelectContent>
                  {products?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ""} — €{Number(p.price || 0).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {orderItems.length > 0 && (
              <div className="space-y-2">
                {orderItems.map((item, idx) => {
                  const prod = products?.find(p => p.id === item.product_id);
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{prod?.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{prod?.sku}</p>
                      </div>
                      <Input
                        type="number" min={1} value={item.quantity}
                        onChange={e => setOrderItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: parseInt(e.target.value) || 1 } : it))}
                        className="w-16 h-8 text-sm bg-background border-border rounded-lg text-center"
                      />
                      <Input
                        type="number" min={0} step={0.01} value={item.unit_price}
                        onChange={e => setOrderItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_price: parseFloat(e.target.value) || 0 } : it))}
                        className="w-24 h-8 text-sm bg-background border-border rounded-lg"
                        placeholder="€"
                      />
                      <span className="text-sm font-mono w-20 text-right">€{(item.unit_price * item.quantity).toFixed(2)}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => setOrderItems(prev => prev.filter((_, i) => i !== idx))}>
                        <X size={12} />
                      </Button>
                    </div>
                  );
                })}
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-sm font-heading font-bold">Totale</span>
                  <span className="text-sm font-heading font-bold">€{orderItems.reduce((s, i) => s + i.unit_price * i.quantity, 0).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">Note</Label>
              <Textarea value={newOrderNotes} onChange={e => setNewOrderNotes(e.target.value)} className="mt-1 bg-secondary border-border rounded-lg" placeholder="Note ordine..." rows={2} />
            </div>

            <Button onClick={createManualOrder} disabled={creatingOrder || orderItems.length === 0} className="w-full gap-1 bg-foreground text-background">
              <PackagePlus size={14} /> {creatingOrder ? "Creazione..." : "Crea Ordine"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClientDetail;
