import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import CookieBanner from "@/components/CookieBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ClientModeProvider } from "@/contexts/ClientModeContext";
import { ComingSoon } from "@/components/portal/ui/ComingSoon";

// Public pages (static — needed immediately)
import Index from "./pages/Index";
import Login from "./pages/Login";
import BecomeADealer from "./pages/BecomeADealer";
import GmailOAuthPopup from "./pages/GmailOAuthPopup";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";

// Layouts (static — wrapping routes)
import PortalLayout from "./layouts/PortalLayout";
import AdminLayout from "./layouts/AdminLayout";
import CRMLayout from "./layouts/CRMLayout";

// ─── Lazy: Dealer Portal ───
const DealerDashboard = lazy(() => import("./pages/portal/DealerDashboard"));
const DealerCatalog = lazy(() => import("./pages/portal/DealerCatalog"));
const DealerOrders = lazy(() => import("./pages/portal/DealerOrders"));
const DealerSupport = lazy(() => import("./pages/portal/DealerSupport"));
const DealerCart = lazy(() => import("./pages/portal/DealerCart"));
const DealerProfile = lazy(() => import("./pages/portal/DealerProfile"));
const DealerNotifications = lazy(() => import("./pages/portal/DealerNotifications"));
const DealerInvoices = lazy(() => import("./pages/portal/DealerInvoices"));

// ─── Lazy: Admin Panel ───
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminClients = lazy(() => import("./pages/admin/AdminClients"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminRequests = lazy(() => import("./pages/admin/AdminRequests"));
const AdminNewOrders = lazy(() => import("./pages/admin/AdminNewOrders"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminClientDetail = lazy(() => import("./pages/admin/AdminClientDetail"));
const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail"));
const AdminImport = lazy(() => import("./pages/admin/AdminImport"));
const AdminPriceLists = lazy(() => import("./pages/admin/AdminPriceLists"));
const AdminProductDetail = lazy(() => import("./pages/admin/AdminProductDetail"));
const AdminSystemMap = lazy(() => import("./pages/admin/AdminSystemMap"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const AdminCMS = lazy(() => import("./pages/admin/AdminCMS"));
const AdminChangelog = lazy(() => import("./pages/admin/AdminChangelog"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));

// ─── Lazy: CRM ───
const CRMDashboard = lazy(() => import("./pages/crm/CRMDashboard"));
const CRMLeads = lazy(() => import("./pages/crm/CRMLeads"));
const CRMActivities = lazy(() => import("./pages/crm/CRMActivities"));
const CRMOrganizations = lazy(() => import("./pages/crm/CRMOrganizations"));
const CRMOrganizationDetail = lazy(() => import("./pages/crm/CRMOrganizationDetail"));
const CRMContactsPeople = lazy(() => import("./pages/crm/CRMContactsPeople"));
const CRMDeals = lazy(() => import("./pages/crm/CRMDeals"));
const CRMDealsPipeline = lazy(() => import("./pages/crm/CRMDealsPipeline"));
const CRMRequests = lazy(() => import("./pages/crm/CRMRequests"));
const CRMEmailTemplates = lazy(() => import("./pages/crm/CRMEmailTemplates"));
const CRMTasks = lazy(() => import("./pages/crm/CRMTasks"));
const CRMAnalytics = lazy(() => import("./pages/crm/CRMAnalytics"));
const CRMAutomations = lazy(() => import("./pages/crm/CRMAutomations"));
const CRMHelp = lazy(() => import("./pages/crm/CRMHelp"));
const CRMOrders = lazy(() => import("./pages/crm/CRMOrders"));
const CRMOrderDetail = lazy(() => import("./pages/crm/CRMOrderDetail"));
const CRMCreateOrder = lazy(() => import("./pages/crm/CRMCreateOrder"));

// ─── Loading Spinner ───
const LazyFallback = () => (
  <div className="flex items-center justify-center h-screen w-full">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 300_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary section="application">
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
                <ClientModeProvider>
                  <PortalLayout />
                </ClientModeProvider>
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<LazyFallback />}><DealerDashboard /></Suspense>} />
              <Route path="catalog" element={<Suspense fallback={<LazyFallback />}><DealerCatalog /></Suspense>} />
              <Route path="orders" element={<Suspense fallback={<LazyFallback />}><DealerOrders /></Suspense>} />
              <Route path="cart" element={<Suspense fallback={<LazyFallback />}><DealerCart /></Suspense>} />
              <Route path="invoices" element={<Suspense fallback={<LazyFallback />}><DealerInvoices /></Suspense>} />
              <Route path="promos" element={<ComingSoon featureName="Promozioni" />} />
              <Route path="goals" element={<ComingSoon featureName="Obiettivi" />} />
              <Route path="marketing" element={<ComingSoon featureName="Marketing" />} />
              <Route path="notifications" element={<Suspense fallback={<LazyFallback />}><DealerNotifications /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<LazyFallback />}><DealerProfile /></Suspense>} />
              <Route path="support" element={<Suspense fallback={<LazyFallback />}><DealerSupport /></Suspense>} />
            </Route>

            {/* Admin Panel */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["admin", "operations"]}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<LazyFallback />}><AdminDashboard /></Suspense>} />
              <Route path="clients" element={<Suspense fallback={<LazyFallback />}><AdminClients /></Suspense>} />
              <Route path="clients/:id" element={<Suspense fallback={<LazyFallback />}><AdminClientDetail /></Suspense>} />
              <Route path="products" element={<Suspense fallback={<LazyFallback />}><AdminProducts /></Suspense>} />
              <Route path="products/:family" element={<Suspense fallback={<LazyFallback />}><AdminProductDetail /></Suspense>} />
              <Route path="orders" element={<Suspense fallback={<LazyFallback />}><AdminOrders /></Suspense>} />
              <Route path="orders/:id" element={<Suspense fallback={<LazyFallback />}><AdminOrderDetail /></Suspense>} />
              <Route path="new-orders" element={<Suspense fallback={<LazyFallback />}><AdminNewOrders /></Suspense>} />
              <Route path="requests" element={<Suspense fallback={<LazyFallback />}><AdminRequests /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<LazyFallback />}><AdminSettings /></Suspense>} />
              <Route path="import" element={<Suspense fallback={<LazyFallback />}><AdminImport /></Suspense>} />
              <Route path="price-lists" element={<Suspense fallback={<LazyFallback />}><AdminPriceLists /></Suspense>} />
              <Route path="system-map" element={<Suspense fallback={<LazyFallback />}><AdminSystemMap /></Suspense>} />
              <Route path="marketing" element={<Suspense fallback={<LazyFallback />}><AdminMarketing /></Suspense>} />
              <Route path="cms" element={<Suspense fallback={<LazyFallback />}><AdminCMS /></Suspense>} />
              {/* Automations accessible only via /crm/automations */}
              <Route path="changelog" element={<Suspense fallback={<LazyFallback />}><AdminChangelog /></Suspense>} />
              <Route path="notifications" element={<Suspense fallback={<LazyFallback />}><AdminNotifications /></Suspense>} />
              <Route path="audit-log" element={<Suspense fallback={<LazyFallback />}><AdminAuditLog /></Suspense>} />
            </Route>

            {/* CRM */}
            <Route path="/crm" element={
              <ProtectedRoute allowedRoles={["sales", "admin"]}>
                <CRMLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<LazyFallback />}><CRMDashboard /></Suspense>} />
              <Route path="requests" element={<Suspense fallback={<LazyFallback />}><CRMRequests /></Suspense>} />
              <Route path="leads" element={<Suspense fallback={<LazyFallback />}><CRMLeads /></Suspense>} />
              <Route path="deals" element={<Suspense fallback={<LazyFallback />}><CRMDeals /></Suspense>} />
              <Route path="deals/pipeline" element={<Suspense fallback={<LazyFallback />}><CRMDealsPipeline /></Suspense>} />
              {/* /crm/pipeline removed — use /crm/deals/pipeline */}
              <Route path="activities" element={<Suspense fallback={<LazyFallback />}><CRMActivities /></Suspense>} />
              <Route path="organizations" element={<Suspense fallback={<LazyFallback />}><CRMOrganizations /></Suspense>} />
              <Route path="organizations/:id" element={<Suspense fallback={<LazyFallback />}><CRMOrganizationDetail /></Suspense>} />
              <Route path="contacts" element={<Suspense fallback={<LazyFallback />}><CRMContactsPeople /></Suspense>} />
              <Route path="email-templates" element={<Suspense fallback={<LazyFallback />}><CRMEmailTemplates /></Suspense>} />
              <Route path="orders" element={<Suspense fallback={<LazyFallback />}><CRMOrders /></Suspense>} />
              <Route path="orders/new" element={<Suspense fallback={<LazyFallback />}><CRMCreateOrder /></Suspense>} />
              <Route path="orders/:id" element={<Suspense fallback={<LazyFallback />}><CRMOrderDetail /></Suspense>} />
              <Route path="tasks" element={<Suspense fallback={<LazyFallback />}><CRMTasks /></Suspense>} />
              <Route path="analytics" element={<Suspense fallback={<LazyFallback />}><CRMAnalytics /></Suspense>} />
              <Route path="automations" element={<Suspense fallback={<LazyFallback />}><CRMAutomations /></Suspense>} />
              <Route path="price-lists" element={<Suspense fallback={<LazyFallback />}><AdminPriceLists /></Suspense>} />
              <Route path="help" element={<Suspense fallback={<LazyFallback />}><CRMHelp /></Suspense>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieBanner />
        </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
