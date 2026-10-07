import {
  BarChart3, Kanban, Settings, CheckSquare, Users, UserCog, Package, Truck, Cog,
  Calendar, UserCheck, Rocket, Clock, FileEdit, Home, MessageSquare, Wrench, Activity,
  Search, ShieldAlert, Headset, History, Store, ScanSearch, Power, Gauge, FlaskConical,
  ClipboardList, MonitorCog, ShieldCheck, Send, ListChecks,
} from "lucide-react";
import type { AppModule } from "@/types/permissions";

export type NavIcon = React.ComponentType<{ className?: string }>;

export interface NavItem {
  kind: "item";
  to: string;
  label: string;
  icon: NavIcon;
  module?: AppModule;
  modules?: AppModule[];
  adminOnly?: boolean;
  /** Visible to every authenticated user */
  public?: boolean;
  badgeKind?: "edit-requests" | "frota-unit-failed";
}

export interface NavGroup {
  kind: "group";
  id: string;
  label: string;
  icon: NavIcon;
  defaultOpen: boolean;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export interface NavSection {
  id: string;
  label?: string;
  entries: NavEntry[];
}

const item = (i: Omit<NavItem, "kind">): NavItem => ({ kind: "item", ...i });
const group = (g: Omit<NavGroup, "kind">): NavGroup => ({ kind: "group", ...g });

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "top",
    entries: [
      item({ to: "/modules", label: "Início", icon: Home, public: true }),
      item({ to: "/chamados", label: "Chamados", icon: Headset, module: "chamados" }),
    ],
  },
  {
    id: "operacao",
    label: "Operação",
    entries: [
      item({ to: "/kickoff", label: "Kickoff", icon: Rocket, module: "kickoff" }),
      group({
        id: "homologacao", label: "Homologação", icon: CheckSquare, defaultOpen: true,
        items: [
          item({ to: "/homologation", label: "Homologação de Veículos", icon: ShieldCheck, module: "homologation" }),
          item({ to: "/kits", label: "Kits", icon: Package, modules: ["kits", "homologation"] }),
          item({ to: "/accessories-supplies", label: "Acessórios & Insumos", icon: Cog, modules: ["accessories_supplies", "homologation"] }),
          item({ to: "/config", label: "Gestão de Configurações", icon: Settings, module: "homologation" }),
        ],
      }),
      item({ to: "/planning", label: "Planejamento", icon: Calendar, module: "planning" }),
      group({
        id: "logistica", label: "Logística", icon: Truck, defaultOpen: true,
        items: [
          item({ to: "/kanban", label: "Produção", icon: Kanban, module: "kanban" }),
          item({ to: "/expedition", label: "Expedição", icon: Send, module: "kanban" }),
          item({ to: "/dashboard", label: "Dash logística", icon: BarChart3, module: "dashboard" }),
        ],
      }),
      item({ to: "/scheduling", label: "Agendamento", icon: Clock, module: "scheduling" }),
      item({ to: "/installation", label: "Instalação", icon: Wrench, adminOnly: true }),
      item({ to: "/customer-tracking", label: "Acompanhamento de Clientes", icon: UserCheck, module: "customer_tracking" }),
    ],
  },
  {
    id: "gestao",
    label: "Gestão",
    entries: [
      group({
        id: "solicitacoes", label: "Solicitações", icon: ClipboardList, defaultOpen: false,
        items: [
          item({ to: "/edit-requests", label: "Solicitações de Edição", icon: FileEdit, module: "homologation", badgeKind: "edit-requests" }),
          item({ to: "/schedule-deletion-requests", label: "Solicitações de Agendamento", icon: ListChecks, module: "schedule_deletion_approval" }),
        ],
      }),
      group({
        id: "segsale", label: "Segsale", icon: Store, defaultOpen: false,
        items: [
          item({ to: "/segsale-sales", label: "Vendas Segsale", icon: Package, adminOnly: true }),
          item({ to: "/segsale-search", label: "Busca Segsale", icon: Search, adminOnly: true }),
          item({ to: "/frota-pendentes", label: "Pendências Segsale", icon: ScanSearch, module: "frota_pendentes" }),
          item({ to: "/pending-sales-recovery", label: "Diagnóstico de Vendas", icon: ShieldAlert, adminOnly: true }),
        ],
      }),
      group({
        id: "monitoramento", label: "Monitoramento", icon: MonitorCog, defaultOpen: false,
        items: [
          item({ to: "/api-monitoring", label: "Monitoramento de APIs", icon: Activity, adminOnly: true }),
          item({ to: "/frota-unit-status", label: "Status Unidades Frota", icon: Gauge, adminOnly: true, badgeKind: "frota-unit-failed" }),
          item({ to: "/frota-unit-activation", label: "Ativação de Unidades", icon: Power, adminOnly: true }),
        ],
      }),
      group({
        id: "administracao", label: "Administração", icon: UserCog, defaultOpen: false,
        items: [
          item({ to: "/users", label: "Usuários", icon: UserCog, module: "users" }),
          item({ to: "/technicians", label: "Técnicos", icon: Users, module: "technicians" }),
          item({ to: "/whatsapp-control", label: "Controle de Mensagens", icon: MessageSquare, adminOnly: true }),
          item({ to: "/history", label: "Histórico", icon: History, module: "users" }),
        ],
      }),
    ],
  },
  {
    id: "ferramentas",
    label: "Ferramentas",
    entries: [
      item({ to: "/kickoff/simulador", label: "Simulador", icon: FlaskConical, public: true }),
      item({ to: "/plate-verification", label: "Verificação de Placa", icon: Search, adminOnly: true }),
    ],
  },
];
