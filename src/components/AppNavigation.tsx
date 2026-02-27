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
  LayoutDashboard,
  MessageSquare,
  History,
  Truck,
  Shield,
  FolderOpen,
  Zap,
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

// Domain-based navigation structure
const navigationDomains: NavGroup[] = [
  {
    label: "Cadastros",
    icon: FolderOpen,
    items: [
      { to: "/kits", label: "Kits", icon: Package, module: "kits" },
      { to: "/accessories-supplies", label: "Acessórios & Insumos", icon: Cog, module: "accessories_supplies" },
      { to: "/config", label: "Gestão de Configurações", icon: Settings, module: "scheduling" },
      { to: "/technicians", label: "Técnicos", icon: Users, module: "technicians" },
      { to: "/users", label: "Usuários", icon: UserCog, module: "users" },
    ]
  },
  {
    label: "Operações",
    icon: Zap,
    items: [
      { to: "/kickoff", label: "Kickoff", icon: Rocket, module: "kickoff" },
      { to: "/homologation", label: "Homologação de Veículos", icon: CheckSquare, module: "homologation" },
      { to: "/planning", label: "Planejamento", icon: Calendar, module: "planning" },
      { to: "/scheduling", label: "Agendamento", icon: Clock, module: "scheduling" },
      { to: "/kanban", label: "Kanban", icon: Kanban, module: "kanban" },
      { to: "/dashboard", label: "Dash Logística", icon: BarChart3, module: "dashboard" },
      { to: "/customer-tracking", label: "Acompanhamento", icon: UserCheck, module: "customer_tracking" },
    ]
  },
  {
    label: "Governança",
    icon: Shield,
    items: [
      { to: "/edit-requests", label: "Solicitações de Edição", icon: FileEdit, module: "homologation", showBadge: true },
      { to: "/history", label: "Histórico", icon: History, module: "users" },
      { to: "/whatsapp-control", label: "Controle de Mensagens", icon: MessageSquare, module: "scheduling" },
    ]
  },
];

export function AppNavigation() {
  const { state, setOpen } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { role, canViewModule, loading } = useUserRole();
  const { count: editRequestsCount } = useEditRequestsCount();
  
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Auto-open group containing the active route
  useEffect(() => {
    if (isCollapsed) {
      setOpenGroups({});
      return;
    }
    const activeGroup = navigationDomains.find(g => g.items.some(i => location.pathname === i.to));
    if (activeGroup && !openGroups[activeGroup.label]) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.label]: true }));
    }
  }, [location.pathname, isCollapsed]);

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
  const isGroupActive = (items: NavItem[]) => items.some(item => isActive(item.to));

  const canAccessItem = (item: NavItem) => {
    if (role === 'admin') return true;
    return canViewModule(item.module);
  };

  const getVisibleDomains = () => {
    return navigationDomains
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  const visibleDomains = getVisibleDomains();

  const renderGroupItem = (item: NavItem) => {
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
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-medium text-sm truncate">{item.label}</span>
              {item.showBadge && editRequestsCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0 flex-shrink-0">
                  {editRequestsCount}
                </Badge>
              )}
            </div>
          )}
        </NavLink>
      </SidebarMenuButton>
    );
  };

  const renderGroup = (group: NavGroup) => {
    const GroupIcon = group.icon;
    const isOpen = openGroups[group.label] || false;
    const groupActive = isGroupActive(group.items);
    const hasBadge = group.items.some(i => i.showBadge) && editRequestsCount > 0;

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
                  {hasBadge && !isOpen && (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0 mr-1">
                      {editRequestsCount}
                    </Badge>
                  )}
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  )}
                </>
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4">
            {group.items.map(renderGroupItem)}
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="safe-area-inset">
        {/* Dashboard / Home */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2">
            {!isCollapsed && "Dashboard"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/modules')}
                  tooltip={isCollapsed ? "Início" : undefined}
                  className="touch-manipulation tap-target"
                >
                  <NavLink to="/modules" className="flex items-center gap-3 px-2 py-2">
                    <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span className="font-medium text-sm">Início</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Domain Groups */}
        {visibleDomains.map((domain) => (
          <SidebarGroup key={domain.label}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2">
              {!isCollapsed && domain.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderGroup(domain)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* User info and logout */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            {!isCollapsed && (
              <div className="px-2 py-2 text-xs text-muted-foreground border-t">
                <div className="mb-2">
                  <div className="font-medium truncate">{user?.email}</div>
                  <div className="text-muted-foreground/70 capitalize">
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
                  className="touch-manipulation tap-target text-destructive hover:text-destructive hover:bg-destructive/10"
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
