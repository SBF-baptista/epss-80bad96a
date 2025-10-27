import { UserRole } from '@/hooks/useUserRole'

export interface PageAccess {
  canView: boolean
  canEdit: boolean
}

export const getPageAccess = (role: UserRole, page: string): PageAccess => {
  if (!role) {
    return { canView: false, canEdit: false }
  }

  // Admin tem acesso total
  if (role === 'admin') {
    return { canView: true, canEdit: true }
  }

  // Gestor pode ver tudo, mas não editar
  if (role === 'gestor') {
    return { canView: true, canEdit: false }
  }

  // Operadores têm acesso específico
  const accessMap: Record<string, UserRole[]> = {
    '/kickoff': ['operador_kickoff'],
    '/customer-tracking': ['operador_kickoff'],
    '/homologation': ['operador_homologacao'],
    '/kits': ['operador_homologacao'],
    '/accessories-supplies': ['operador_homologacao'],
    '/config': ['operador_homologacao'],
    '/planning': ['operador_agendamento'],
    '/kanban': ['operador_suprimentos'],
    '/orders': ['operador_suprimentos'],
    '/dashboard': ['operador_suprimentos'],
  }

  const allowedRoles = accessMap[page] || []
  const hasAccess = allowedRoles.includes(role)

  return {
    canView: hasAccess,
    canEdit: hasAccess
  }
}

export const getNavigationItems = (role: UserRole) => {
  if (!role) return []

  const allItems = [
    { to: '/kickoff', label: 'Kickoff', roles: ['admin', 'gestor', 'operador_kickoff'] },
    { to: '/customer-tracking', label: 'Acompanhamento de Clientes', roles: ['admin', 'gestor', 'operador_kickoff'] },
    { to: '/homologation', label: 'Homologação', roles: ['admin', 'gestor', 'operador_homologacao'] },
    { to: '/kits', label: 'Kits', roles: ['admin', 'gestor', 'operador_homologacao'] },
    { to: '/accessories-supplies', label: 'Acessórios & Insumos', roles: ['admin', 'gestor', 'operador_homologacao'] },
    { to: '/config', label: 'Configurações', roles: ['admin', 'gestor', 'operador_homologacao'] },
    { to: '/planning', label: 'Planejamento', roles: ['admin', 'gestor', 'operador_agendamento'] },
    { to: '/kanban', label: 'Kanban', roles: ['admin', 'gestor', 'operador_suprimentos'] },
    { to: '/orders', label: 'Pedidos', roles: ['admin', 'gestor', 'operador_suprimentos'] },
    { to: '/dashboard', label: 'Dashboard', roles: ['admin', 'gestor', 'operador_suprimentos'] },
    { to: '/technicians', label: 'Técnicos', roles: ['admin'] },
    { to: '/users', label: 'Usuários', roles: ['admin'] },
  ]

  return allItems.filter(item => item.roles.includes(role))
}

export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    operador_kickoff: 'Operador de Kickoff',
    operador_homologacao: 'Operador de Homologação',
    operador_agendamento: 'Operador de Agendamento',
    operador_suprimentos: 'Operador de Suprimentos',
  }
  return labels[role || ''] || 'Sem Permissão'
}

export const getRoleBadgeVariant = (role: UserRole): string => {
  const variants: Record<string, string> = {
    admin: 'destructive',
    gestor: 'default',
    operador_kickoff: 'secondary',
    operador_homologacao: 'secondary',
    operador_agendamento: 'secondary',
    operador_suprimentos: 'secondary',
  }
  return variants[role || ''] || 'outline'
}
