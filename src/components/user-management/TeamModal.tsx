import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PermissionMatrix } from './PermissionMatrix'
import { AppModule, PermissionLevel, ALL_MODULES } from '@/types/permissions'
import { teamService, Team } from '@/services/teamService'
import { userManagementService, User } from '@/services/userManagementService'
import { useToast } from '@/hooks/use-toast'
import { Info, ShieldCheck, Users, Search, UserPlus, X, Sparkles } from 'lucide-react'

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

const getInitials = (email: string) => {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/).filter(Boolean)
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')
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
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    if (!open) return
    setName(team?.name || '')
    setDescription(team?.description || '')
    setPermissions({ ...emptyPerms(), ...(team?.permissions || {}) })
    setSearch('')
    setActiveTab('info')
    userManagementService.listUsers().then((r) => {
      if (r.users) setUsers(r.users)
    })
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

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedMembers.has(u.id)),
    [users, selectedMembers]
  )

  const activePermissionsCount = useMemo(
    () => Object.values(permissions).filter((p) => p !== 'none').length,
    [permissions]
  )

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
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Cabeçalho com gradiente */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-5 border-b">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {team ? 'Editar Time' : 'Novo Time'}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                  Configure o nome, permissões de acesso e os membros deste time.
                </DialogDescription>
              </div>
            </div>

            {/* Barra de resumo */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge variant="secondary" className="gap-1.5">
                <Users className="h-3 w-3" /> {selectedMembers.size} {selectedMembers.size === 1 ? 'membro' : 'membros'}
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <ShieldCheck className="h-3 w-3" /> {activePermissionsCount} {activePermissionsCount === 1 ? 'permissão ativa' : 'permissões ativas'}
              </Badge>
              {name && (
                <Badge variant="outline" className="gap-1.5">
                  {name}
                </Badge>
              )}
            </div>
          </DialogHeader>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 pt-4 border-b bg-muted/30">
            <TabsList className="h-11 bg-transparent p-0 gap-1 w-full justify-start rounded-none">
              <TabsTrigger
                value="info"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md gap-2 px-4 h-9"
              >
                <Info className="h-4 w-4" />
                Informações
              </TabsTrigger>
              <TabsTrigger
                value="permissions"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md gap-2 px-4 h-9"
              >
                <ShieldCheck className="h-4 w-4" />
                Permissões
                {activePermissionsCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{activePermissionsCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md gap-2 px-4 h-9"
              >
                <Users className="h-4 w-4" />
                Membros
                {selectedMembers.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{selectedMembers.size}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="info" className="m-0 p-6 space-y-6 focus-visible:outline-none">
              <div className="grid gap-6 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="team-name" className="text-sm font-medium">
                    Nome do time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="team-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Homologação, Operações, Comercial..."
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Escolha um nome curto que identifique claramente a área ou função do time.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-desc" className="text-sm font-medium">
                    Descrição
                  </Label>
                  <Textarea
                    id="team-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Descreva a responsabilidade deste time (opcional)"
                    className="resize-none"
                  />
                </div>

                <div className="rounded-lg border bg-muted/40 p-4 flex gap-3">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Como funcionam os times</p>
                    <p>Cada usuário pode pertencer a apenas um time. As permissões definidas aqui são aplicadas a todos os membros, somando-se às permissões individuais e de perfil.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="m-0 p-6 focus-visible:outline-none">
              <div className="mb-4 flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-0.5">Permissões por módulo</p>
                  <p>Defina o nível de acesso deste time em cada área do sistema. O nível mais permissivo entre time, perfil e usuário prevalece.</p>
                </div>
              </div>
              <PermissionMatrix permissions={permissions} onChange={setPermissions} />
            </TabsContent>

            <TabsContent value="members" className="m-0 p-6 space-y-4 focus-visible:outline-none">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por e-mail..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserPlus className="h-4 w-4" />
                  <span>
                    <span className="font-semibold text-foreground">{selectedMembers.size}</span> de {users.length} selecionados
                  </span>
                </div>
              </div>

              {selectedUsers.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Selecionados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUsers.map((u) => (
                      <Badge key={u.id} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                        <span className="text-xs">{u.email}</span>
                        <button
                          onClick={() => toggleMember(u.id, false)}
                          className="hover:bg-background rounded p-0.5 transition-colors"
                          aria-label="Remover"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <ScrollArea className="h-[380px] border rounded-lg">
                <div className="p-2">
                  {filteredUsers.map((u) => {
                    const checked = selectedMembers.has(u.id)
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors ${
                          checked ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted'
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => toggleMember(u.id, c as boolean)}
                        />
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-semibold uppercase text-primary ring-1 ring-primary/10">
                          {getInitials(u.email || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{u.email}</p>
                        </div>
                        {checked && (
                          <Badge variant="secondary" className="text-[10px]">no time</Badge>
                        )}
                      </label>
                    )
                  })}
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-16 space-y-2">
                      <Users className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                      <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <Separator />
        <DialogFooter className="px-6 py-4 bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
            {saving ? 'Salvando...' : team ? 'Salvar alterações' : 'Criar time'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
