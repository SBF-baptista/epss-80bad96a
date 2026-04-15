import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'
import { AppModule, PermissionLevel, ModulePermission } from '@/types/permissions'

// Base role types (stored in user_roles table)
export type UserRole = 
  | 'admin' 
  | 'gestor' 
  | 'operador'
  | 'visualizador'
  | null

// Legacy roles for backwards compatibility
export type LegacyRole = 
  | 'operador_kickoff' 
  | 'operador_homologacao' 
  | 'operador_agendamento' 
  | 'operador_suprimentos'

interface UserRoleContextType {
  role: UserRole
  permissions: ModulePermission[]
  loading: boolean
  hasRole: (requiredRole: UserRole) => boolean
  hasAnyRole: (requiredRoles: UserRole[]) => boolean
  getModulePermission: (module: AppModule) => PermissionLevel
  canViewModule: (module: AppModule) => boolean
  canEditModule: (module: AppModule) => boolean
  canApproveModule: (module: AppModule) => boolean
  isAdmin: () => boolean
  isGestor: () => boolean
  isOperador: () => boolean
  isVisualizador: () => boolean
  canEdit: () => boolean
  // Admin impersonation
  isImpersonating: boolean
  realRole: UserRole
  startImpersonation: (simulatedRole: UserRole, simulatedPermissions: ModulePermission[]) => void
  stopImpersonation: () => void
}

const UserRoleContext = createContext<UserRoleContextType | null>(null)

const mapRawRole = (rawRole: string | null | undefined): UserRole => {
  if (rawRole === 'admin') return 'admin'
  if (rawRole === 'gestor') return 'gestor'
  if (rawRole === 'operador' || rawRole?.startsWith('operador_')) return 'operador'
  if (rawRole === 'visualizador') return 'visualizador'
  return null
}

const mapPermissionEntries = (userId: string, permissionMap: Record<string, string>): ModulePermission[] => {
  return Object.entries(permissionMap || {})
    .filter(([, permission]) => typeof permission === 'string' && permission !== 'none')
    .map(([module, permission]) => ({
      user_id: userId,
      module: module as AppModule,
      permission: permission as PermissionLevel,
    }))
}

export const UserRoleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [role, setRole] = useState<UserRole>(null)
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  const [loading, setLoading] = useState(true)
  
  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [realRole, setRealRole] = useState<UserRole>(null)
  const [realPermissions, setRealPermissions] = useState<ModulePermission[]>([])

  useEffect(() => {
    const fetchUserRoleAndPermissions = async () => {
      if (!user) {
        setRole(null)
        setPermissions([])
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role, access_profile_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (roleError) {
          console.error('Error fetching user role:', roleError)
          setRole(null)
          setPermissions([])
          return
        }

        if (roleData?.access_profile_id) {
          const { data: profileData, error: profileError } = await supabase
            .from('access_profiles')
            .select('base_role, permissions')
            .eq('id', roleData.access_profile_id)
            .maybeSingle()

          if (profileError) {
            console.error('Error fetching access profile permissions:', profileError)
          } else if (profileData) {
            const resolvedRole = mapRawRole(profileData.base_role)
            const resolvedPerms = mapPermissionEntries(user.id, (profileData.permissions || {}) as Record<string, string>)
            console.log(`[useUserRole] Source: ACCESS_PROFILE (id=${roleData.access_profile_id}), role=${resolvedRole}, modules=`, resolvedPerms.map(p => `${p.module}=${p.permission}`))
            setRole(resolvedRole)
            setPermissions(resolvedPerms)
            return
          }
        }

        const fallbackRole = mapRawRole(roleData?.role)
        setRole(fallbackRole)
        console.log(`[useUserRole] Source: LEGACY (user_module_permissions table), role=${fallbackRole}`)

        const { data: permData, error: permError } = await supabase
          .from('user_module_permissions')
          .select('*')
          .eq('user_id', user.id)

        if (permError) {
          console.error('Error fetching permissions:', permError)
          setPermissions([])
        } else {
          setPermissions((permData || []).map(p => ({
            id: p.id,
            user_id: p.user_id,
            module: p.module as AppModule,
            permission: p.permission as PermissionLevel,
            created_at: p.created_at,
            updated_at: p.updated_at
          })))
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setRole(null)
        setPermissions([])
      } finally {
        setLoading(false)
      }
    }

    fetchUserRoleAndPermissions()
  }, [user])

  // Check if user has a specific base role
  const hasRole = (requiredRole: UserRole): boolean => {
    if (!role || !requiredRole) return false
    return role === requiredRole
  }

  const hasAnyRole = (requiredRoles: UserRole[]): boolean => {
    if (!role) return false
    return requiredRoles.includes(role)
  }

  // Check module permissions
  const getModulePermission = (module: AppModule): PermissionLevel => {
    if (role === 'admin') return 'admin'
    const perm = permissions.find(p => p.module === module)
    return perm?.permission || 'none'
  }

  const canViewModule = (module: AppModule): boolean => {
    if (loading) return false
    if (role === 'admin') return true
    const level = getModulePermission(module)
    return ['view', 'edit', 'approve', 'admin'].includes(level)
  }

  const canEditModule = (module: AppModule): boolean => {
    if (loading) return false
    if (role === 'admin') return true
    const level = getModulePermission(module)
    return ['edit', 'approve', 'admin'].includes(level)
  }

  const canApproveModule = (module: AppModule): boolean => {
    if (loading) return false
    if (role === 'admin') return true
    const level = getModulePermission(module)
    return ['approve', 'admin'].includes(level)
  }

  const isAdmin = (): boolean => role === 'admin'
  const isGestor = (): boolean => role === 'gestor'
  const isOperador = (): boolean => role === 'operador'
  const isVisualizador = (): boolean => role === 'visualizador'
  const canEdit = (): boolean => role !== 'visualizador' && role !== null

  const value: UserRoleContextType = {
    role,
    permissions,
    loading,
    hasRole,
    hasAnyRole,
    getModulePermission,
    canViewModule,
    canEditModule,
    canApproveModule,
    isAdmin,
    isGestor,
    isOperador,
    isVisualizador,
    canEdit
  }

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  )
}

export const useUserRole = (): UserRoleContextType => {
  const context = useContext(UserRoleContext)
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider')
  }
  return context
}
