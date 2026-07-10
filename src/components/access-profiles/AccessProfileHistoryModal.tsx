import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/integrations/supabase/client'
import { PERMISSION_LABELS, MODULE_GROUPS, PermissionLevel } from '@/types/permissions'
import { History } from 'lucide-react'

interface ChangeItem {
  module?: string
  from?: PermissionLevel | string
  to?: PermissionLevel | string
  field?: string
  fromValue?: string
  toValue?: string
}

interface HistoryRow {
  id: string
  created_at: string
  changed_by_email: string | null
  changes: ChangeItem[]
  name_before: string | null
  name_after: string | null
  description_before: string | null
  description_after: string | null
}

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  profileId: string
  profileName: string
}

const moduleLabel = (key?: string) => {
  if (!key) return ''
  const m = Object.values(MODULE_GROUPS)
    .flatMap((g) => g.modules)
    .find((m) => m.key === key)
  return m?.label || key
}

const levelLabel = (lvl?: string) =>
  lvl ? PERMISSION_LABELS[lvl as PermissionLevel] || lvl : '—'

export const AccessProfileHistoryModal = ({ open, onOpenChange, profileId, profileName }: Props) => {
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    supabase
      .from('access_profile_history')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRows((data || []) as HistoryRow[])
        setLoading(false)
      })
  }, [open, profileId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </DialogTitle>
          <DialogDescription>
            Perfil: <strong>{profileName}</strong>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma alteração registrada.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium">{r.changed_by_email || 'Usuário desconhecido'}</span>
                    <span className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {r.name_before !== r.name_after && (
                    <div className="text-xs">
                      Nome: <span className="text-muted-foreground">{r.name_before || '—'}</span> →{' '}
                      <strong>{r.name_after || '—'}</strong>
                    </div>
                  )}
                  {r.description_before !== r.description_after && (
                    <div className="text-xs">
                      Descrição alterada
                    </div>
                  )}
                  {r.changes && r.changes.length > 0 && (
                    <div className="space-y-1">
                      {r.changes.map((c, i) => (
                        <div key={i} className="text-xs flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{moduleLabel(c.module)}:</span>
                          <Badge variant="outline" className="text-[10px]">
                            {levelLabel(c.from as string)}
                          </Badge>
                          <span>→</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {levelLabel(c.to as string)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
