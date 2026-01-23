import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Kanban from "./pages/Kanban";
import Homologation from "./pages/Homologation";
import KitManagement from "./pages/KitManagement";
import CustomerTracking from "./pages/CustomerTracking";
import AccessorySupplyHomologation from "./pages/AccessorySupplyHomologation";
import TechnicianManagement from "./pages/TechnicianManagement";
import Planning from "./pages/Planning";
import Scheduling from "./pages/Scheduling";
import Orders from "./pages/Orders";
import ConfigurationManagement from "./pages/ConfigurationManagement";
import UserManagement from "./pages/UserManagement";
import Kickoff from "./pages/Kickoff";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import SmartRedirect from "@/components/SmartRedirect";
import SegsaleTest from "./pages/SegsaleTest";
import History from "./pages/History";
import EditRequests from "./pages/EditRequests";
import ModuleSelection from "./pages/ModuleSelection";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 60,
    },
  },
});

function App() {
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/auth" element={<Auth />} />
              
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
              
              {/* Orders - requires orders module access */}
              <Route path="/orders" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredModule="orders">
                    <Layout>
                      <Orders />
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
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
