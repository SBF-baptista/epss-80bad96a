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

  const displayName: string = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário").toString();
  const initials = (() => {
    const parts = displayName.replace(/[._-]+/g, " ").trim().split(/\s+/).filter(Boolean);
    const v = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0]?.[0] ?? "U");
    return v.toUpperCase();
  })();

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
    void badgeCount(item);
    return null; // contadores de notificação não são exibidos no menu
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
        <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label} className="nav-link h-auto min-h-9 py-2 items-start touch-manipulation [&>span:last-child]:whitespace-normal">
          <NavLink to={item.to} onClick={onNavigate} className="flex items-start gap-3">
            <Icon className="nav-icon h-4 w-4 shrink-0 mt-0.5" />
            <span className="flex-1 min-w-0 text-sm font-medium leading-snug !whitespace-normal !overflow-visible break-words">{item.label}</span>
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
    const isOpen = !isCollapsed && (stored ?? (groupActive || g.defaultOpen));
        return (
      <Collapsible key={g.id} open={isOpen} onOpenChange={() => toggleGroup(g, isOpen)} asChild>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={g.label} className="nav-link h-auto min-h-9 py-2 items-start touch-manipulation data-[state=open]:font-semibold" data-active-group={groupActive || undefined}>
              <GroupIcon className="nav-icon h-4 w-4 shrink-0 mt-0.5" />
              <span className={`nav-group-label text-sm font-medium flex-1 min-w-0 leading-snug !whitespace-normal !overflow-visible break-words`}>{g.label}</span>
                            <ChevronRight className={`nav-chevron h-4 w-4 shrink-0 opacity-60 mt-0.5 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <SidebarMenuSub className="nav-sub mx-0 border-l-0 px-0">
              {g.items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuSubItem key={item.to}>
                    <SidebarMenuSubButton asChild isActive={isActive(item.to)} className="nav-link h-auto min-h-8 py-1.5 items-start [&>span:last-child]:whitespace-normal [&>span:last-child]:overflow-visible">
                      <NavLink to={item.to} onClick={onNavigate} className="flex items-start gap-2">
                        <Icon className="nav-icon h-3 w-3 shrink-0 mt-0.5" />
                        <span className="flex-1 min-w-0 text-[13px] leading-snug !whitespace-normal !overflow-visible break-words">{item.label}</span>
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
    <Sidebar collapsible="icon" className="border-r [&_[data-sidebar=sidebar]]:nav-surface">
      <SidebarHeader className="px-3 pt-4 pb-3 border-b border-sidebar-foreground/10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground grid place-items-center text-xs font-bold shadow-md ring-1 ring-sidebar-foreground/15">OPM</div>
          {!isCollapsed && (
            <div className="min-w-0 leading-tight">
              <div className="text-sm font-bold text-sidebar-foreground">OPM</div>
              <div className="text-[10px] tracking-[0.18em] text-sidebar-foreground/55">SEGSAT</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="nav-scroll safe-area-inset gap-0">
        {visibleSections.map((section) => (
          <SidebarGroup key={section.id} className="py-1.5">
            {section.label && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">
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

      <SidebarFooter className="p-2">
        <div className={`flex items-center gap-2.5 rounded-lg bg-sidebar-foreground/[0.07] ring-1 ring-sidebar-foreground/10 ${isCollapsed ? "flex-col p-1" : "p-2"}`}>
          <div className="h-8 w-8 shrink-0 rounded-full nav-monogram grid place-items-center text-xs font-semibold" title={displayName}>{initials}</div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-xs font-semibold text-sidebar-foreground break-words">{displayName}</div>
              <div className="text-[11px] text-sidebar-foreground/55">{accessProfileName || getRoleLabel(role)}</div>
            </div>
          )}
          <SidebarMenuButton onClick={() => signOut()} tooltip="Sair" aria-label="Sair"
            className="h-8 w-8 shrink-0 justify-center p-0 text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-destructive/30">
            <LogOut className="h-4 w-4" />
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
