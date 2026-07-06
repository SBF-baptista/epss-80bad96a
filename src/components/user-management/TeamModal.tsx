import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PermissionMatrix } from './PermissionMatrix'
import { AppModule, PermissionLevel, ALL_MODULES } from '@/types/permissions'
import { teamService, Team } from '@/services/teamService'
import { userManagementService, User } from '@/services/userManagementService'
import { useToast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: Team | null
  onSaved: () => void
}

const emptyPerms = (): Record<AppModule, PermissionLevel> => {
  const p: any = {}
  ALL_MODULES.forEach((m) => (p[m.key] = 'none'))
  return p
}

export const TeamModal = ({ open, onOpenChange, team, onSaved }: Props) => {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<Record<AppModule, PermissionLevel>>(emptyPerms())
  const [users, setUsers] = useState<User[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(team?.name || '')
    setDescription(team?.description || '')
    setPermissions({ ...emptyPerms(), ...(team?.permissions || {}) })
    setSearch('')
    // Load users
    userManagementService.listUsers().then((r) => {
      if (r.users) setUsers(r.users)
    })
    // Load current members
    if (team) {
      teamService.listMembers(team.id).then((ids) => setSelectedMembers(new Set(ids)))
    } else {
      setSelectedMembers(new Set())
    }
  }, [open, team])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.email?.toLowerCase().includes(q))
  }, [users, search])

  const toggleMember = (userId: string, checked: boolean) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev)
      if (checked) next.add(userId)
      else next.delete(userId)
      return next
    })
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      let teamId = team?.id
      if (team) {
        const r = await teamService.update(team.id, { name, description, permissions })
        if (!r.success) throw new Error(r.error)
      } else {
        const r = await teamService.create({ name, description, permissions })
        if (!r.success || !r.team) throw new Error(r.error || 'Falha ao criar time')
        teamId = r.team.id
      }
      if (teamId) {
        const m = await teamService.setMembers(teamId, Array.from(selectedMembers))
        if (!m.success) throw new Error(m.error)
      }
      toast({ title: team ? 'Time atualizado' : 'Time criado' })
      onSaved()
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{team ? 'Editar Time' : 'Novo Time'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
            <TabsTrigger value="members">Membros ({selectedMembers.size})</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pt-4">
            <TabsContent value="info" className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do time</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Homologação" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
            </TabsContent>

            <TabsContent value="permissions">
              <PermissionMatrix permissions={permissions} onChange={setPermissions} />
            </TabsContent>

            <TabsContent value="members" className="space-y-3">
              <Input
                placeholder="Buscar por e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <ScrollArea className="h-[400px] border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredUsers.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedMembers.has(u.id)}
                        onCheckedChange={(c) => toggleMember(u.id, c as boolean)}
                      />
                      <span className="text-sm">{u.email}</span>
                    </label>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">Nenhum usuário encontrado</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
