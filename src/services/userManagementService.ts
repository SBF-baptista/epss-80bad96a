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
  role: 'admin' | 'installer' | 'order_manager'
}

export interface UpdateUserData {
  userId: string
  role?: 'admin' | 'installer' | 'order_manager'
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
        role: userData.role
      };

      console.log('Request body:', JSON.stringify(requestBody));

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: requestBody
      });

      console.log('Response data:', data);
      console.log('Response error:', error);

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
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
        action: 'update',
        userId: updateData.userId,
        role: updateData.role,
        resetPassword: updateData.resetPassword
      };

      console.log('Update request body:', JSON.stringify(requestBody));

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: requestBody
      });

      console.log('Update response data:', data);
      console.log('Update response error:', error);

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
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

      console.log('List users response data:', data);
      console.log('List users response error:', error);

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

  async updateUserRole(userId: string, role: 'admin' | 'installer' | 'order_manager'): Promise<UserManagementResponse> {
    return this.updateUser({
      userId,
      role
    })
  }
}

export const userManagementService = new UserManagementService()