import { supabase } from '@/integrations/supabase/client'
import { AppModule, PermissionLevel } from '@/types/permissions'

// Cast client to any: teams table types will regenerate later
const db: any = supabase

export interface Team {
  id: string
  name: string
  description: string | null
  permissions: Record<AppModule, PermissionLevel>
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateTeamData {
  name: string
  description?: string
  permissions: Record<AppModule, PermissionLevel>
}

class TeamService {
  async list(): Promise<Team[]> {
    const { data, error } = await db.from('teams').select('*').order('name')
    if (error) throw error
    return ((data as any[]) || []).map((t) => ({
      ...t,
      permissions: (t.permissions || {}) as Record<AppModule, PermissionLevel>,
    })) as Team[]
  }

  async create(payload: CreateTeamData): Promise<{ success: boolean; team?: Team; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await db
        .from('teams')
        .insert({
          name: payload.name,
          description: payload.description ?? null,
          permissions: payload.permissions,
          created_by: user?.id,
        })
        .select()
        .single()
      if (error) return { success: false, error: error.message }
      return { success: true, team: data as Team }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async update(id: string, payload: Partial<CreateTeamData>): Promise<{ success: boolean; error?: string }> {
    const { error } = await db
      .from('teams')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  async remove(id: string): Promise<{ success: boolean; error?: string }> {
    await db.from('user_roles').update({ team_id: null }).eq('team_id', id)
    const { error } = await db.from('teams').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  async listMembers(teamId: string): Promise<string[]> {
    const { data, error } = await db.from('user_roles').select('user_id').eq('team_id', teamId)
    if (error) throw error
    return Array.from(new Set(((data as any[]) || []).map((r) => r.user_id)))
  }

  async setMembers(teamId: string, userIds: string[]): Promise<{ success: boolean; error?: string }> {
    const { error: clearErr } = await db.from('user_roles').update({ team_id: null }).eq('team_id', teamId)
    if (clearErr) return { success: false, error: clearErr.message }
    if (userIds.length === 0) return { success: true }
    const { error: setErr } = await db.from('user_roles').update({ team_id: teamId }).in('user_id', userIds)
    if (setErr) return { success: false, error: setErr.message }
    return { success: true }
  }
}

export const teamService = new TeamService()
