import { supabase } from '@/integrations/supabase/client'
import { AppModule, PermissionLevel } from '@/types/permissions'

type BaseRole = 'admin' | 'gestor' | 'operador' | 'visualizador'

export interface AccessProfile {
  id: string
  name: string
  description: string | null
  base_role: BaseRole
  permissions: Record<AppModule, PermissionLevel>
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface CreateAccessProfileData {
  name: string
  description?: string
  base_role: 'admin' | 'gestor' | 'operador' | 'visualizador'
  permissions: Record<AppModule, PermissionLevel>
}

export interface UpdateAccessProfileData {
  name?: string
  description?: string
  base_role?: 'admin' | 'gestor' | 'operador' | 'visualizador'
  permissions?: Record<AppModule, PermissionLevel>
}

class AccessProfileService {
  // Normalize legacy roles to new roles
  private normalizeRole(role: string): BaseRole {
    if (role === 'admin') return 'admin'
    if (role === 'gestor') return 'gestor'
    if (role === 'visualizador') return 'visualizador'
    if (role?.startsWith('operador')) return 'operador'
    return 'visualizador'
  }
  private async fetchPermissionsMap(profileIds: string[]): Promise<Record<string, Record<AppModule, PermissionLevel>>> {
    const result: Record<string, Record<AppModule, PermissionLevel>> = {}
    if (profileIds.length === 0) return result

    const { data, error } = await supabase
      .from('access_profile_permissions')
      .select('profile_id, module, level')
      .in('profile_id', profileIds)

    if (error) {
      console.error('Error fetching access profile permissions:', error)
      return result
    }

    ;(data || []).forEach(row => {
      const bucket = result[row.profile_id] || (result[row.profile_id] = {} as Record<AppModule, PermissionLevel>)
      bucket[row.module as AppModule] = row.level as PermissionLevel
    })

    return result
  }

  private async replacePermissions(profileId: string, permissions: Record<AppModule, PermissionLevel>) {
    const rows = Object.entries(permissions || {})
      .filter(([, level]) => level && level !== 'none')
      .map(([module, level]) => ({ profile_id: profileId, module: module as AppModule, level: level as PermissionLevel }))

    const { error: deleteError } = await supabase
      .from('access_profile_permissions')
      .delete()
      .eq('profile_id', profileId)

    if (deleteError) throw deleteError

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from('access_profile_permissions')
        .insert(rows)

      if (insertError) throw insertError
    }
  }

  async listProfiles(): Promise<AccessProfile[]> {
    const { data, error } = await supabase
      .from('access_profiles')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching access profiles:', error)
      throw error
    }

    const permissionsByProfile = await this.fetchPermissionsMap((data || []).map(p => p.id))

    return (data || []).map(profile => ({
      ...profile,
      base_role: this.normalizeRole(profile.base_role),
      permissions: (permissionsByProfile[profile.id] || {}) as Record<AppModule, PermissionLevel>
    }))
  }

  async getProfile(id: string): Promise<AccessProfile | null> {
    const { data, error } = await supabase
      .from('access_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching access profile:', error)
      return null
    }

    const permissionsByProfile = await this.fetchPermissionsMap([id])

    return {
      ...data,
      base_role: this.normalizeRole(data.base_role),
      permissions: (permissionsByProfile[id] || {}) as Record<AppModule, PermissionLevel>
    }
  }

  async createProfile(profileData: CreateAccessProfileData): Promise<{ success: boolean; profile?: AccessProfile; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('access_profiles')
        .insert({
          name: profileData.name,
          description: profileData.description,
          base_role: profileData.base_role,
          permissions: profileData.permissions, // mantido apenas como registro histórico
          created_by: user?.id
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      await this.replacePermissions(data.id, profileData.permissions)

      return { 
        success: true, 
        profile: {
          ...data,
          base_role: this.normalizeRole(data.base_role),
          permissions: profileData.permissions
        }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async updateProfile(id: string, profileData: UpdateAccessProfileData): Promise<{ success: boolean; error?: string }> {
    try {
      const { permissions, ...rest } = profileData

      const { error } = await supabase
        .from('access_profiles')
        .update({
          ...rest,
          ...(permissions ? { permissions } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      if (permissions) {
        await this.replacePermissions(id, permissions)
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async deleteProfile(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if profile is in use
      const { data: usersWithProfile } = await supabase
        .from('user_roles')
        .select('id')
        .eq('access_profile_id', id)
        .limit(1)

      if (usersWithProfile && usersWithProfile.length > 0) {
        return { success: false, error: 'Este perfil está em uso e não pode ser excluído' }
      }

      const { error } = await supabase
        .from('access_profiles')
        .delete()
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const accessProfileService = new AccessProfileService()
