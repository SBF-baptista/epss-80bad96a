import { supabase } from '@/integrations/supabase/client'
import { logCreate, logUpdate } from './logService'

export interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  confirmed_at?: string
  banned_until?: string
  updated_at?: string
  status: 'active' | 'banned' | 'inactive'
  roles: string[]
  permissions?: { module: string; permission: string }[]
}

export interface CreateUserData {
  email: string
  password: string
  baseRole: 'admin' | 'gestor' | 'operador' | 'visualizador'
  permissions?: Record<string, string>
  accessProfileId?: string
}

export interface UpdateUserData {
  userId: string
  baseRole?: 'admin' | 'gestor' | 'operador' | 'visualizador'
  permissions?: Record<string, string>
  accessProfileId?: string
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
      console.log('Sending create user request:', userData);
      
      const requestBody = {
        action: 'create',
        email: userData.email,
        password: userData.password,
        baseRole: userData.baseRole,
        permissions: userData.permissions
      };

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: requestBody
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data.success && data.user) {
        await logCreate("Usuários", "usuário", data.user.id);
      }

      return data;
    } catch (error: any) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error.message || 'Failed to create user'
      };
    }
  }

  async updateUser(updateData: UpdateUserData): Promise<UserManagementResponse> {
    try {
      console.log('Sending update user request:', updateData);
      
      const requestBody = {
        action: updateData.permissions ? 'update-permissions' : 'update',
        userId: updateData.userId,
        baseRole: updateData.baseRole,
        permissions: updateData.permissions,
        resetPassword: updateData.resetPassword
      };

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: requestBody
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data.success) {
        const changes = [];
        if (updateData.baseRole) changes.push(`Função: ${updateData.baseRole}`);
        if (updateData.permissions) changes.push("Permissões atualizadas");
        if (updateData.resetPassword) changes.push("Senha resetada");
        
        await logUpdate(
          "Usuários",
          "usuário",
          updateData.userId,
          changes.join(", ")
        );
      }

      return data;
    } catch (error: any) {
      console.error('Error updating user:', error);
      return {
        success: false,
        error: error.message || 'Failed to update user'
      };
    }
  }

  async listUsers(): Promise<UserManagementResponse> {
    try {
      console.log('Fetching users...');
      
      const { data, error } = await supabase.functions.invoke('manage-users');

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Error listing users:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch users'
      };
    }
  }

  async resetUserPassword(userId: string): Promise<UserManagementResponse> {
    return this.updateUser({
      userId,
      resetPassword: true
    })
  }

  async updateUserRole(userId: string, baseRole: 'admin' | 'gestor' | 'operador' | 'visualizador'): Promise<UserManagementResponse> {
    return this.updateUser({
      userId,
      baseRole
    })
  }

  async deleteUser(userId: string): Promise<UserManagementResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete-user', userId }
      })
      if (error) throw error
      if (data.success) {
        await logCreate("Usuários", "exclusão de usuário", userId)
      }
      return data
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete user' }
    }
  }

  async bulkAction(userIds: string[], bulkAction: 'ban' | 'unban' | 'delete'): Promise<UserManagementResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'bulk-action', userIds, bulkAction }
      })
      if (error) throw error
      return data
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to execute bulk action' }
    }
  }
}

export const userManagementService = new UserManagementService()
