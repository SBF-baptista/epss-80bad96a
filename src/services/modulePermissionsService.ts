import { supabase } from '@/integrations/supabase/client';
import { 
  AppModule, 
  BaseRole, 
  ModulePermission, 
  PermissionLevel, 
  UserWithPermissions,
  getDefaultPermissionsForRole,
  ALL_MODULES
} from '@/types/permissions';

interface ApiResponse {
  success: boolean;
  error?: string;
  message?: string;
  users?: UserWithPermissions[];
  permissions?: ModulePermission[];
}

class ModulePermissionsService {
  // Get permissions for a specific user
  async getUserPermissions(userId: string): Promise<ModulePermission[]> {
    // Use RPC to get permissions (bypasses RLS for admin view)
    const { data, error } = await supabase
      .from('user_module_permissions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user permissions:', error);
      return [];
    }

    return (data || []).map(p => ({
      id: p.id,
      user_id: p.user_id,
      module: p.module as AppModule,
      permission: p.permission as PermissionLevel,
      created_at: p.created_at,
      updated_at: p.updated_at
    }));
  }

  // Get current user's permissions
  async getMyPermissions(): Promise<ModulePermission[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_module_permissions')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching my permissions:', error);
      return [];
    }

    return (data || []).map(p => ({
      id: p.id,
      user_id: p.user_id,
      module: p.module as AppModule,
      permission: p.permission as PermissionLevel,
      created_at: p.created_at,
      updated_at: p.updated_at
    }));
  }

  // Check if current user can perform action on module
  async canPerformAction(module: AppModule, requiredLevel: PermissionLevel): Promise<boolean> {
    const permissions = await this.getMyPermissions();
    const modulePermission = permissions.find(p => p.module === module);
    
    if (!modulePermission) return false;

    const levels: PermissionLevel[] = ['none', 'view', 'edit', 'approve', 'admin'];
    const userLevel = levels.indexOf(modulePermission.permission);
    const requiredLevelIndex = levels.indexOf(requiredLevel);

    return userLevel >= requiredLevelIndex;
  }

  // Update user permissions (called via edge function)
  async updateUserPermissions(
    userId: string, 
    baseRole: BaseRole,
    permissions: Record<AppModule, PermissionLevel>
  ): Promise<ApiResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update-permissions',
          userId,
          baseRole,
          permissions
        }
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      return response.data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Create user with permissions
  async createUserWithPermissions(
    email: string,
    password: string,
    baseRole: BaseRole,
    permissions: Record<AppModule, PermissionLevel>
  ): Promise<ApiResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email,
          password,
          baseRole,
          permissions
        }
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      return response.data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Apply base role defaults to permissions
  applyBaseRoleDefaults(baseRole: BaseRole): Record<AppModule, PermissionLevel> {
    return getDefaultPermissionsForRole(baseRole);
  }

  // Get all modules
  getAllModules() {
    return ALL_MODULES;
  }
}

export const modulePermissionsService = new ModulePermissionsService();
