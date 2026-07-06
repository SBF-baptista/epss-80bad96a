import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Users, RefreshCw } from 'lucide-react'
import { teamService, Team } from '@/services/teamService'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { MODULE_GROUPS } from '@/types/permissions'
import { TeamModal } from './TeamModal'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props {
  canEdit: boolean
}

export const TeamsTab = ({ canEdit }: Props) => {
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)

  const fetch = async () => {
    try {
      const list = await teamService.list()
      setTeams(list)
      // Get member counts
      const { data } = await supabase.from('user_roles').select('team_id, user_id').not('team_id' as any, 'is', null)
      const counts: Record<string, Set<string>> = {}
      ;((data as any[]) || []).forEach((r) => {
        if (!r.team_id) return
        if (!counts[r.team_id]) counts[r.team_id] = new Set()
        counts[r.team_id].add(r.user_id)
      })
      const finalCounts: Record<string, number> = {}
      Object.entries(counts).forEach(([k, v]) => (finalCounts[k] = v.size))
      setMemberCounts(finalCounts)
    } catch (e: any) {
      toast({ title: 'Erro ao carregar times', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetch() }, [])

  const handleDelete = async () => {
    if (!deletingTeam) return
    const r = await teamService.remove(deletingTeam.id)
    if (r.success) {
      toast({ title: 'Time excluído' })
      fetch()
    } else {
      toast({ title: 'Erro', description: r.error, variant: 'destructive' })
    }
    setDeletingTeam(null)
  }

  const countPerms = (t: Team) => Object.values(t.permissions || {}).filter((p) => p !== 'none').length

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); fetch() }} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        {canEdit && (
          <Button size="sm" onClick={() => { setEditingTeam(null); setShowModal(true) }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Time
          </Button>
        )}
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum time cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie times para agrupar usuários e definir permissões coletivas.
            </p>
            {canEdit && (
              <Button onClick={() => { setEditingTeam(null); setShowModal(true) }}>
                <Plus className="h-4 w-4 mr-2" /> Criar Primeiro Time
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow border-none shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                    {t.description && <CardDescription className="mt-1">{t.description}</CardDescription>}
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {memberCounts[t.id] || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {countPerms(t)} módulos com permissão
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(t.permissions || {})
                    .filter(([, l]) => l !== 'none')
                    .slice(0, 4)
                    .map(([mod]) => {
                      const cfg = Object.values(MODULE_GROUPS).flatMap((g) => g.modules).find((m) => m.key === mod)
                      return <Badge key={mod} variant="outline" className="text-xs">{cfg?.label || mod}</Badge>
                    })}
                  {countPerms(t) > 4 && <Badge variant="outline" className="text-xs">+{countPerms(t) - 4}</Badge>}
                </div>
                {canEdit && (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1"
                      onClick={() => { setEditingTeam(t); setShowModal(true) }}>
                      <Pencil className="h-4 w-4 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingTeam(t)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TeamModal open={showModal} onOpenChange={setShowModal} team={editingTeam} onSaved={fetch} />

      <AlertDialog open={!!deletingTeam} onOpenChange={() => setDeletingTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Time</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o time "{deletingTeam?.name}"? Os membros ficarão sem time,
              mas seus perfis de acesso individuais serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
