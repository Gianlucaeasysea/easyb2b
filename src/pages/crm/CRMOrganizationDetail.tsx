import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Handshake, ShoppingBag, Mail, Clock, FileText, Tag, StickyNote } from "lucide-react";
import { useOrganizationDetail } from "@/hooks/useOrganizationDetail";
import { OrganizationHeader } from "@/components/crm/organization-detail/OrganizationHeader";
import { OrganizationStatsBar } from "@/components/crm/organization-detail/OrganizationStatsBar";
import { OverviewTab } from "@/components/crm/organization-detail/OverviewTab";
import { OrganizationContactsTab } from "@/components/crm/organization-detail/OrganizationContactsTab";
import { OrganizationDealsTab } from "@/components/crm/organization-detail/OrganizationDealsTab";
import { OrganizationOrdersTab } from "@/components/crm/organization-detail/OrganizationOrdersTab";
import { OrganizationActivitiesTab } from "@/components/crm/organization-detail/OrganizationActivitiesTab";
import { OrganizationTasksTab } from "@/components/crm/organization-detail/OrganizationTasksTab";
import { OrganizationDocumentsTab } from "@/components/crm/organization-detail/OrganizationDocumentsTab";
import { OrganizationPricingTab } from "@/components/crm/organization-detail/OrganizationPricingTab";
import { OrganizationNotesTab } from "@/components/crm/organization-detail/OrganizationNotesTab";
import { ClientCommunications } from "@/components/crm/ClientCommunications";
import { ComposeEmailDialog } from "@/components/crm/ComposeEmailDialog";
import { CRMOrderDetailModal } from "@/components/crm/CRMOrderDetailModal";

const CRMOrganizationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeOrderCtx, setComposeOrderCtx] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const {
    client, isLoading, orders, contacts, addresses, activities, orgTasks, orgDeals,
    documents, assignedPriceLists, priceListItemCounts, allPriceLists, discountTiers,
    totalSpent, saveContact, deleteContact, addActivity, addTask, completeTask,
    saveNotes, updatePaymentTerms, assignPriceList, removePriceList,
    createCredentials, deleteCredentials, resetPassword, updateVisibility,
  } = useOrganizationDetail(id);

  if (isLoading) return <div className="text-muted-foreground p-6">Loading...</div>;
  if (!client) return <div className="text-muted-foreground p-6">Organization not found</div>;

  const totalOrders = orders.length;

  return (
    <div>
      <OrganizationHeader client={client} onBack={() => navigate(-1)} onCompose={() => setComposeOpen(true)} />
      <OrganizationStatsBar client={client} totalOrders={totalOrders} totalSpent={totalSpent} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 bg-secondary flex-wrap">
          <TabsTrigger value="overview" className="gap-1 text-xs"><Building2 size={14} /> Overview</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1 text-xs"><Users size={14} /> Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="deals" className="gap-1 text-xs"><Handshake size={14} /> Deals</TabsTrigger>
          <TabsTrigger value="orders" className="gap-1 text-xs"><ShoppingBag size={14} /> Orders ({totalOrders})</TabsTrigger>
          <TabsTrigger value="communications" className="gap-1 text-xs"><Mail size={14} /> Communications</TabsTrigger>
          <TabsTrigger value="activities" className="gap-1 text-xs"><Clock size={14} /> Activities</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1 text-xs"><FileText size={14} /> Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-1 text-xs"><Tag size={14} /> Pricing & Discounts</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1 text-xs"><StickyNote size={14} /> Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            client={client} addresses={addresses} orgDeals={orgDeals} orders={orders} activities={activities}
            onUpdatePaymentTerms={updatePaymentTerms} onCreateCredentials={createCredentials}
            onDeleteCredentials={deleteCredentials} onResetPassword={resetPassword}
          />
        </TabsContent>

        <TabsContent value="contacts">
          <OrganizationContactsTab contacts={contacts} onSaveContact={saveContact} onDeleteContact={deleteContact} />
        </TabsContent>

        <TabsContent value="deals">
          <OrganizationDealsTab clientId={id!} clientName={client.company_name} contacts={contacts} navigate={navigate} />
        </TabsContent>

        <TabsContent value="orders">
          <OrganizationOrdersTab
            orders={orders} clientStatus={client.status || "lead"}
            onSelectOrder={setSelectedOrderId}
            onComposeForOrder={(ctx) => { setComposeOrderCtx(ctx); setComposeOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="communications">
          <div className="glass-card-solid p-6">
            <ClientCommunications
              clientId={id!} clientName={client.company_name} clientEmail={client.email || ""}
              contactEmails={contacts.map((c: any) => c.email).filter(Boolean) as string[]}
            />
          </div>
        </TabsContent>

        <TabsContent value="activities">
          <OrganizationActivitiesTab activities={activities} contacts={contacts} onAddActivity={addActivity} />
          <OrganizationTasksTab tasks={orgTasks} onAddTask={addTask} onCompleteTask={completeTask} />
        </TabsContent>

        <TabsContent value="documents">
          <OrganizationDocumentsTab documents={documents} />
        </TabsContent>

        <TabsContent value="pricing">
          <OrganizationPricingTab
            clientId={id!} client={client} discountTiers={discountTiers} allPriceLists={allPriceLists}
            assignedPriceLists={assignedPriceLists as any} priceListItemCounts={priceListItemCounts}
            onAssignPriceList={assignPriceList} onRemovePriceList={removePriceList} onUpdateVisibility={updateVisibility}
          />
        </TabsContent>

        <TabsContent value="notes">
          <OrganizationNotesTab notes={client.notes} activities={activities} onSaveNotes={saveNotes} />
        </TabsContent>
      </Tabs>

      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={(open) => { setComposeOpen(open); if (!open) setComposeOrderCtx(null); }}
        clientId={id!} clientName={client.company_name} clientEmail={client.email || ""}
        orderId={composeOrderCtx?.orderId} orderCode={composeOrderCtx?.orderCode}
        orderStatus={composeOrderCtx?.orderStatus} orderTotal={composeOrderCtx?.orderTotal}
        trackingNumber={composeOrderCtx?.trackingNumber}
      />

      <CRMOrderDetailModal
        open={!!selectedOrderId}
        onOpenChange={(open) => { if (!open) setSelectedOrderId(null); }}
        orderId={selectedOrderId}
      />
    </div>
  );
};

export default CRMOrganizationDetail;
