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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { accessProfileService, AccessProfile } from '@/services/accessProfileService'
import { PermissionMatrix } from '@/components/user-management/PermissionMatrix'
import { 
  AppModule, 
  PermissionLevel, 
  getDefaultPermissionsForRole 
} from '@/types/permissions'

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
    getDefaultPermissionsForRole('operador')
  )
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

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
        setPermissions(getDefaultPermissionsForRole('operador'))
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Perfil' : 'Novo Perfil de Acesso'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Edite as configurações do perfil de acesso.'
              : 'Crie um novo perfil de acesso com as permissões desejadas.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
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

          {/* Permission Matrix */}
          <div className="space-y-2">
            <Label>Permissões por Módulo</Label>
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
  )
}
