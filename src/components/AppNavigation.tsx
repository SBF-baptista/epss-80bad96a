
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { 
  BarChart3, 
  Kanban, 
  Settings, 
  CheckSquare,
  ShoppingCart,
  Users,
  UserCog,
  LogOut,
  Package,
  Cog,
  ChevronRight,
  ChevronDown,
  Calendar,
  UserCheck,
  Rocket
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
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";

// Definindo grupos de navegação
const navigationGroups = {
  homologation: {
    label: "Homologação",
    icon: CheckSquare,
    roles: ["admin", "installer"],
    items: [
      { 
        to: "/homologation", 
        label: "Homologação de Veículos", 
        icon: CheckSquare,
        roles: ["admin", "installer"]
      },
      { 
        to: "/kits", 
        label: "Kits", 
        icon: Package,
        roles: ["admin", "installer"]
      },
      { 
        to: "/accessories-supplies", 
        label: "Acessórios & Insumos", 
        icon: Cog,
        roles: ["admin", "installer"]
      },
      { 
        to: "/config", 
        label: "Gestão de Configurações", 
        icon: Settings,
        roles: ["admin"]
      }
    ]
  },
  orders: {
    label: "Esteira de Pedidos",
    icon: BarChart3,
    roles: ["admin", "order_manager"],
    items: [
      { 
        to: "/kanban", 
        label: "Kanban", 
        icon: Kanban,
        roles: ["admin", "order_manager"]
      },
      { 
        to: "/dashboard", 
        label: "Dash Esteira de Pedidos", 
        icon: BarChart3,
        roles: ["admin"]
      }
    ]
  },
  configuration: {
    label: "Configuração",
    icon: Settings,
    roles: ["admin", "installer"],
    items: [
      { 
        to: "/technicians", 
        label: "Técnicos", 
        icon: Users,
        roles: ["admin", "installer"]
      },
      { 
        to: "/users", 
        label: "Usuários", 
        icon: UserCog,
        roles: ["admin"]
      }
    ]
  }
};

// Itens individuais (não agrupados) - na ordem do fluxo operacional
const singleNavigationItems = [
  { 
    to: "/kickoff", 
    label: "Kickoff", 
    icon: Rocket,
    description: "Kickoff e planejamento de projetos",
    roles: ["admin", "installer"]
  },
  { 
    to: "/planning", 
    label: "Planejamento", 
    icon: Calendar,
    description: "Gestão de técnicos, kits e cronograma",
    roles: ["admin", "installer"]
  },
  { 
    to: "/customer-tracking", 
    label: "Acompanhamento de Clientes", 
    icon: UserCheck,
    description: "Acompanhar status dos clientes e kits",
    roles: ["admin", "installer"]
  },
];

export function AppNavigation() {
  const { state, setOpen } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { role, loading } = useUserRole();
  
  // Estados para controlar abertura dos dropdowns
  const [homologationOpen, setHomologationOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [configurationOpen, setConfigurationOpen] = useState(false);

  // Função para expandir sidebar e abrir dropdown
  const handleDropdownToggle = (
    isOpen: boolean,
    setIsOpen: (value: boolean) => void
  ) => {
    if (isCollapsed && !isOpen) {
      setOpen(true); // Expande a sidebar
    }
    setIsOpen(!isOpen); // Toggle do dropdown
  };

  const isActive = (path: string) => location.pathname === path;
  
  // Verificar se algum item do grupo está ativo
  const isGroupActive = (items: any[]) => {
    return items.some(item => isActive(item.to));
  };

  // Filtrar grupos e itens baseado no papel do usuário
  const canAccessGroup = (groupRoles: string[]) => {
    if (!role) return false;
    return groupRoles.includes(role);
  };

  const canAccessItem = (itemRoles: string[]) => {
    if (!role) return false;
    return itemRoles.includes(role);
  };

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
          <SidebarGroupLabel className="text-base font-bold text-white px-2">
            {!isCollapsed && "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              
              {/* Item: Kickoff */}
              {singleNavigationItems
                .filter(item => item.to === "/kickoff" && canAccessItem(item.roles))
                .map((item) => {
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

              {/* Grupo Homologação */}
              {canAccessGroup(navigationGroups.homologation.roles) && (
                <SidebarMenuItem>
                  <Collapsible open={homologationOpen} onOpenChange={setHomologationOpen}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        className="w-full justify-between touch-manipulation tap-target"
                        tooltip={isCollapsed ? navigationGroups.homologation.label : undefined}
                        onClick={(e) => {
                          if (isCollapsed) {
                            e.preventDefault();
                            handleDropdownToggle(homologationOpen, setHomologationOpen);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <navigationGroups.homologation.icon className="h-4 w-4 flex-shrink-0" />
                          {!isCollapsed && <span className="font-medium text-sm">{navigationGroups.homologation.label}</span>}
                        </div>
                        {!isCollapsed && (
                          homologationOpen ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-4">
                      {navigationGroups.homologation.items
                        .filter(item => canAccessItem(item.roles))
                        .map((item) => {
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
                                {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                              </NavLink>
                            </SidebarMenuButton>
                          );
                        })}
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {/* Item: Planejamento */}
              {singleNavigationItems
                .filter(item => item.to === "/planning" && canAccessItem(item.roles))
                .map((item) => {
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

              {/* Grupo Esteira de Pedidos */}
              {canAccessGroup(navigationGroups.orders.roles) && (
                <SidebarMenuItem>
                  <Collapsible open={ordersOpen} onOpenChange={setOrdersOpen}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        className="w-full justify-between touch-manipulation tap-target"
                        tooltip={isCollapsed ? navigationGroups.orders.label : undefined}
                        onClick={(e) => {
                          if (isCollapsed) {
                            e.preventDefault();
                            handleDropdownToggle(ordersOpen, setOrdersOpen);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <navigationGroups.orders.icon className="h-4 w-4 flex-shrink-0" />
                          {!isCollapsed && <span className="font-medium text-sm">{navigationGroups.orders.label}</span>}
                        </div>
                        {!isCollapsed && (
                          ordersOpen ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-4">
                      {navigationGroups.orders.items
                        .filter(item => canAccessItem(item.roles))
                        .map((item) => {
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
                                {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                              </NavLink>
                            </SidebarMenuButton>
                          );
                        })}
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {/* Item: Acompanhamento de Clientes */}
              {singleNavigationItems
                .filter(item => item.to === "/customer-tracking" && canAccessItem(item.roles))
                .map((item) => {
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

              {/* Grupo Configuração */}
              {canAccessGroup(navigationGroups.configuration.roles) && (
                <SidebarMenuItem>
                  <Collapsible open={configurationOpen} onOpenChange={setConfigurationOpen}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        className="w-full justify-between touch-manipulation tap-target"
                        tooltip={isCollapsed ? navigationGroups.configuration.label : undefined}
                        onClick={(e) => {
                          if (isCollapsed) {
                            e.preventDefault();
                            handleDropdownToggle(configurationOpen, setConfigurationOpen);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <navigationGroups.configuration.icon className="h-4 w-4 flex-shrink-0" />
                          {!isCollapsed && <span className="font-medium text-sm">{navigationGroups.configuration.label}</span>}
                        </div>
                        {!isCollapsed && (
                          configurationOpen ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-4">
                      {navigationGroups.configuration.items
                        .filter(item => canAccessItem(item.roles))
                        .map((item) => {
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
                                {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                              </NavLink>
                            </SidebarMenuButton>
                          );
                        })}
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

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
                     role === 'gestor' ? 'Gestor' : 
                     role === 'operador_kickoff' ? 'Operador de Kickoff' :
                     role === 'operador_homologacao' ? 'Operador de Homologação' :
                     role === 'operador_agendamento' ? 'Operador de Agendamento' :
                     role === 'operador_suprimentos' ? 'Operador de Suprimentos' : role}
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
