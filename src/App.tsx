import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import BecomeADealer from "./pages/BecomeADealer";
import NotFound from "./pages/NotFound";

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

// Admin Panel
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClients from "./pages/admin/AdminClients";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminClientDetail from "./pages/admin/AdminClientDetail";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";

// CRM
import CRMDashboard from "./pages/crm/CRMDashboard";
import CRMLeads from "./pages/crm/CRMLeads";
import CRMPipeline from "./pages/crm/CRMPipeline";
import CRMActivities from "./pages/crm/CRMActivities";
import CRMContacts from "./pages/crm/CRMContacts";

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
              <Route path="orders" element={<AdminOrders />} />
              <Route path="requests" element={<AdminRequests />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* CRM */}
            <Route path="/crm" element={
              <ProtectedRoute allowedRoles={["sales", "admin"]}>
                <CRMLayout />
              </ProtectedRoute>
            }>
              <Route index element={<CRMDashboard />} />
              <Route path="leads" element={<CRMLeads />} />
              <Route path="pipeline" element={<CRMPipeline />} />
              <Route path="activities" element={<CRMActivities />} />
              <Route path="contacts" element={<CRMContacts />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
