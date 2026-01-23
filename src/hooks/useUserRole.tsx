import { useState, useEffect } from 'react'
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

export const useUserRole = () => {
  const { user } = useAuth()
  const [role, setRole] = useState<UserRole>(null)
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserRoleAndPermissions = async () => {
      if (!user) {
        setRole(null)
        setPermissions([])
        setLoading(false)
        return
      }

      try {
        // Fetch user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()

        if (roleError) {
          console.error('Error fetching user role:', roleError)
          setRole(null)
        } else {
          // Map legacy roles to new roles
          const rawRole = roleData?.role as string | null
          let mappedRole: UserRole = null
          
          if (rawRole === 'admin') {
            mappedRole = 'admin'
          } else if (rawRole === 'gestor') {
            mappedRole = 'gestor'
          } else if (rawRole === 'operador' || rawRole?.startsWith('operador_')) {
            mappedRole = 'operador'
          } else if (rawRole === 'visualizador') {
            mappedRole = 'visualizador'
          }
          
          setRole(mappedRole)
        }

        // Fetch module permissions
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
    // Admin always has full access
    if (role === 'admin') return 'admin'
    
    const perm = permissions.find(p => p.module === module)
    return perm?.permission || 'none'
  }

  const canViewModule = (module: AppModule): boolean => {
    if (role === 'admin') return true
    const level = getModulePermission(module)
    return ['view', 'edit', 'approve', 'admin'].includes(level)
  }

  const canEditModule = (module: AppModule): boolean => {
    if (role === 'admin') return true
    const level = getModulePermission(module)
    return ['edit', 'approve', 'admin'].includes(level)
  }

  const canApproveModule = (module: AppModule): boolean => {
    if (role === 'admin') return true
    const level = getModulePermission(module)
    return ['approve', 'admin'].includes(level)
  }

  // Legacy helpers for backwards compatibility
  const isAdmin = (): boolean => role === 'admin'
  const isGestor = (): boolean => role === 'gestor'
  const isOperador = (): boolean => role === 'operador'
  const isVisualizador = (): boolean => role === 'visualizador'
  
  // Legacy - check if can edit (not visualizador)
  const canEdit = (): boolean => role !== 'visualizador' && role !== null

  return {
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
}
