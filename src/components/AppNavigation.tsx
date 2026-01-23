import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  BarChart3, 
  Kanban, 
  Settings, 
  CheckSquare,
  Users,
  UserCog,
  LogOut,
  Package,
  Cog,
  ChevronRight,
  ChevronDown,
  Calendar,
  UserCheck,
  Rocket,
  Clock,
  FileEdit,
  Home
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useEditRequestsCount } from "@/hooks/useEditRequestsCount";
import { AppModule } from "@/types/permissions";

// Navigation items with module-based permissions
interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  module: AppModule;
  showBadge?: boolean;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

// Navigation structure
const navigationGroups: NavGroup[] = [
  {
    label: "Homologação",
    icon: CheckSquare,
    items: [
      { to: "/homologation", label: "Homologação de Veículos", icon: CheckSquare, module: "homologation" },
      { to: "/kits", label: "Kits", icon: Package, module: "kits" },
      { to: "/accessories-supplies", label: "Acessórios & Insumos", icon: Cog, module: "accessories_supplies" },
      { to: "/config", label: "Gestão de Configurações", icon: Settings, module: "scheduling" },
    ]
  },
  {
    label: "Logística",
    icon: BarChart3,
    items: [
      { to: "/kanban", label: "Kanban", icon: Kanban, module: "kanban" },
      { to: "/orders", label: "Pedidos", icon: Package, module: "orders" },
      { to: "/dashboard", label: "Dash Logística", icon: BarChart3, module: "dashboard" },
    ]
  },
  {
    label: "Planejamento",
    icon: Calendar,
    items: [
      { to: "/planning", label: "Planejamento", icon: Calendar, module: "planning" },
      { to: "/scheduling", label: "Agendamento", icon: Clock, module: "scheduling" },
    ]
  },
  {
    label: "Configuração",
    icon: Settings,
    items: [
      { to: "/technicians", label: "Técnicos", icon: Users, module: "technicians" },
      { to: "/users", label: "Usuários", icon: UserCog, module: "users" },
    ]
  },
];

// Single navigation items
const singleNavigationItems: NavItem[] = [
  { to: "/kickoff", label: "Kickoff", icon: Rocket, module: "kickoff" },
  { to: "/customer-tracking", label: "Acompanhamento de Clientes", icon: UserCheck, module: "customer_tracking" },
];

// Special items that require specific roles
const adminOnlyItems: NavItem[] = [
  { to: "/edit-requests", label: "Solicitações de Edição", icon: FileEdit, module: "homologation", showBadge: true },
  { to: "/history", label: "Histórico", icon: Clock, module: "users" },
];

export function AppNavigation() {
  const { state, setOpen } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { role, canViewModule, loading } = useUserRole();
  const { count: editRequestsCount } = useEditRequestsCount();
  
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Collapse all dropdowns when sidebar is collapsed
  useEffect(() => {
    if (isCollapsed) {
      setOpenGroups({});
    }
  }, [isCollapsed]);

  const handleGroupToggle = (groupLabel: string) => {
    if (isCollapsed) {
      setOpen(true);
    }
    setOpenGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  const isActive = (path: string) => location.pathname === path;
  
  const isGroupActive = (items: NavItem[]) => {
    return items.some(item => isActive(item.to));
  };

  // Filter items based on module permissions
  const canAccessItem = (item: NavItem) => {
    if (role === 'admin') return true;
    return canViewModule(item.module);
  };

  // Filter groups to show only those with accessible items
  const getVisibleGroups = () => {
    return navigationGroups
      .map(group => ({
        ...group,
        items: group.items.filter(canAccessItem)
      }))
      .filter(group => group.items.length > 0);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const getRoleLabel = (r: string | null) => {
    switch (r) {
      case 'admin': return 'Administrador';
      case 'gestor': return 'Gestor';
      case 'operador': return 'Operador';
      case 'visualizador': return 'Visualizador';
      default: return r || 'Sem função';
    }
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

  const visibleGroups = getVisibleGroups();
  const visibleSingleItems = singleNavigationItems.filter(canAccessItem);
  const visibleAdminItems = (role === 'admin' || role === 'gestor') 
    ? adminOnlyItems.filter(canAccessItem) 
    : [];

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="safe-area-inset">
        <SidebarGroup>
          <SidebarGroupLabel className="text-base font-bold text-white px-2">
            {!isCollapsed && "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Home */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/modules')}
                  tooltip={isCollapsed ? "Início" : undefined}
                  className="touch-manipulation tap-target"
                >
                  <NavLink to="/modules" className="flex items-center gap-3 px-2 py-2">
                    <Home className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span className="font-medium text-sm">Início</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Single Navigation Items */}
              {visibleSingleItems.map((item) => {
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
                        {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Navigation Groups */}
              {visibleGroups.map((group) => {
                const GroupIcon = group.icon;
                const isOpen = openGroups[group.label] || false;
                const groupActive = isGroupActive(group.items);
                
                return (
                  <SidebarMenuItem key={group.label}>
                    <Collapsible open={isOpen} onOpenChange={() => handleGroupToggle(group.label)}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={isCollapsed ? group.label : undefined}
                          className={`touch-manipulation tap-target ${groupActive ? 'bg-accent' : ''}`}
                        >
                          <GroupIcon className="h-4 w-4 flex-shrink-0" />
                          {!isCollapsed && (
                            <>
                              <span className="font-medium text-sm flex-1 truncate">{group.label}</span>
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 flex-shrink-0" />
                              )}
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <SidebarMenuButton
                              key={item.to}
                              asChild
                              isActive={isActive(item.to)}
                              className="touch-manipulation tap-target"
                            >
                              <NavLink to={item.to} className="flex items-center gap-3 px-2 py-2">
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                {!isCollapsed && (
                                  <span className="font-medium text-sm truncate">{item.label}</span>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                );
              })}

              {/* Admin Only Items */}
              {visibleAdminItems.map((item) => {
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
                        {!isCollapsed && (
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-medium text-sm truncate">{item.label}</span>
                            {item.showBadge && editRequestsCount > 0 && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                {editRequestsCount}
                              </Badge>
                            )}
                          </div>
                        )}
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
                    {getRoleLabel(role)}
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
                  {!isCollapsed && <span className="font-medium text-sm">Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
