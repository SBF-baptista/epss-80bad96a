import { supabase } from '@/integrations/supabase/client'

export interface User {
  id: string
  email?: string
  created_at: string
  last_sign_in_at?: string
  roles: string[]
}

export interface CreateUserData {
  email: string
  password: string
  role: 'admin' | 'installer'
}

export interface UpdateUserData {
  userId: string
  role?: 'admin' | 'installer'
  resetPassword?: boolean
}

export interface UserManagementResponse {
  success: boolean
  message?: string
  user?: any
  users?: User[]
  temporaryPassword?: string
  error?: string
}

class UserManagementService {
  async createUser(userData: CreateUserData): Promise<UserManagementResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { ...userData, action: 'create' },
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (error) {
        throw error
      }

      return data
    } catch (error: any) {
      console.error('Error creating user:', error)
      return {
        success: false,
        error: error.message || 'Failed to create user'
      }
    }
  }

  async updateUser(updateData: UpdateUserData): Promise<UserManagementResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { ...updateData, action: 'update' },
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (error) {
        throw error
      }

      return data
    } catch (error: any) {
      console.error('Error updating user:', error)
      return {
        success: false,
        error: error.message || 'Failed to update user'
      }
    }
  }

  async listUsers(): Promise<UserManagementResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (error) {
        throw error
      }

      return data
    } catch (error: any) {
      console.error('Error listing users:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch users'
      }
    }
  }

  async resetUserPassword(userId: string): Promise<UserManagementResponse> {
    return this.updateUser({
      userId,
      resetPassword: true
    })
  }

  async updateUserRole(userId: string, role: 'admin' | 'installer'): Promise<UserManagementResponse> {
    return this.updateUser({
      userId,
      role
    })
  }
}

export const userManagementService = new UserManagementService()