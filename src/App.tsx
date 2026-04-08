import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import CookieBanner from "@/components/CookieBanner";

// Public pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import BecomeADealer from "./pages/BecomeADealer";
import GmailOAuthPopup from "./pages/GmailOAuthPopup";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";

// Layouts
import PortalLayout from "./layouts/PortalLayout";
import AdminLayout from "./layouts/AdminLayout";
import CRMLayout from "./layouts/CRMLayout";

// Dealer Portal
import DealerDashboard from "./pages/portal/DealerDashboard";
import DealerCatalog from "./pages/portal/DealerCatalog";
import DealerOrders from "./pages/portal/DealerOrders";
import DealerPromos from "./pages/portal/DealerPromos";
import DealerGoals from "./pages/portal/DealerGoals";
import DealerMarketing from "./pages/portal/DealerMarketing";
import DealerSupport from "./pages/portal/DealerSupport";
import DealerCart from "./pages/portal/DealerCart";
import DealerProfile from "./pages/portal/DealerProfile";
import DealerNotifications from "./pages/portal/DealerNotifications";

// Admin Panel
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClients from "./pages/admin/AdminClients";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminNewOrders from "./pages/admin/AdminNewOrders";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminClientDetail from "./pages/admin/AdminClientDetail";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminImport from "./pages/admin/AdminImport";
import AdminPriceLists from "./pages/admin/AdminPriceLists";
import AdminProductDetail from "./pages/admin/AdminProductDetail";
import AdminSystemMap from "./pages/admin/AdminSystemMap";
import AdminMarketing from "./pages/admin/AdminMarketing";
import AdminCMS from "./pages/admin/AdminCMS";
import AdminChangelog from "./pages/admin/AdminChangelog";
import AdminNotifications from "./pages/admin/AdminNotifications";

// CRM
import CRMDashboard from "./pages/crm/CRMDashboard";
import CRMLeads from "./pages/crm/CRMLeads";
// CRMPipeline removed — replaced by deals pipeline
import CRMActivities from "./pages/crm/CRMActivities";
import CRMOrganizations from "./pages/crm/CRMOrganizations";
import CRMOrganizationDetail from "./pages/crm/CRMOrganizationDetail";
import CRMContactsPeople from "./pages/crm/CRMContactsPeople";
import CRMDeals from "./pages/crm/CRMDeals";
import CRMDealsPipeline from "./pages/crm/CRMDealsPipeline";
import CRMRequests from "./pages/crm/CRMRequests";
import CRMEmailTemplates from "./pages/crm/CRMEmailTemplates";
import CRMTasks from "./pages/crm/CRMTasks";
import CRMAnalytics from "./pages/crm/CRMAnalytics";
import CRMAutomations from "./pages/crm/CRMAutomations";
import CRMHelp from "./pages/crm/CRMHelp";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/become-a-dealer" element={<BecomeADealer />} />
            <Route path="/diventa-distributore" element={<BecomeADealer />} />
            <Route path="/oauth/gmail-popup" element={<GmailOAuthPopup />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />

            {/* Dealer Portal */}
            <Route path="/portal" element={
              <ProtectedRoute allowedRoles={["dealer"]}>
                <PortalLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DealerDashboard />} />
              <Route path="catalog" element={<DealerCatalog />} />
              <Route path="orders" element={<DealerOrders />} />
              <Route path="cart" element={<DealerCart />} />
              <Route path="promos" element={<DealerPromos />} />
              <Route path="goals" element={<DealerGoals />} />
              <Route path="marketing" element={<DealerMarketing />} />
              <Route path="notifications" element={<DealerNotifications />} />
              <Route path="profile" element={<DealerProfile />} />
              <Route path="support" element={<DealerSupport />} />
            </Route>

            {/* Admin Panel */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["admin", "operations"]}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="clients/:id" element={<AdminClientDetail />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/:family" element={<AdminProductDetail />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="new-orders" element={<AdminNewOrders />} />
              <Route path="requests" element={<AdminRequests />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="import" element={<AdminImport />} />
              <Route path="price-lists" element={<AdminPriceLists />} />
              <Route path="system-map" element={<AdminSystemMap />} />
              <Route path="marketing" element={<AdminMarketing />} />
              <Route path="cms" element={<AdminCMS />} />
              <Route path="automations" element={<CRMAutomations />} />
              <Route path="changelog" element={<AdminChangelog />} />
              <Route path="notifications" element={<AdminNotifications />} />
            </Route>

            {/* CRM */}
            <Route path="/crm" element={
              <ProtectedRoute allowedRoles={["sales", "admin"]}>
                <CRMLayout />
              </ProtectedRoute>
            }>
              <Route index element={<CRMDashboard />} />
              <Route path="requests" element={<CRMRequests />} />
              <Route path="leads" element={<CRMLeads />} />
              <Route path="deals" element={<CRMDeals />} />
              <Route path="deals/pipeline" element={<CRMDealsPipeline />} />
              {/* /crm/pipeline removed — use /crm/deals/pipeline */}
              <Route path="activities" element={<CRMActivities />} />
              <Route path="organizations" element={<CRMOrganizations />} />
              <Route path="organizations/:id" element={<CRMOrganizationDetail />} />
              <Route path="contacts" element={<CRMContactsPeople />} />
              <Route path="email-templates" element={<CRMEmailTemplates />} />
              <Route path="tasks" element={<CRMTasks />} />
              <Route path="analytics" element={<CRMAnalytics />} />
              <Route path="automations" element={<CRMAutomations />} />
              <Route path="help" element={<CRMHelp />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieBanner />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
