import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Mail, FileText, Tag } from "lucide-react";
import { useClientDetail } from "@/hooks/useClientDetail";
import { ClientHeader } from "@/components/admin/client-detail/ClientHeader";
import { ClientCompanyPanel } from "@/components/admin/client-detail/ClientCompanyPanel";
import { ClientContactsPanel } from "@/components/admin/client-detail/ClientContactsPanel";
import { ClientAddressesPanel } from "@/components/admin/client-detail/ClientAddressesPanel";
import { ClientBankPanel } from "@/components/admin/client-detail/ClientBankPanel";
import { ClientPortalAccessPanel } from "@/components/admin/client-detail/ClientPortalAccessPanel";
import { ClientNotificationPreferences } from "@/components/admin/client-detail/ClientNotificationPreferences";
import { ClientPricingPanel } from "@/components/admin/client-detail/ClientPricingPanel";
import { ClientOrdersTab } from "@/components/admin/client-detail/ClientOrdersTab";
import { ClientDocumentsTab } from "@/components/admin/client-detail/ClientDocumentsTab";
import { ClientPriceListsTab } from "@/components/admin/client-detail/ClientPriceListsTab";
import { ClientCommunications } from "@/components/crm/ClientCommunications";
import { OrderDetailDialog, CreateAccountDialog, CreateOrderDialog, ComposeFromOrderDialog } from "@/components/admin/client-detail/ClientDialogs";

const AdminClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const h = useClientDetail(id);

  if (h.isLoading) return <div className="text-muted-foreground p-6">Loading...</div>;
  if (!h.client) return <div className="text-muted-foreground p-6">Client not found</div>;

  return (
    <div>
      <ClientHeader
        form={h.form} totalOrders={h.totalOrders} totalSpent={h.totalSpent}
        assignedPriceLists={h.assignedPriceLists} client={h.client}
        onBack={() => h.navigate("/admin/clients")}
        onDelete={() => h.deleteClient.mutate()}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <ClientCompanyPanel form={h.form} setForm={h.setForm} />
          <ClientContactsPanel
            form={h.form} contacts={h.contacts}
            newContact={h.newContact} setNewContact={h.setNewContact}
            showAddContact={h.showAddContact} setShowAddContact={h.setShowAddContact}
            addContact={h.addContact} removeContact={h.removeContact}
          />
          <ClientAddressesPanel
            addresses={h.addresses} newAddr={h.newAddr} setNewAddr={h.setNewAddr}
            showAddAddress={h.showAddAddress} setShowAddAddress={h.setShowAddAddress}
            addAddress={h.addAddress} removeAddress={h.removeAddress}
          />
          <ClientBankPanel bank={h.bank} setBank={h.setBank} saveBank={h.saveBank} />
          <ClientPortalAccessPanel
            client={h.client} copied={h.copied} copyToClipboard={h.copyToClipboard}
            resetDealerPassword={h.resetDealerPassword}
            onCreateAccount={() => h.setShowCreateAccount(true)}
          />
          <ClientNotificationPreferences clientId={id!} />
          <ClientPricingPanel
            form={h.form} setForm={h.setForm} client={h.client}
            assignedPriceLists={h.assignedPriceLists}
            togglePortalVisibility={h.togglePortalVisibility}
            updateClient={h.updateClient}
          />
        </div>

        {/* Right: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="mb-4 bg-secondary flex-wrap">
              <TabsTrigger value="orders" className="gap-1 text-xs"><ShoppingBag size={14} /> Orders ({h.totalOrders})</TabsTrigger>
              <TabsTrigger value="communications" className="gap-1 text-xs"><Mail size={14} /> Communications</TabsTrigger>
              <TabsTrigger value="documents" className="gap-1 text-xs"><FileText size={14} /> Documents ({h.clientDocs?.length || 0})</TabsTrigger>
              <TabsTrigger value="pricing" className="gap-1 text-xs"><Tag size={14} /> Price Lists</TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              <ClientOrdersTab
                orders={h.orders} totalOrders={h.totalOrders}
                onSelectOrder={h.setSelectedOrder}
                onComposeFromOrder={(o) => {
                  h.setComposeOrderContext({
                    orderId: o.id, orderCode: o.order_code || `#${o.id.slice(0, 8)}`,
                    orderStatus: o.status, orderTotal: o.total_amount, trackingNumber: o.tracking_number,
                  });
                  h.setShowComposeFromOrder(true);
                }}
                onCreateOrder={() => h.setShowCreateOrder(true)}
              />
            </TabsContent>

            <TabsContent value="communications">
              <div className="glass-card-solid p-6">
                <ClientCommunications clientId={id!} clientName={h.form.company_name} clientEmail={h.form.email} />
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <ClientDocumentsTab
                clientDocs={h.clientDocs} docCategory={h.docCategory} setDocCategory={h.setDocCategory}
                docTitle={h.docTitle} setDocTitle={h.setDocTitle} uploadingDoc={h.uploadingDoc}
                docInputRef={h.docInputRef} handleDocUpload={h.handleDocUpload}
                deleteDoc={h.deleteDoc} handleDocDownload={h.handleDocDownload}
              />
            </TabsContent>

            <TabsContent value="pricing">
              <ClientPriceListsTab
                assignedPriceLists={h.assignedPriceLists} allPriceLists={h.allPriceLists}
                removePriceList={h.removePriceList} assignPriceList={h.assignPriceList}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <OrderDetailDialog selectedOrder={h.selectedOrder} onClose={() => h.setSelectedOrder(null)} onOpenFull={(orderId) => h.navigate(`/admin/orders/${orderId}`)} />
      <ComposeFromOrderDialog open={h.showComposeFromOrder} onOpenChange={h.setShowComposeFromOrder} clientId={id!} form={h.form} composeOrderContext={h.composeOrderContext} />
      <CreateAccountDialog
        open={h.showCreateAccount} onOpenChange={h.setShowCreateAccount} client={h.client}
        accountPassword={h.accountPassword} setAccountPassword={h.setAccountPassword}
        generatePassword={h.generatePassword} creatingAccount={h.creatingAccount}
        createDealerAccount={h.createDealerAccount}
      />
      <CreateOrderDialog
        open={h.showCreateOrder} onOpenChange={h.setShowCreateOrder} client={h.client}
        products={h.products} orderItems={h.orderItems} setOrderItems={h.setOrderItems}
        newOrderNotes={h.newOrderNotes} setNewOrderNotes={h.setNewOrderNotes}
        creatingOrder={h.creatingOrder} createManualOrder={h.createManualOrder}
      />
    </div>
  );
};

export default AdminClientDetail;
