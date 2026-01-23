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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { accessProfileService, AccessProfile } from '@/services/accessProfileService'
import { PermissionMatrix } from '@/components/user-management/PermissionMatrix'
import { 
  AppModule, 
  PermissionLevel, 
  BASE_ROLE_LABELS,
  getDefaultPermissionsForRole 
} from '@/types/permissions'

type BaseRole = 'admin' | 'gestor' | 'operador' | 'visualizador'

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
  const [baseRole, setBaseRole] = useState<BaseRole>('visualizador')
  const [permissions, setPermissions] = useState<Record<AppModule, PermissionLevel>>(() => 
    getDefaultPermissionsForRole('visualizador')
  )
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (profile) {
        setName(profile.name)
        setDescription(profile.description || '')
        setBaseRole(profile.base_role)
        setPermissions(profile.permissions)
      } else {
        setName('')
        setDescription('')
        setBaseRole('visualizador')
        setPermissions(getDefaultPermissionsForRole('visualizador'))
      }
    }
  }, [open, profile])

  // Update permissions when base role changes (only for new profiles)
  const handleRoleChange = (newRole: BaseRole) => {
    setBaseRole(newRole)
    if (!isEditing) {
      setPermissions(getDefaultPermissionsForRole(newRole))
    }
  }

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
          base_role: baseRole,
          permissions
        })
      } else {
        result = await accessProfileService.createProfile({
          name,
          description: description || undefined,
          base_role: baseRole,
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
              <Label htmlFor="baseRole">Função Base</Label>
              <Select value={baseRole} onValueChange={(value: BaseRole) => handleRoleChange(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BASE_ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          {/* Permission Matrix */}
          <div className="space-y-2">
            <Label>Permissões por Módulo</Label>
            <PermissionMatrix 
              permissions={permissions} 
              onChange={setPermissions}
              disabled={baseRole === 'admin'}
            />
            {baseRole === 'admin' && (
              <p className="text-xs text-muted-foreground">
                Perfis de Administrador têm acesso total a todos os módulos.
              </p>
            )}
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
