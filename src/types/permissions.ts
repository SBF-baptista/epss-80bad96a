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

// Module configuration for UI
export interface ModuleConfig {
  key: AppModule;
  label: string;
  description: string;
  group: 'kickoff' | 'homologation' | 'planning' | 'supply';
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
      { key: 'kickoff', label: 'Kickoff', description: 'Recebimento e processamento de veículos', group: 'kickoff' },
      { key: 'customer_tracking', label: 'Acompanhamento de Clientes', description: 'Acompanhamento de clientes e processos', group: 'kickoff' },
    ]
  },
  homologation: {
    label: 'Homologação',
    modules: [
      { key: 'homologation', label: 'Homologação', description: 'Homologação de veículos', group: 'homologation' },
      { key: 'kits', label: 'Kits', description: 'Gestão de kits de instalação', group: 'homologation' },
      { key: 'accessories_supplies', label: 'Acessórios & Insumos', description: 'Gestão de acessórios e insumos', group: 'homologation' },
    ]
  },
  planning: {
    label: 'Planejamento',
    modules: [
      { key: 'planning', label: 'Planejamento', description: 'Planejamento de instalações', group: 'planning' },
      { key: 'scheduling', label: 'Agendamento', description: 'Agendamento de instalações', group: 'planning' },
    ]
  },
  supply: {
    label: 'Suprimentos',
    modules: [
      { key: 'kanban', label: 'Kanban', description: 'Quadro kanban de pedidos', group: 'supply' },
      { key: 'orders', label: 'Pedidos', description: 'Gestão de pedidos', group: 'supply' },
      { key: 'dashboard', label: 'Dashboard', description: 'Dashboard de análise', group: 'supply' },
    ]
  },
  admin: {
    label: 'Administração',
    modules: [
      { key: 'technicians', label: 'Técnicos', description: 'Gestão de técnicos', group: 'supply' },
      { key: 'users', label: 'Usuários', description: 'Gestão de usuários', group: 'supply' },
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
      // Admin has full access to everything
      Object.keys(permissions).forEach(key => {
        permissions[key as AppModule] = 'admin';
      });
      break;
    case 'gestor':
      // Gestor can view and approve everything but not admin
      Object.keys(permissions).forEach(key => {
        permissions[key as AppModule] = 'approve';
      });
      break;
    case 'operador':
      // Operator can edit (will be customized per module)
      Object.keys(permissions).forEach(key => {
        permissions[key as AppModule] = 'edit';
      });
      break;
    case 'visualizador':
      // Visualizador can only view
      Object.keys(permissions).forEach(key => {
        permissions[key as AppModule] = 'view';
      });
      break;
  }

  return permissions;
};
