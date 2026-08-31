import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import { Layout } from "@/components/Layout";
import SmartRedirect from "@/components/SmartRedirect";
import { UserRoleProvider } from "@/hooks/useUserRole";
import { FullScreenLoader } from "@/components/ui/loading";
import ScrollToTop from "@/components/ScrollToTop";
import History from "./pages/History";
const Dashboard = lazy(() => import("./pages/Dashboard"));
import Kanban from "./pages/Kanban";
import Homologation from "./pages/Homologation";
const KitManagement = lazy(() => import("./pages/KitManagement"));
const CustomerTracking = lazy(() => import("./pages/CustomerTracking"));
const AccessorySupplyHomologation = lazy(() => import("./pages/AccessorySupplyHomologation"));
const TechnicianManagement = lazy(() => import("./pages/TechnicianManagement"));
const Planning = lazy(() => import("./pages/Planning"));
const Scheduling = lazy(() => import("./pages/Scheduling"));
const ConfigurationManagement = lazy(() => import("./pages/ConfigurationManagement"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Kickoff = lazy(() => import("./pages/Kickoff"));
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import ActivateAccount from "./pages/ActivateAccount";
import ResetPassword from "./pages/ResetPassword";
const NotFound = lazy(() => import("./pages/NotFound"));


const EditRequests = lazy(() => import("./pages/EditRequests"));
const WhatsAppMessageControl = lazy(() => import("./pages/WhatsAppMessageControl"));
const ModuleSelection = lazy(() => import("./pages/ModuleSelection"));
const Installation = lazy(() => import("./pages/Installation"));
const ApiMonitoring = lazy(() => import("./pages/ApiMonitoring"));
const SegsaleSales = lazy(() => import("./pages/SegsaleSales"));
const SegsaleSearch = lazy(() => import("./pages/SegsaleSearch"));
const PlateVerification = lazy(() => import("./pages/PlateVerification"));
const FrotaPendentes = lazy(() => import("./pages/FrotaPendentes"));
const ScheduleDeletionRequests = lazy(() => import("./pages/ScheduleDeletionRequests"));
const FrotaUnitStatus = lazy(() => import("./pages/FrotaUnitStatus"));
const FrotaUnitActivation = lazy(() => import("./pages/FrotaUnitActivation"));
const PendingSalesRecovery = lazy(() => import("./pages/PendingSalesRecovery"));
const Chamados = lazy(() => import("./pages/Chamados"));

const KickoffSimulator = lazy(() => import("./pages/KickoffSimulator"));
const KickoffSimulatorResult = lazy(() => import("./pages/KickoffSimulatorResult"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Never retry on auth/permission errors
        const status = error?.status ?? error?.statusCode ?? error?.code;
        if (status === 401 || status === 403 || status === 404) return false;
        // Max 1 retry for other errors
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 60,
    },
  },
});

const RouteLoadingFallback = () => (
  <FullScreenLoader message="Carregando página..." />
);

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader message="Inicializando aplicação..." />;
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/ativar" element={<ActivateAccount />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Smart redirect based on user role */}
              <Route path="/" element={
                <ProtectedRoute>
                  <SmartRedirect />
                </ProtectedRoute>
              } />
              
              {/* Dashboard - requires dashboard module access */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="dashboard">
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Kanban - requires kanban module access */}
              <Route path="/kanban" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="kanban">
                    <Layout>
                      <Kanban />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Homologation - requires homologation module access */}
              <Route path="/homologation" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="homologation">
                    <Layout>
                      <Homologation />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Kits - requires kits or homologation module access */}
              <Route path="/kits" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModules={['kits', 'homologation']}>
                    <Layout>
                      <KitManagement />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Accessories & Supplies - requires accessories_supplies or homologation module access */}
              <Route path="/accessories-supplies" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModules={['accessories_supplies', 'homologation']}>
                    <Layout>
                      <AccessorySupplyHomologation />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Edit Requests - requires admin/gestor or homologation module access */}
              <Route path="/edit-requests" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="homologation">
                    <Layout>
                      <EditRequests />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Technicians - requires technicians module access */}
              <Route path="/technicians" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="technicians">
                    <Layout>
                      <TechnicianManagement />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Customer Tracking - requires customer_tracking module access */}
              <Route path="/customer-tracking" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="customer_tracking">
                    <Layout>
                      <CustomerTracking />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Planning - requires planning module access */}
              <Route path="/planning" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="planning">
                    <Layout>
                      <Planning />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Scheduling - requires scheduling module access */}
              <Route path="/scheduling" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="scheduling">
                    <Layout>
                      <Scheduling />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              
              {/* Configuration - requires scheduling or homologation module access */}
              <Route path="/config" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModules={['configuration', 'scheduling', 'homologation']}>
                    <Layout>
                      <ConfigurationManagement />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Users - requires users module access */}
              <Route path="/users" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="users">
                    <Layout>
                      <UserManagement />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Kickoff - requires kickoff module access */}
              <Route path="/kickoff" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="kickoff">
                    <Layout>
                      <Kickoff />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />

              <Route path="/kickoff/simulador" element={
                <ProtectedRoute>
                  <Layout>
                    <KickoffSimulator />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/kickoff/simulador/resultado" element={
                <ProtectedRoute>
                  <Layout>
                    <KickoffSimulatorResult />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* History */}
              <Route path="/history" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="history">
                    <Layout>
                      <History />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* WhatsApp Message Control */}
              <Route path="/whatsapp-control" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModules={['whatsapp_control', 'scheduling']}>
                    <Layout>
                      <WhatsAppMessageControl />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />

              {/* Installation */}
              <Route path="/installation" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="installation">
                    <Layout>
                      <Installation />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />

              {/* API Monitoring */}
              <Route path="/api-monitoring" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="api_monitoring">
                    <Layout>
                      <ApiMonitoring />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />

              {/* Plate Verification (Frota/Kafka) */}
              <Route path="/plate-verification" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="plate_verification">
                    <Layout>
                      <PlateVerification />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />

              {/* Schedule Deletion Requests */}
              <Route path="/schedule-deletion-requests" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="schedule_deletion_approval">
                    <Layout>
                      <ScheduleDeletionRequests />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />

              {/* Frota Pendentes */}
              <Route path="/frota-pendentes" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="frota_pendentes">
                    <Layout>
                      <FrotaPendentes />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />

              {/* Frota Unit Status (admin only) */}
              <Route path="/frota-unit-status" element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <FrotaUnitStatus />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />

              {/* Frota Unit Activation (admins + usuários autorizados) */}
              <Route path="/frota-unit-activation" element={
                <ProtectedRoute>
                  <Layout>
                    <FrotaUnitActivation />
                  </Layout>
                </ProtectedRoute>
              } />


              {/* Diagnóstico de Vendas Pendentes (admin only) */}
              <Route path="/pending-sales-recovery" element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <PendingSalesRecovery />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />




              {/* Chamados */}
              <Route path="/chamados" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="chamados">
                    <Layout>
                      <Chamados />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />

              {/* Segsale Sales */}
              <Route path="/segsale-sales" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="segsale_sales">
                    <Layout>
                      <SegsaleSales />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />

              {/* Segsale Search */}
              <Route path="/segsale-search" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="segsale_search">
                    <Layout>
                      <SegsaleSearch />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />


              {/* Module Selection - no special permissions needed */}
              <Route path="/modules" element={
                <ProtectedRoute>
                  <Layout>
                    <ModuleSelection />
                  </Layout>
                </ProtectedRoute>
              } />
              
              
              
              <Route path="*" element={<NotFound />} />
            </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <UserRoleProvider>
              <AppContent />
            </UserRoleProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
