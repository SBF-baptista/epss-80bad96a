import { UserRole } from '@/hooks/useUserRole'
import { AppModule, PermissionLevel, MODULE_GROUPS } from '@/types/permissions'

export interface PageAccess {
  canView: boolean
  canEdit: boolean
  canApprove: boolean
}

// Map routes to modules
export const ROUTE_TO_MODULE: Record<string, AppModule> = {
  '/kickoff': 'kickoff',
  '/customer-tracking': 'customer_tracking',
  '/homologation': 'homologation',
  '/kits': 'kits',
  '/accessories-supplies': 'accessories_supplies',
  '/planning': 'planning',
  '/scheduling': 'scheduling',
  '/config': 'scheduling',
  '/kanban': 'kanban',
  '/orders': 'orders',
  '/dashboard': 'dashboard',
  '/technicians': 'technicians',
  '/users': 'users',
  '/modules': 'kickoff', // Allow access to module selection
}

export const getPageAccess = (
  role: UserRole, 
  permissions: { module: AppModule; permission: PermissionLevel }[],
  page: string
): PageAccess => {
  if (!role) {
    return { canView: false, canEdit: false, canApprove: false }
  }

  // Admin has full access
  if (role === 'admin') {
    return { canView: true, canEdit: true, canApprove: true }
  }

  const module = ROUTE_TO_MODULE[page]
  if (!module) {
    return { canView: false, canEdit: false, canApprove: false }
  }

  const permission = permissions.find(p => p.module === module)
  const level = permission?.permission || 'none'

  return {
    canView: ['view', 'edit', 'approve', 'admin'].includes(level),
    canEdit: ['edit', 'approve', 'admin'].includes(level),
    canApprove: ['approve', 'admin'].includes(level)
  }
}

export const getNavigationItems = (
  role: UserRole, 
  permissions: { module: AppModule; permission: PermissionLevel }[]
) => {
  if (!role) return []

  // Admin sees everything
  if (role === 'admin') {
    return [
      { to: '/modules', label: 'Início' },
      { to: '/kickoff', label: 'Kickoff' },
      { to: '/customer-tracking', label: 'Acompanhamento de Clientes' },
      { to: '/homologation', label: 'Homologação' },
      { to: '/kits', label: 'Kits' },
      { to: '/accessories-supplies', label: 'Acessórios & Insumos' },
      { to: '/config', label: 'Agendamento' },
      { to: '/planning', label: 'Planejamento' },
      { to: '/kanban', label: 'Kanban' },
      { to: '/orders', label: 'Pedidos' },
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/technicians', label: 'Técnicos' },
      { to: '/users', label: 'Usuários' },
    ]
  }

  // Filter items based on permissions
  const canAccessModule = (module: AppModule): boolean => {
    const perm = permissions.find(p => p.module === module)
    return perm ? ['view', 'edit', 'approve', 'admin'].includes(perm.permission) : false
  }

  const items: { to: string; label: string }[] = [
    { to: '/modules', label: 'Início' }
  ]

  if (canAccessModule('kickoff')) items.push({ to: '/kickoff', label: 'Kickoff' })
  if (canAccessModule('customer_tracking')) items.push({ to: '/customer-tracking', label: 'Acompanhamento de Clientes' })
  if (canAccessModule('homologation')) items.push({ to: '/homologation', label: 'Homologação' })
  if (canAccessModule('kits')) items.push({ to: '/kits', label: 'Kits' })
  if (canAccessModule('accessories_supplies')) items.push({ to: '/accessories-supplies', label: 'Acessórios & Insumos' })
  if (canAccessModule('scheduling')) items.push({ to: '/config', label: 'Agendamento' })
  if (canAccessModule('planning')) items.push({ to: '/planning', label: 'Planejamento' })
  if (canAccessModule('kanban')) items.push({ to: '/kanban', label: 'Kanban' })
  if (canAccessModule('orders')) items.push({ to: '/orders', label: 'Pedidos' })
  if (canAccessModule('dashboard')) items.push({ to: '/dashboard', label: 'Dashboard' })
  if (canAccessModule('technicians')) items.push({ to: '/technicians', label: 'Técnicos' })
  if (canAccessModule('users')) items.push({ to: '/users', label: 'Usuários' })

  return items
}

export const getRoleLabel = (role: UserRole | string | null): string => {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    operador: 'Operador',
    visualizador: 'Visualizador',
    // Legacy roles for backwards compatibility
    operador_kickoff: 'Operador de Kickoff',
    operador_homologacao: 'Operador de Homologação',
    operador_agendamento: 'Operador de Agendamento',
    operador_suprimentos: 'Operador de Suprimentos',
  }
  return labels[role || ''] || 'Sem Permissão'
}

export const getRoleBadgeVariant = (role: UserRole | string | null): string => {
  const variants: Record<string, string> = {
    admin: 'destructive',
    gestor: 'default',
    operador: 'secondary',
    visualizador: 'outline',
    // Legacy roles
    operador_kickoff: 'secondary',
    operador_homologacao: 'secondary',
    operador_agendamento: 'secondary',
    operador_suprimentos: 'secondary',
  }
  return variants[role || ''] || 'outline'
}
