import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { LogOut, ChevronRight } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useEditRequestsCount } from "@/hooks/useEditRequestsCount";
import { useFrotaUnitFailedCount } from "@/hooks/useFrotaUnitFailedCount";
import { useUnitActivationPermission } from "@/hooks/useUnitActivationPermission";
import { NAV_SECTIONS, NavItem, NavGroup, NavSection } from "@/config/navigation";

const getRoleLabel = (r: string | null) => {
  switch (r) {
    case "admin": return "Administrador";
    case "gestor": return "Gestor";
    case "operador": return "Operador";
    case "visualizador": return "Visualizador";
    default: return r || "Sem função";
  }
};

export function AppNavigation() {
  const { state, setOpen, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed" && !isMobile;
  const { user, signOut } = useAuth();
  const { role, accessProfileName, canViewModule, loading } = useUserRole();
  const { canActivateUnits } = useUnitActivationPermission();
  const { count: editRequestsCount } = useEditRequestsCount();
  const { count: frotaFailedCount } = useFrotaUnitFailedCount();

  const storageKey = `nav-groups:${user?.id ?? "anon"}`;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setOpenGroups(raw ? JSON.parse(raw) : {});
    } catch { setOpenGroups({}); }
  }, [storageKey]);

  const isActive = (path: string) => location.pathname === path;

  // Same access rules as before; route protection remains in RoleProtectedRoute/RLS
  const canAccessItem = useCallback((item: NavItem) => {
    if (item.public) return true;
    if (role === "admin") return true;
    if (item.to === "/frota-unit-activation" && canActivateUnits) return true;
    if (item.adminOnly) return false;
    const mods = item.modules || (item.module ? [item.module] : []);
    return mods.some((m) => canViewModule(m));
  }, [role, canActivateUnits, canViewModule]);

  const visibleSections = useMemo<NavSection[]>(() =>
    NAV_SECTIONS.map((s) => ({
      ...s,
      entries: s.entries
        .map((e) => e.kind === "group" ? { ...e, items: e.items.filter(canAccessItem) } : e)
        .filter((e) => e.kind === "group" ? e.items.length > 0 : canAccessItem(e)),
    })).filter((s) => s.entries.length > 0),
  [canAccessItem]);

  const toggleGroup = (g: NavGroup, current: boolean) => {
    if (isCollapsed) setOpen(true);
    const next = { ...openGroups, [g.id]: !current };
    setOpenGroups(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const onNavigate = () => { if (isMobile) setOpenMobile(false); };

  const badgeCount = (item: NavItem) =>
    item.badgeKind === "edit-requests" ? editRequestsCount
    : item.badgeKind === "frota-unit-failed" ? frotaFailedCount : 0;

  const renderBadge = (item: NavItem) => {
    const c = badgeCount(item);
    return c > 0 ? <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0 h-5">{c}</Badge> : null;
  };

  if (loading) {
    return (
      <Sidebar collapsible="icon" className="border-r">
        <SidebarContent className="safe-area-inset">
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton-shimmer h-9 rounded-md" />)}
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label} className="h-9 touch-manipulation">
          <NavLink to={item.to} onClick={onNavigate} className="flex items-center gap-3">
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium leading-tight whitespace-normal break-words">{item.label}</span>
            {!isCollapsed && renderBadge(item)}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderGroup = (g: NavGroup) => {
    const GroupIcon = g.icon;
    const groupActive = g.items.some((i) => isActive(i.to));
    const stored = openGroups[g.id];
    const isOpen = !isCollapsed && (groupActive || (stored ?? g.defaultOpen));
    const groupBadge = g.items.reduce((s, i) => s + badgeCount(i), 0);
    return (
      <Collapsible key={g.id} open={isOpen} onOpenChange={() => toggleGroup(g, isOpen)} asChild>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={g.label} className="h-9 touch-manipulation data-[state=open]:font-semibold" data-active-group={groupActive || undefined}>
              <GroupIcon className="h-4 w-4 shrink-0" />
              <span className={`text-sm font-medium flex-1 truncate ${groupActive ? "text-sidebar-accent-foreground" : ""}`}>{g.label}</span>
              {!isOpen && groupBadge > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">{groupBadge}</Badge>}
              <ChevronRight className={`h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <SidebarMenuSub>
              {g.items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuSubItem key={item.to}>
                    <SidebarMenuSubButton asChild isActive={isActive(item.to)} className="h-auto min-h-8 py-1.5">
                      <NavLink to={item.to} onClick={onNavigate} className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-sm leading-tight whitespace-normal break-words">{item.label}</span>
                        {renderBadge(item)}
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-4 pt-4 pb-1">
        {!isCollapsed && <span className="text-base font-bold text-sidebar-foreground">Menu</span>}
      </SidebarHeader>

      <SidebarContent className="safe-area-inset gap-0">
        {visibleSections.map((section) => (
          <SidebarGroup key={section.id} className="py-1">
            {section.label && (
              <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.entries.map((e) => (e.kind === "group" ? renderGroup(e) : renderItem(e)))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!isCollapsed && (
          <div className="px-2 pt-1 text-xs text-sidebar-foreground/70">
            <div className="font-medium truncate">{user?.email}</div>
            <div className="text-sidebar-foreground/50">{accessProfileName || getRoleLabel(role)}</div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut()}
              tooltip="Sair"
              className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
