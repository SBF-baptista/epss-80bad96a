// Permission levels for each module
export type PermissionLevel = 'none' | 'view' | 'edit' | 'approve' | 'admin';

// Available modules in the system
export type AppModule = 
  | 'kickoff'
  | 'customer_tracking'
  | 'homologation'
  | 'kits'
  | 'accessories_supplies'
  | 'planning'
  | 'scheduling'
  | 'kanban'
  | 'orders'
  | 'dashboard'
  | 'technicians'
  | 'users';

// Base role that determines default permissions
export type BaseRole = 'visualizador' | 'operador' | 'gestor' | 'admin';

// Module permission record
export interface ModulePermission {
  id?: string;
  user_id: string;
  module: AppModule;
  permission: PermissionLevel;
  created_at?: string;
  updated_at?: string;
}

// Per-level description for each module
export interface ModuleLevelDescription {
  view: string;
  edit: string;
  approve: string;
  admin: string;
}

// Module configuration for UI
export interface ModuleConfig {
  key: AppModule;
  label: string;
  description: string;
  group: 'kickoff' | 'homologation' | 'planning' | 'supply';
  levelDescriptions: ModuleLevelDescription;
}

// User with granular permissions
export interface UserWithPermissions {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  base_role: BaseRole | null;
  permissions: ModulePermission[];
}

// Module groups for UI organization
export const MODULE_GROUPS: Record<string, { label: string; modules: ModuleConfig[] }> = {
  kickoff: {
    label: 'Kickoff',
    modules: [
      { 
        key: 'kickoff', 
        label: 'Kickoff', 
        description: 'Recebimento e processamento de veículos', 
        group: 'kickoff',
        levelDescriptions: {
          view: 'Ver veículos recebidos e histórico de kickoff',
          edit: 'Processar veículos, aprovar kickoffs, editar dados',
          approve: 'Reverter kickoffs processados, editar histórico',
          admin: 'Acesso total: excluir registros, configurar integrações'
        }
      },
      { 
        key: 'customer_tracking', 
        label: 'Acompanhamento de Clientes', 
        description: 'Acompanhamento de clientes e processos', 
        group: 'kickoff',
        levelDescriptions: {
          view: 'Ver clientes, kits agendados, status e timeline',
          edit: 'Editar dados de clientes, reagendar instalações',
          approve: 'Aprovar alterações de status, cancelar agendamentos',
          admin: 'Acesso total: excluir clientes, gerenciar todos os dados'
        }
      },
    ]
  },
  homologation: {
    label: 'Homologação',
    modules: [
      { 
        key: 'homologation', 
        label: 'Homologação', 
        description: 'Homologação de veículos', 
        group: 'homologation',
        levelDescriptions: {
          view: 'Ver cards de homologação e status no kanban',
          edit: 'Criar homologações, mover cards, agendar testes',
          approve: 'Aprovar/rejeitar homologações, alterar status final',
          admin: 'Acesso total: excluir cards, gerenciar regras de automação'
        }
      },
      { 
        key: 'kits', 
        label: 'Kits', 
        description: 'Gestão de kits de instalação', 
        group: 'homologation',
        levelDescriptions: {
          view: 'Ver kits cadastrados, equipamentos e composição',
          edit: 'Criar novos kits, editar composição, importar kits',
          approve: 'Aprovar solicitações de edição/exclusão de kits',
          admin: 'Acesso total: excluir kits diretamente, gerenciar configurações'
        }
      },
      { 
        key: 'accessories_supplies', 
        label: 'Acessórios & Insumos', 
        description: 'Gestão de acessórios e insumos', 
        group: 'homologation',
        levelDescriptions: {
          view: 'Ver acessórios e insumos homologados e pendentes',
          edit: 'Cadastrar novos acessórios/insumos, aprovar pendentes',
          approve: 'Aprovar solicitações de edição/exclusão',
          admin: 'Acesso total: excluir diretamente, gerenciar homologação'
        }
      },
    ]
  },
  planning: {
    label: 'Planejamento',
    modules: [
      { 
        key: 'planning', 
        label: 'Planejamento', 
        description: 'Planejamento de instalações', 
        group: 'planning',
        levelDescriptions: {
          view: 'Ver planejamento de instalações e calendário',
          edit: 'Criar e editar planejamentos, atribuir técnicos',
          approve: 'Aprovar planejamentos, confirmar instalações',
          admin: 'Acesso total: excluir planejamentos, gerenciar regras'
        }
      },
      { 
        key: 'scheduling', 
        label: 'Agendamento', 
        description: 'Agendamento de instalações', 
        group: 'planning',
        levelDescriptions: {
          view: 'Ver agendamentos e agenda dos técnicos',
          edit: 'Criar agendamentos, editar horários e locais',
          approve: 'Cancelar agendamentos, alterar status',
          admin: 'Acesso total: excluir agendamentos, configurar regras'
        }
      },
    ]
  },
  supply: {
    label: 'Suprimentos',
    modules: [
      { 
        key: 'kanban', 
        label: 'Kanban', 
        description: 'Quadro kanban de pedidos', 
        group: 'supply',
        levelDescriptions: {
          view: 'Ver quadro kanban e status dos pedidos',
          edit: 'Mover pedidos entre colunas, atualizar status',
          approve: 'Aprovar pedidos, alterar prioridades',
          admin: 'Acesso total: excluir pedidos, configurar colunas'
        }
      },
      { 
        key: 'orders', 
        label: 'Pedidos', 
        description: 'Gestão de pedidos', 
        group: 'supply',
        levelDescriptions: {
          view: 'Ver pedidos e detalhes',
          edit: 'Criar pedidos, editar informações, preparar envios',
          approve: 'Aprovar pedidos, autorizar envios',
          admin: 'Acesso total: excluir pedidos, gerenciar configurações'
        }
      },
      { 
        key: 'dashboard', 
        label: 'Dashboard', 
        description: 'Dashboard de análise', 
        group: 'supply',
        levelDescriptions: {
          view: 'Ver indicadores, gráficos e relatórios',
          edit: 'Exportar relatórios, personalizar filtros',
          approve: 'Acessar relatórios avançados e insights',
          admin: 'Acesso total: configurar métricas e painéis'
        }
      },
    ]
  },
  admin: {
    label: 'Administração',
    modules: [
      { 
        key: 'technicians', 
        label: 'Técnicos', 
        description: 'Gestão de técnicos', 
        group: 'supply',
        levelDescriptions: {
          view: 'Ver lista de técnicos e disponibilidade',
          edit: 'Cadastrar e editar técnicos',
          approve: 'Ativar/desativar técnicos',
          admin: 'Acesso total: excluir técnicos, gerenciar áreas'
        }
      },
      { 
        key: 'users', 
        label: 'Usuários', 
        description: 'Gestão de usuários', 
        group: 'supply',
        levelDescriptions: {
          view: 'Ver lista de usuários e perfis',
          edit: 'Criar usuários, alterar perfis de acesso',
          approve: 'Bloquear/desbloquear usuários, redefinir senhas',
          admin: 'Acesso total: excluir usuários, gerenciar permissões'
        }
      },
    ]
  }
};

// All modules in flat array
export const ALL_MODULES: ModuleConfig[] = Object.values(MODULE_GROUPS).flatMap(g => g.modules);

// Permission level labels
export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  none: 'Sem Acesso',
  view: 'Visualizar',
  edit: 'Editar',
  approve: 'Aprovar',
  admin: 'Admin'
};

// Base role labels
export const BASE_ROLE_LABELS: Record<BaseRole, string> = {
  visualizador: 'Visualizador',
  operador: 'Operador',
  gestor: 'Gestor',
  admin: 'Administrador'
};

// Get default permissions for a base role
export const getDefaultPermissionsForRole = (role: BaseRole): Record<AppModule, PermissionLevel> => {
  const permissions: Record<AppModule, PermissionLevel> = {
    kickoff: 'none',
    customer_tracking: 'none',
    homologation: 'none',
    kits: 'none',
    accessories_supplies: 'none',
    planning: 'none',
    scheduling: 'none',
    kanban: 'none',
    orders: 'none',
    dashboard: 'none',
    technicians: 'none',
    users: 'none'
  };

  switch (role) {
    case 'admin':
      Object.keys(permissions).forEach(key => {
        permissions[key as AppModule] = 'admin';
      });
      break;
    case 'gestor':
      Object.keys(permissions).forEach(key => {
        permissions[key as AppModule] = 'approve';
      });
      break;
    case 'operador':
      Object.keys(permissions).forEach(key => {
        permissions[key as AppModule] = 'edit';
      });
      break;
    case 'visualizador':
      Object.keys(permissions).forEach(key => {
        permissions[key as AppModule] = 'view';
      });
      break;
  }

  return permissions;
};
