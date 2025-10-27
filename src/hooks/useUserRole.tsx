import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'

export type UserRole = 
  | 'admin' 
  | 'gestor' 
  | 'operador_kickoff' 
  | 'operador_homologacao' 
  | 'operador_agendamento' 
  | 'operador_suprimentos' 
  | null

export const useUserRole = () => {
  const { user } = useAuth()
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole(null)
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) {
          console.error('Error fetching user role:', error)
          setRole(null)
        } else {
          setRole(data?.role || null)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [user])

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!role || !requiredRole) return false
    return role === requiredRole
  }

  const hasAnyRole = (requiredRoles: UserRole[]): boolean => {
    if (!role) return false
    return requiredRoles.includes(role)
  }

  const isAdmin = (): boolean => hasRole('admin')
  const isGestor = (): boolean => hasRole('gestor')
  const isOperadorKickoff = (): boolean => hasRole('operador_kickoff')
  const isOperadorHomologacao = (): boolean => hasRole('operador_homologacao')
  const isOperadorAgendamento = (): boolean => hasRole('operador_agendamento')
  const isOperadorSuprimentos = (): boolean => hasRole('operador_suprimentos')

  // Permissões por área
  const canAccessKickoff = (): boolean => hasAnyRole(['admin', 'operador_kickoff'])
  const canAccessHomologation = (): boolean => hasAnyRole(['admin', 'operador_homologacao'])
  const canAccessPlanning = (): boolean => hasAnyRole(['admin', 'operador_agendamento'])
  const canAccessSupply = (): boolean => hasAnyRole(['admin', 'operador_suprimentos'])
  
  // Permissões de edição (Gestor só visualiza)
  const canEdit = (): boolean => role !== 'gestor' && role !== null

  return {
    role,
    loading,
    hasRole,
    hasAnyRole,
    isAdmin,
    isGestor,
    isOperadorKickoff,
    isOperadorHomologacao,
    isOperadorAgendamento,
    isOperadorSuprimentos,
    canAccessKickoff,
    canAccessHomologation,
    canAccessPlanning,
    canAccessSupply,
    canEdit
  }
}