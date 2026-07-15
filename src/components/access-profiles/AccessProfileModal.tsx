import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { accessProfileService, AccessProfile } from '@/services/accessProfileService'
import { PermissionMatrix } from '@/components/user-management/PermissionMatrix'
import { AccessProfileHistoryModal } from '@/components/access-profiles/AccessProfileHistoryModal'
import { AppModule, PermissionLevel, ALL_MODULES } from '@/types/permissions'
import { supabase } from '@/integrations/supabase/client'
import { History, Users } from 'lucide-react'

const getEmptyPermissions = (): Record<AppModule, PermissionLevel> => {
  const permissions = {} as Record<AppModule, PermissionLevel>
  ALL_MODULES.forEach((m) => {
    permissions[m.key] = 'none'
  })
  return permissions
}

interface AccessProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: AccessProfile | null
  onSaved: () => void
}

export const AccessProfileModal = ({ open, onOpenChange, profile, onSaved }: AccessProfileModalProps) => {
  const isEditing = !!profile

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<Record<AppModule, PermissionLevel>>(() =>
    getEmptyPermissions()
  )
  const [isLoading, setIsLoading] = useState(false)
  const [showNoPermissionsAlert, setShowNoPermissionsAlert] = useState(false)
  const [showImpactConfirm, setShowImpactConfirm] = useState(false)
  const [linkedCount, setLinkedCount] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const { toast } = useToast()

  const hasAnyPermission = Object.values(permissions).some((p) => p !== 'none')

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (profile) {
        setName(profile.name)
        setDescription(profile.description || '')
        setPermissions(profile.permissions)
        // Load linked users count
        supabase
          .from('user_roles')
          .select('user_id', { count: 'exact', head: true })
          .eq('access_profile_id', profile.id)
          .then(({ count }) => setLinkedCount(count || 0))
      } else {
        setName('')
        setDescription('')
        setPermissions(getEmptyPermissions())
        setLinkedCount(0)
      }
    }
  }, [open, profile])

  const buildChanges = () => {
    if (!profile) return []
    const changes: { module: string; from: string; to: string }[] = []
    ALL_MODULES.forEach((m) => {
      const before = (profile.permissions[m.key] || 'none') as string
      const after = (permissions[m.key] || 'none') as string
      if (before !== after) {
        changes.push({ module: m.key, from: before, to: after })
      }
    })
    return changes
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, informe o nome do perfil',
        variant: 'destructive',
      })
      return
    }

    if (!hasAnyPermission) {
      setShowNoPermissionsAlert(true)
      return
    }

    // If editing and profile has linked users, ask for confirmation
    if (isEditing && linkedCount > 0) {
      setShowImpactConfirm(true)
      return
    }

    await saveProfile()
  }

  const saveProfile = async () => {
    setIsLoading(true)

    try {
      const changes = buildChanges()
      const nameChanged = profile ? profile.name !== name : false
      const descChanged = profile ? (profile.description || '') !== description : false

      let result

      if (isEditing) {
        result = await accessProfileService.updateProfile(profile.id, {
          name,
          description: description || undefined,
          base_role: 'operador',
          permissions,
        })
      } else {
        result = await accessProfileService.createProfile({
          name,
          description: description || undefined,
          base_role: 'operador',
          permissions,
        })
      }

      if (result.success) {
        // If editing, sync all linked users' permissions
        if (isEditing && profile) {
          try {
            const { data: linkedUsers } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('access_profile_id', profile.id)

            if (linkedUsers && linkedUsers.length > 0) {
              for (const { user_id } of linkedUsers) {
                await supabase.functions.invoke('manage-users', {
                  body: {
                    action: 'update-permissions',
                    userId: user_id,
                    baseRole: 'operador',
                    permissions,
                    accessProfileId: profile.id,
                  },
                })
              }
            }
          } catch (syncError) {
            console.error('[AccessProfile] Error syncing linked users:', syncError)
          }

          // Record history entry if anything changed
          if (changes.length > 0 || nameChanged || descChanged) {
            try {
              const { data: userData } = await supabase.auth.getUser()
              await supabase.from('access_profile_history').insert({
                profile_id: profile.id,
                changed_by: userData.user?.id,
                changed_by_email: userData.user?.email,
                changes,
                name_before: profile.name,
                name_after: name,
                description_before: profile.description,
                description_after: description,
              })
            } catch (histErr) {
              console.error('[AccessProfile] Error saving history:', histErr)
            }
          }
        }

        toast({
          title: 'Sucesso',
          description: isEditing ? 'Perfil atualizado com sucesso' : 'Perfil criado com sucesso',
        })
        onSaved()
        onOpenChange(false)
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao salvar perfil',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro inesperado',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setShowImpactConfirm(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[980px] max-h-[92vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader className="pr-8">
            <DialogTitle>{isEditing ? 'Editar Perfil' : 'Novo Perfil de Acesso'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Edite as configurações do perfil de acesso.'
                : 'Crie um novo perfil de acesso. Selecione manualmente as permissões desejadas — nenhuma vem ativa por padrão.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Perfil *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Operador de Campo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o propósito deste perfil..."
                  rows={2}
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex flex-col gap-2 rounded-md border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="break-words">
                    <strong>{linkedCount}</strong> {linkedCount === 1 ? 'usuário usa' : 'usuários usam'} este perfil
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setHistoryOpen(true)}
                  className="gap-1 text-xs sm:self-auto self-start"
                >
                  <History className="h-3.5 w-3.5" />
                  Ver histórico de alterações
                </Button>
              </div>
            )}

            <div className="space-y-2 min-w-0">
              <Label>Permissões por Módulo</Label>
              <PermissionMatrix permissions={permissions} onChange={setPermissions} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Perfil'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showNoPermissionsAlert} onOpenChange={setShowNoPermissionsAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Perfil sem permissões</AlertDialogTitle>
            <AlertDialogDescription>
              Este perfil será {isEditing ? 'salvo' : 'criado'} sem nenhuma permissão de acesso. Usuários
              vinculados a ele não terão acesso a nenhum módulo. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowNoPermissionsAlert(false)
                if (isEditing && linkedCount > 0) {
                  setShowImpactConfirm(true)
                } else {
                  saveProfile()
                }
              }}
            >
              Continuar sem permissões
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showImpactConfirm} onOpenChange={setShowImpactConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração</AlertDialogTitle>
            <AlertDialogDescription>
              Esta alteração afeta <strong>{linkedCount}</strong>{' '}
              {linkedCount === 1 ? 'usuário' : 'usuários'} imediatamente. Confirmar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={saveProfile} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isEditing && profile && (
        <AccessProfileHistoryModal
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          profileId={profile.id}
          profileName={profile.name}
        />
      )}
    </>
  )
}
