import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'

export type UserRole = 'admin' | 'installer' | 'order_manager' | null

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

  const isAdmin = (): boolean => hasRole('admin')
  const isInstaller = (): boolean => hasRole('installer')
  const isOrderManager = (): boolean => hasRole('order_manager')

  return {
    role,
    loading,
    hasRole,
    isAdmin,
    isInstaller,
    isOrderManager
  }
}