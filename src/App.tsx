
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Kanban from "./pages/Kanban";
import Homologation from "./pages/Homologation";
import Orders from "./pages/Orders";
import ConfigurationManagement from "./pages/ConfigurationManagement";
import UserManagement from "./pages/UserManagement";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import SmartRedirect from "@/components/SmartRedirect";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
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
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/kanban" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <Kanban />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/homologation" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['admin', 'installer']}>
                  <Layout>
                    <Homologation />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <Orders />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/config" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <ConfigurationManagement />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <UserManagement />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
