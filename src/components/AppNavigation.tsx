
import { NavLink, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  Kanban, 
  Settings, 
  CheckSquare,
  ShoppingCart
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

const navigationItems = [
  { 
    to: "/homologation", 
    label: "Homologação", 
    icon: CheckSquare,
    description: "Processo de homologação de veículos"
  },
  { 
    to: "/dashboard", 
    label: "Dash esteira de pedidos", 
    icon: BarChart3,
    description: "Análises e relatórios"
  },
  { 
    to: "/kanban", 
    label: "Kanban", 
    icon: Kanban,
    description: "Gestão de pedidos"
  },
  { 
    to: "/orders", 
    label: "Pedidos", 
    icon: ShoppingCart,
    description: "Gerenciar pedidos"
  },
  { 
    to: "/config", 
    label: "Configurações", 
    icon: Settings,
    description: "Configurações do sistema"
  },
];

export function AppNavigation() {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="safe-area-inset">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-gray-700 px-2">
            {!isCollapsed && "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
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
      </SidebarContent>
    </Sidebar>
  );
}
