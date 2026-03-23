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
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Kanban = lazy(() => import("./pages/Kanban"));
const Homologation = lazy(() => import("./pages/Homologation"));
const KitManagement = lazy(() => import("./pages/KitManagement"));
const CustomerTracking = lazy(() => import("./pages/CustomerTracking"));
const AccessorySupplyHomologation = lazy(() => import("./pages/AccessorySupplyHomologation"));
const TechnicianManagement = lazy(() => import("./pages/TechnicianManagement"));
const Planning = lazy(() => import("./pages/Planning"));
const Scheduling = lazy(() => import("./pages/Scheduling"));
const ConfigurationManagement = lazy(() => import("./pages/ConfigurationManagement"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Kickoff = lazy(() => import("./pages/Kickoff"));
const Auth = lazy(() => import("./pages/Auth"));
const Login = lazy(() => import("./pages/Login"));
const ActivateAccount = lazy(() => import("./pages/ActivateAccount"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SegsaleTest = lazy(() => import("./pages/SegsaleTest"));
const History = lazy(() => import("./pages/History"));
const EditRequests = lazy(() => import("./pages/EditRequests"));
const WhatsAppMessageControl = lazy(() => import("./pages/WhatsAppMessageControl"));
const ModuleSelection = lazy(() => import("./pages/ModuleSelection"));
const Installation = lazy(() => import("./pages/Installation"));
const ApiMonitoring = lazy(() => import("./pages/ApiMonitoring"));


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
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
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
              
              {/* Kits - requires kits module access */}
              <Route path="/kits" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="kits">
                    <Layout>
                      <KitManagement />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Accessories & Supplies - requires accessories_supplies module access */}
              <Route path="/accessories-supplies" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="accessories_supplies">
                    <Layout>
                      <AccessorySupplyHomologation />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* Edit Requests - requires admin or gestor */}
              <Route path="/edit-requests" element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['gestor', 'admin']}>
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
              
              
              {/* Configuration - requires scheduling module access */}
              <Route path="/config" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="scheduling">
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
                    <UserManagement />
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
              
              {/* History - requires admin */}
              <Route path="/history" element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <History />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              
              {/* WhatsApp Message Control - under Configuração */}
              <Route path="/whatsapp-control" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="scheduling">
                    <Layout>
                      <WhatsAppMessageControl />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />

              {/* Installation - admin only */}
              <Route path="/installation" element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <Installation />
                    </Layout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />

              {/* API Monitoring - admin only */}
              <Route path="/api-monitoring" element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <ApiMonitoring />
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
              
              
              <Route path="/segsale-test" element={<SegsaleTest />} />
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
            <AppContent />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
