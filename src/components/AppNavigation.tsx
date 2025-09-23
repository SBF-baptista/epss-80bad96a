
import { NavLink, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  Kanban, 
  Settings, 
  CheckSquare,
  ShoppingCart,
  Users,
  LogOut,
  Package,
  Cog
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { 
    to: "/homologation", 
    label: "Homologação", 
    icon: CheckSquare,
    description: "Processo de homologação de veículos",
    roles: ["admin", "installer"]
  },
  { 
    to: "/kits", 
    label: "Kits", 
    icon: Package,
    description: "Gerenciamento de kits de homologação",
    roles: ["admin", "installer"]
  },
  { 
    to: "/accessories-supplies", 
    label: "Acessórios & Insumos", 
    icon: Cog,
    description: "Homologação de acessórios e insumos",
    roles: ["admin", "installer"]
  },
  { 
    to: "/dashboard", 
    label: "Dash esteira de pedidos", 
    icon: BarChart3,
    description: "Análises e relatórios",
    roles: ["admin"]
  },
  { 
    to: "/kanban", 
    label: "Kanban", 
    icon: Kanban,
    description: "Gestão de pedidos",
    roles: ["admin", "order_manager"]
  },
  { 
    to: "/config", 
    label: "Configurações", 
    icon: Settings,
    description: "Configurações do sistema",
    roles: ["admin"]
  },
  { 
    to: "/users", 
    label: "Usuários", 
    icon: Users,
    description: "Gerenciar usuários e permissões",
    roles: ["admin"]
  },
];

export function AppNavigation() {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { role, loading } = useUserRole();

  const isActive = (path: string) => location.pathname === path;

  // Filter navigation items based on user role
  const filteredNavigationItems = navigationItems.filter(item => {
    if (!role) return false;
    return item.roles.includes(role);
  });

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <Sidebar collapsible="icon" className="border-r">
        <SidebarContent className="safe-area-inset">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="safe-area-inset">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-gray-700 px-2">
            {!isCollapsed && "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.to)}
                      tooltip={isCollapsed ? item.label : undefined}
                      className="touch-manipulation tap-target"
                    >
                      <NavLink to={item.to} className="flex items-center gap-3 px-2 py-2">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User info and logout */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            {!isCollapsed && (
              <div className="px-2 py-2 text-xs text-gray-600 border-t">
                <div className="mb-2">
                  <div className="font-medium truncate">{user?.email}</div>
                  <div className="text-gray-500 capitalize">
                    {role === 'admin' ? 'Administrador' : 
                     role === 'installer' ? 'Instalador' : 
                     role === 'order_manager' ? 'Gestor de Pedidos' : role}
                  </div>
                </div>
              </div>
            )}
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleSignOut}
                  tooltip={isCollapsed ? "Sair" : undefined}
                  className="touch-manipulation tap-target text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium text-sm">Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
