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
  | 'users'
  | 'schedule_deletion_approval'
  | 'history'
  | 'edit_requests'
  | 'installation'
  | 'api_monitoring'
  | 'plate_verification'
  | 'frota_pendentes'
  | 'segsale_sales'
  | 'segsale_search'
  | 'whatsapp_control'
  | 'configuration'
  | 'kickoff_simulator'
  | 'kickoff_bypass'
  | 'kickoff_bypass_control'
  | 'unit_activation'
  | 'chamados';

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
      {
        key: 'kickoff_bypass',
        label: 'Kickoff → Agendamento (Bypass)',
        description: 'Pular Homologação, Kits e Planejamento indo direto do Kickoff para o Agendamento',
        group: 'kickoff',
        levelDescriptions: {
          view: 'Ver a aba de auditoria dos bypasses realizados',
          edit: 'Executar o bypass do Kickoff direto para Agendamento (exige justificativa)',
          approve: 'Executar bypass e revisar auditoria',
          admin: 'Acesso total ao bypass e auditoria'
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
      { 
        key: 'schedule_deletion_approval', 
        label: 'Solicitações de Agendamento', 
        description: 'Aprovar/rejeitar solicitações de exclusão de agendamento', 
        group: 'supply',
        levelDescriptions: {
          view: 'Ver solicitações de exclusão de agendamento',
          edit: 'Ver solicitações (sem decidir)',
          approve: 'Aprovar ou rejeitar solicitações de exclusão',
          admin: 'Acesso total às solicitações'
        }
      },
      {
        key: 'history',
        label: 'Histórico',
        description: 'Histórico geral do sistema',
        group: 'supply',
        levelDescriptions: {
          view: 'Ver histórico de ações do sistema',
          edit: 'Exportar histórico e aplicar filtros avançados',
          approve: 'Acessar detalhes de logs sensíveis',
          admin: 'Acesso total ao histórico'
        }
      },
      {
        key: 'edit_requests',
        label: 'Solicitações de Edição',
        description: 'Solicitações de edição de itens',
        group: 'supply',
        levelDescriptions: {
          view: 'Ver solicitações de edição pendentes',
          edit: 'Criar solicitações de edição',
          approve: 'Aprovar/rejeitar solicitações de edição',
          admin: 'Acesso total às solicitações de edição'
        }
      },
      {
        key: 'configuration',
        label: 'Configurações',
        description: 'Configurações gerais do sistema',
        group: 'supply',
        levelDescriptions: {
          view: 'Ver configurações gerais',
          edit: 'Editar configurações do sistema',
          approve: 'Aprovar mudanças de configuração',
          admin: 'Acesso total às configurações'
        }
      },
      {
        key: 'kickoff_bypass_control',
        label: 'Controle de Bypass do Kickoff',
        description: 'Direito de executar o "Pular para Agendamento" (exige justificativa e é auditado)',
        group: 'supply',
        levelDescriptions: {
          view: 'Ver a auditoria dos bypasses executados',
          edit: 'Executar o bypass do Kickoff (com justificativa obrigatória)',
          approve: 'Executar bypass e revisar a auditoria',
          admin: 'Controle total do bypass e da auditoria'
        }
      },
      {
        key: 'unit_activation',
        label: 'Ativação de Unidades (Frota/Auto)',
        description: 'Direito de ativar/desativar unidades nos sistemas Frota e Auto (auditado)',
        group: 'supply',
        levelDescriptions: {
          view: 'Ver a auditoria de ativações e desativações',
          edit: 'Ativar/desativar unidades (com justificativa obrigatória)',
          approve: 'Ativar/desativar e revisar a auditoria',
          admin: 'Controle total da ativação de unidades'
        }
      },
    ]
  },
  integrations: {
    label: 'Integrações & Ferramentas',
    modules: [
      {
        key: 'installation',
        label: 'Instalação',
        description: 'Página de instalação/retirada externa',
        group: 'supply',
        levelDescriptions: {
          view: 'Ver instalações externas',
          edit: 'Registrar instalações',
          approve: 'Aprovar instalações externas',
          admin: 'Acesso total à instalação'
        }
      },
      {
        key: 'api_monitoring',
        label: 'Monitoramento de APIs',
        description: 'Monitorar retornos das APIs externas',
        group: 'supply',
        levelDescriptions: {
          view: 'Ver logs e retornos de APIs',
          edit: 'Reexecutar chamadas de API',
          approve: 'Analisar falhas de API',
          admin: 'Acesso total ao monitoramento de APIs'
        }
      },
      {
        key: 'plate_verification',
        label: 'Verificação de Placa (Frota/Kafka)',
        description: 'Verificação de placas via Frota/Kafka',
        group: 'supply',
        levelDescriptions: {
          view: 'Consultar placas via Frota/Kafka',
          edit: 'Publicar eventos de placa',
          approve: 'Reenviar eventos de placa',
          admin: 'Acesso total à verificação de placa'
        }
      },
      {
        key: 'frota_pendentes',
        label: 'Pendências Segsale',
        description: 'Placas pendentes no Segsale',
        group: 'supply',
        levelDescriptions: {
          view: 'Consultar placas pendentes no Segsale',
          edit: 'Consultar e listar pendências',
          approve: 'Ver todos os contratos pendentes',
          admin: 'Acesso total às pendências Segsale'
        }
      },
      {
        key: 'segsale_sales',
        label: 'Vendas Segsale',
        description: 'Vendas do Segsale',
        group: 'supply',
        levelDescriptions: {
          view: 'Ver vendas Segsale',
          edit: 'Sincronizar vendas Segsale',
          approve: 'Aprovar sincronizações',
          admin: 'Acesso total às vendas Segsale'
        }
      },
      {
        key: 'segsale_search',
        label: 'Busca Segsale',
        description: 'Busca no Segsale',
        group: 'supply',
        levelDescriptions: {
          view: 'Buscar registros no Segsale',
          edit: 'Executar buscas avançadas',
          approve: 'Ver detalhes completos',
          admin: 'Acesso total à busca Segsale'
        }
      },
      {
        key: 'whatsapp_control',
        label: 'Controle de WhatsApp',
        description: 'Envio e monitoramento de mensagens WhatsApp',
        group: 'supply',
        levelDescriptions: {
          view: 'Ver mensagens WhatsApp enviadas',
          edit: 'Reenviar mensagens',
          approve: 'Cancelar/pausar envios',
          admin: 'Acesso total ao controle de WhatsApp'
        }
      },
      {
        key: 'chamados',
        label: 'Chamados',
        description: 'Service desk interno de suporte técnico',
        group: 'supply',
        levelDescriptions: {
          view: 'Ver chamados e dashboard de SLA',
          edit: 'Abrir e editar chamados',
          approve: 'Encerrar e escalonar chamados',
          admin: 'Acesso total aos chamados'
        }
      },
      {
        key: 'kickoff_simulator',
        label: 'Simulador de Kickoff',
        description: 'Simulador de kickoff',
        group: 'kickoff',
        levelDescriptions: {
          view: 'Executar simulações de kickoff',
          edit: 'Editar simulações',
          approve: 'Salvar simulações persistentes',
          admin: 'Acesso total ao simulador'
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
    users: 'none',
    schedule_deletion_approval: 'none',
    history: 'none',
    edit_requests: 'none',
    installation: 'none',
    api_monitoring: 'none',
    plate_verification: 'none',
    frota_pendentes: 'none',
    segsale_sales: 'none',
    segsale_search: 'none',
    whatsapp_control: 'none',
    configuration: 'none',
    kickoff_simulator: 'none',
    kickoff_bypass: 'none',
    kickoff_bypass_control: 'none',
    unit_activation: 'none',
    chamados: 'none'
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
