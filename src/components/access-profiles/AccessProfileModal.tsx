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
import { 
  AppModule, 
  PermissionLevel, 
  ALL_MODULES
} from '@/types/permissions'

const getEmptyPermissions = (): Record<AppModule, PermissionLevel> => {
  const permissions = {} as Record<AppModule, PermissionLevel>;
  ALL_MODULES.forEach(m => { permissions[m.key] = 'none'; });
  return permissions;
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
  const { toast } = useToast()

  const hasAnyPermission = Object.values(permissions).some(p => p !== 'none')

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (profile) {
        setName(profile.name)
        setDescription(profile.description || '')
        setPermissions(profile.permissions)
      } else {
        setName('')
        setDescription('')
        setPermissions(getEmptyPermissions())
      }
    }
  }, [open, profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, informe o nome do perfil',
        variant: 'destructive'
      })
      return
    }

    if (!hasAnyPermission) {
      setShowNoPermissionsAlert(true)
      return
    }

    await saveProfile()
  }

  const saveProfile = async () => {
    setIsLoading(true)
    
    try {
      let result
      
      if (isEditing) {
        result = await accessProfileService.updateProfile(profile.id, {
          name,
          description: description || undefined,
          base_role: 'operador',
          permissions
        })
      } else {
        result = await accessProfileService.createProfile({
          name,
          description: description || undefined,
          base_role: 'operador',
          permissions
        })
      }

      if (result.success) {
        toast({
          title: 'Sucesso',
          description: isEditing ? 'Perfil atualizado com sucesso' : 'Perfil criado com sucesso'
        })
        onSaved()
        onOpenChange(false)
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao salvar perfil',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro inesperado',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Perfil' : 'Novo Perfil de Acesso'}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Edite as configurações do perfil de acesso.'
                : 'Crie um novo perfil de acesso. Selecione manualmente as permissões desejadas — nenhuma vem ativa por padrão.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="space-y-2">
              <Label>Permissões por Módulo</Label>
              <p className="text-xs text-muted-foreground">
                Selecione manualmente as permissões desejadas para este perfil. Nenhuma permissão é concedida automaticamente.
              </p>
              <PermissionMatrix 
                permissions={permissions} 
                onChange={setPermissions}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Perfil')}
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
              Este perfil será {isEditing ? 'salvo' : 'criado'} sem nenhuma permissão de acesso. Usuários vinculados a ele não terão acesso a nenhum módulo. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowNoPermissionsAlert(false); saveProfile(); }}>
              Continuar sem permissões
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
