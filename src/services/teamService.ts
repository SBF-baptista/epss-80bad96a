import { supabase } from '@/integrations/supabase/client'
import { AppModule, PermissionLevel } from '@/types/permissions'

export interface Team {
  id: string
  name: string
  description: string | null
  permissions: Record<AppModule, PermissionLevel>
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TeamMember {
  user_id: string
  email: string
}

export interface CreateTeamData {
  name: string
  description?: string
  permissions: Record<AppModule, PermissionLevel>
}

class TeamService {
  async list(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams' as any)
      .select('*')
      .order('name')
    if (error) throw error
    return ((data as any[]) || []).map((t) => ({
      ...t,
      permissions: (t.permissions || {}) as Record<AppModule, PermissionLevel>,
    })) as Team[]
  }

  async create(payload: CreateTeamData): Promise<{ success: boolean; team?: Team; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('teams' as any)
        .insert({
          name: payload.name,
          description: payload.description ?? null,
          permissions: payload.permissions,
          created_by: user?.id,
        } as any)
        .select()
        .single()
      if (error) return { success: false, error: error.message }
      return { success: true, team: data as any }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async update(id: string, payload: Partial<CreateTeamData>): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('teams' as any)
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  async remove(id: string): Promise<{ success: boolean; error?: string }> {
    // Unassign members first (FK is ON DELETE SET NULL, but be explicit)
    await supabase.from('user_roles').update({ team_id: null } as any).eq('team_id' as any, id)
    const { error } = await supabase.from('teams' as any).delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  async listMembers(teamId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('team_id' as any, teamId)
    if (error) throw error
    return Array.from(new Set(((data as any[]) || []).map((r) => r.user_id)))
  }

  async setMembers(teamId: string, userIds: string[]): Promise<{ success: boolean; error?: string }> {
    // Clear team for users no longer in team
    const { error: clearErr } = await supabase
      .from('user_roles')
      .update({ team_id: null } as any)
      .eq('team_id' as any, teamId)
    if (clearErr) return { success: false, error: clearErr.message }

    if (userIds.length === 0) return { success: true }

    // Assign team to selected users' role rows (all rows of that user)
    const { error: setErr } = await supabase
      .from('user_roles')
      .update({ team_id: teamId } as any)
      .in('user_id', userIds)
    if (setErr) return { success: false, error: setErr.message }
    return { success: true }
  }
}

export const teamService = new TeamService()
