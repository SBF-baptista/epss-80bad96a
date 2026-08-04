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
  accessProfileName: string | null
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

const normalizeModulePermission = (module: AppModule, permission: PermissionLevel): ModulePermission => ({
  user_id: '',
  module,
  permission,
})


const permissionRank: Record<PermissionLevel, number> = {
  none: 0,
  view: 1,
  edit: 2,
  approve: 3,
  admin: 4,
}

const roleRank: Record<Exclude<UserRole, null>, number> = {
  visualizador: 1,
  operador: 2,
  gestor: 3,
  admin: 4,
}

const pickHighestRole = (roles: UserRole[]): UserRole => {
  return roles.reduce<UserRole>((highest, current) => {
    if (!current) return highest
    if (!highest) return current
    return roleRank[current] > roleRank[highest] ? current : highest
  }, null)
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
  const [accessProfileName, setAccessProfileName] = useState<string | null>(null)
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
  const accessProfileIdsRef = useRef<Set<string>>(new Set())
  const refreshTimeoutRef = useRef<number | null>(null)
  const isImpersonatingRef = useRef(false)

  useEffect(() => {
    isImpersonatingRef.current = isImpersonating
  }, [isImpersonating])

  const fetchUserRoleAndPermissions = useCallback(async (options?: { forceLoading?: boolean }) => {
      if (!user) {
        lastFetchedUserId.current = null
        accessProfileIdsRef.current = new Set()
        setRole(null)
        setAccessProfileName(null)
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
        const { data: roleRows, error: roleError } = await supabase
          .from('user_roles')
          .select('role, access_profile_id')
          .eq('user_id', user.id)

        if (roleError) {
          console.error('Error fetching user role:', roleError)
          setRole(null)
          setPermissions([])
          return
        }

        const fallbackRole = pickHighestRole((roleRows || []).map(row => mapRawRole(row.role)))

        const accessProfileIds = Array.from(
          new Set(
            (roleRows || [])
              .map(row => row.access_profile_id)
              .filter((id): id is string => Boolean(id)),
          ),
        )
        accessProfileIdsRef.current = new Set(accessProfileIds)

        let profileRole: UserRole = null
        let profileName: string | null = null
        const profilePermissions = new Map<AppModule, ModulePermission>()

        if (accessProfileIds.length > 0) {
          const [{ data: profileData, error: profileError }, { data: profilePerms, error: profilePermsError }] =
            await Promise.all([
              supabase.from('access_profiles').select('name, base_role').in('id', accessProfileIds),
              supabase
                .from('access_profile_permissions')
                .select('module, level')
                .in('profile_id', accessProfileIds),
            ])

          if (profileError) {
            console.error('Error fetching access profile:', profileError)
          } else if (profileData?.length) {
            profileRole = pickHighestRole(profileData.map(profile => mapRawRole(profile.base_role)))
            profileName = profileData[0]?.name || null
          }

          if (profilePermsError) {
            console.error('Error fetching access profile permissions:', profilePermsError)
          } else {
            (profilePerms || [])
              .filter(p => p.level && p.level !== 'none')
              .forEach(p =>
                mergeHighestPermission(
                  profilePermissions,
                  { ...normalizeModulePermission(p.module as AppModule, p.level as PermissionLevel), user_id: user.id },
                ),
              )
          }
        }

        const resolvedRole = fallbackRole === 'admin' ? 'admin' : (profileRole || fallbackRole)
        setRole(resolvedRole)
        setAccessProfileName(profileName)

        // Exceções por usuário: SEMPRE vencem o perfil (para mais ou para menos)
        const { data: overrides, error: overridesError } = await supabase
          .from('user_permission_overrides')
          .select('module, level')
          .eq('user_id', user.id)

        if (overridesError) {
          console.error('Error fetching permission overrides:', overridesError)
          setPermissions(Array.from(profilePermissions.values()))
        } else {
          const finalPermissions = new Map(profilePermissions)

          ;(overrides || []).forEach(o => {
            const module = o.module as AppModule
            const level = o.level as PermissionLevel
            if (!level || level === 'none') {
              finalPermissions.delete(module)
              return
            }
            finalPermissions.set(module, {
              ...normalizeModulePermission(module, level),
              user_id: user.id,
            })
          })

          setPermissions(Array.from(finalPermissions.values()))
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setRole(null)
        setAccessProfileName(null)
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
          const profileIds = accessProfileIdsRef.current
          const changedProfileId =
            (payload.new as { id?: string } | null)?.id ||
            (payload.old as { id?: string } | null)?.id

          if (changedProfileId && profileIds.has(changedProfileId)) {
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
    accessProfileName,
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
