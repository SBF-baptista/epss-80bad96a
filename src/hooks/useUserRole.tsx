import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react'
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
  canManageModule: (module: AppModule) => boolean
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

const normalizePermissionMap = (permissionMap: unknown): Record<string, string> => {
  const normalized: Record<string, string> = {}

  Object.entries((permissionMap || {}) as Record<string, unknown>).forEach(([key, value]) => {
    if (typeof value === 'string') {
      normalized[key] = value
      return
    }

    if (value && typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
        if (typeof nestedValue === 'string') normalized[nestedKey] = nestedValue
      })
    }
  })

  return normalized
}

const mapPermissionEntries = (userId: string, permissionMap: unknown): ModulePermission[] => {
  return Object.entries(normalizePermissionMap(permissionMap))
    .filter(([, permission]) => typeof permission === 'string' && permission !== 'none')
    .map(([module, permission]) => ({
      user_id: userId,
      module: module as AppModule,
      permission: permission as PermissionLevel,
    }))
}

const permissionRank: Record<PermissionLevel, number> = {
  none: 0,
  view: 1,
  edit: 2,
  approve: 3,
  admin: 4,
}

const mergeHighestPermission = (map: Map<AppModule, ModulePermission>, permission: ModulePermission) => {
  if (!permission.permission || permission.permission === 'none') return

  const existing = map.get(permission.module)
  if (!existing || permissionRank[permission.permission] > permissionRank[existing.permission]) {
    map.set(permission.module, permission)
  }
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

  // Track last fetched user id to avoid re-fetching (and toggling loading=true)
  // when the user object reference changes but the actual user is the same
  // (e.g. on TOKEN_REFRESHED). This prevents the "verifying permissions" flash
  // that was unmounting protected pages on tab switch.
  const lastFetchedUserId = useRef<string | null>(null)
  const accessProfileIdRef = useRef<string | null>(null)
  const refreshTimeoutRef = useRef<number | null>(null)
  const isImpersonatingRef = useRef(false)

  useEffect(() => {
    isImpersonatingRef.current = isImpersonating
  }, [isImpersonating])

  const fetchUserRoleAndPermissions = useCallback(async (options?: { forceLoading?: boolean }) => {
      if (!user) {
        lastFetchedUserId.current = null
        accessProfileIdRef.current = null
        setRole(null)
        setPermissions([])
        setLoading(false)
        return
      }

      // Only show full loader on first load for this user
      const isFirstLoadForUser = lastFetchedUserId.current !== user.id
      if (isFirstLoadForUser || options?.forceLoading) {
        setLoading(true)
      }
      lastFetchedUserId.current = user.id

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

        let profileRole: UserRole = null
        let profilePermissions: ModulePermission[] = []

        const accessProfileId = roleData?.access_profile_id || null
        accessProfileIdRef.current = accessProfileId

        if (accessProfileId) {
          const { data: profileData, error: profileError } = await supabase
            .from('access_profiles')
            .select('base_role, permissions')
            .eq('id', accessProfileId)
            .maybeSingle()

          if (profileError) {
            console.error('Error fetching access profile permissions:', profileError)
          } else if (profileData) {
            profileRole = mapRawRole(profileData.base_role)
            profilePermissions = mapPermissionEntries(user.id, profileData.permissions || {})
          }
        }

        const fallbackRole = mapRawRole(roleData?.role)
        const resolvedRole = fallbackRole === 'admin' ? 'admin' : (profileRole || fallbackRole)
        setRole(resolvedRole)

        const { data: permData, error: permError } = await supabase
          .from('user_module_permissions')
          .select('*')
          .eq('user_id', user.id)

        if (permError) {
          console.error('Error fetching permissions:', permError)
          setPermissions(profilePermissions)
        } else {
          const legacyPermissions = (permData || [])
            .filter(p => p.permission && p.permission !== 'none')
            .map(p => ({
              id: p.id,
              user_id: p.user_id,
              module: p.module as AppModule,
              permission: p.permission as PermissionLevel,
              created_at: p.created_at,
              updated_at: p.updated_at
            }))

          const mergedPermissions = new Map<AppModule, ModulePermission>()
          profilePermissions.forEach(permission => mergeHighestPermission(mergedPermissions, permission))
          legacyPermissions.forEach(permission => mergeHighestPermission(mergedPermissions, permission))

          setPermissions(Array.from(mergedPermissions.values()))
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setRole(null)
        setPermissions([])
      } finally {
        setLoading(false)
      }
    }, [user?.id])

  useEffect(() => {
    fetchUserRoleAndPermissions({ forceLoading: true })
  }, [fetchUserRoleAndPermissions])

  useEffect(() => {
    if (!user) return

    const schedulePermissionRefresh = () => {
      if (isImpersonatingRef.current) return

      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current)
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null
        fetchUserRoleAndPermissions()
      }, 250)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        schedulePermissionRefresh()
      }
    }

    window.addEventListener('focus', schedulePermissionRefresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const permissionsChannel = supabase
      .channel(`user-permissions-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles', filter: `user_id=eq.${user.id}` },
        schedulePermissionRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_module_permissions', filter: `user_id=eq.${user.id}` },
        schedulePermissionRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'access_profiles' },
        (payload) => {
          const profileId = accessProfileIdRef.current
          const changedProfileId =
            (payload.new as { id?: string } | null)?.id ||
            (payload.old as { id?: string } | null)?.id

          if (profileId && changedProfileId === profileId) {
            schedulePermissionRefresh()
          }
        },
      )
      .subscribe()

    return () => {
      window.removeEventListener('focus', schedulePermissionRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }

      supabase.removeChannel(permissionsChannel)
    }

    // Depend on user id (not the object reference) so token refreshes don't
    // re-trigger the subscription and unmount protected children.
  }, [user?.id, fetchUserRoleAndPermissions])

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
    if (!isImpersonating && role === 'admin') return 'admin'
    const perm = permissions.find(p => p.module === module)
    return perm?.permission || 'none'
  }

  const canViewModule = (module: AppModule): boolean => {
    if (loading) return false
    if (!isImpersonating && role === 'admin') return true
    const level = getModulePermission(module)
    return ['view', 'edit', 'approve', 'admin'].includes(level)
  }

  const canEditModule = (module: AppModule): boolean => {
    if (loading) return false
    if (!isImpersonating && role === 'admin') return true
    const level = getModulePermission(module)
    return ['edit', 'approve', 'admin'].includes(level)
  }

  const canApproveModule = (module: AppModule): boolean => {
    if (loading) return false
    if (!isImpersonating && role === 'admin') return true
    const level = getModulePermission(module)
    return ['approve', 'admin'].includes(level)
  }

  const canManageModule = (module: AppModule): boolean => {
    if (loading) return false
    if (!isImpersonating && role === 'admin') return true
    return getModulePermission(module) === 'admin'
  }

  const isAdmin = (): boolean => !isImpersonating && (realRole === 'admin' || role === 'admin')
  const isGestor = (): boolean => role === 'gestor'
  const isOperador = (): boolean => role === 'operador'
  const isVisualizador = (): boolean => role === 'visualizador'
  const canEdit = (): boolean => role !== 'visualizador' && role !== null

  const startImpersonation = (simulatedRole: UserRole, simulatedPermissions: ModulePermission[]) => {
    if (realRole === null && role !== null) {
      setRealRole(role)
      setRealPermissions(permissions)
    }
    setRole(simulatedRole)
    setPermissions(simulatedPermissions)
    setIsImpersonating(true)
  }

  const stopImpersonation = () => {
    if (realRole !== null) {
      setRole(realRole)
      setPermissions(realPermissions)
    }
    setRealRole(null)
    setRealPermissions([])
    setIsImpersonating(false)
  }

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
    canManageModule,
    isAdmin,
    isGestor,
    isOperador,
    isVisualizador,
    canEdit,
    isImpersonating,
    realRole,
    startImpersonation,
    stopImpersonation,
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
