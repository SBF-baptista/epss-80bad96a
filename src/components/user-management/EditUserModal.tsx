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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { modulePermissionsService } from '@/services/modulePermissionsService'
import { PermissionMatrix } from './PermissionMatrix'
import { 
  AppModule, 
  BaseRole, 
  PermissionLevel, 
  BASE_ROLE_LABELS,
  getDefaultPermissionsForRole 
} from '@/types/permissions'

interface User {
  id: string
  email: string
  roles: string[]
  permissions?: { module: string; permission: string }[]
}

interface EditUserModalProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated: () => void
}

const PROTECTED_ADMIN_EMAIL = 'pedro.albuquerque@segsat.com'

export const EditUserModal = ({ user, open, onOpenChange, onUserUpdated }: EditUserModalProps) => {
  const isProtectedAdmin = user.email === PROTECTED_ADMIN_EMAIL
  
  const getInitialRole = (): BaseRole => {
    const currentRole = user.roles[0]
    if (currentRole === 'admin') return 'admin'
    if (currentRole === 'gestor') return 'gestor'
    if (currentRole === 'operador' || currentRole?.startsWith('operador_')) return 'operador'
    return 'visualizador'
  }

  const getInitialPermissions = (): Record<AppModule, PermissionLevel> => {
    const defaultPerms = getDefaultPermissionsForRole(getInitialRole())
    
    // Override with existing permissions
    if (user.permissions && user.permissions.length > 0) {
      user.permissions.forEach(p => {
        const module = p.module as AppModule
        const level = p.permission as PermissionLevel
        if (module && level) {
          defaultPerms[module] = level
        }
      })
    }
    
    return defaultPerms
  }

  const [baseRole, setBaseRole] = useState<BaseRole>(getInitialRole())
  const [permissions, setPermissions] = useState<Record<AppModule, PermissionLevel>>(getInitialPermissions())
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Update permissions when base role changes (unless editing existing)
  const handleRoleChange = (newRole: BaseRole) => {
    setBaseRole(newRole)
    setPermissions(getDefaultPermissionsForRole(newRole))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isProtectedAdmin && baseRole !== 'admin') {
      toast({
        title: 'Operação não permitida',
        description: 'Este usuário deve permanecer como administrador',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await modulePermissionsService.updateUserPermissions(
        user.id, 
        baseRole, 
        permissions
      )

      if (response.success) {
        toast({
          title: 'Sucesso',
          description: response.message || 'Permissões atualizadas com sucesso'
        })
        onUserUpdated()
        onOpenChange(false)
      } else {
        toast({
          title: 'Erro',
          description: response.error || 'Falha ao atualizar permissões',
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
          <DialogTitle>Editar Permissões</DialogTitle>
          <DialogDescription>
            Configure as permissões do usuário {user.email}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email (readonly) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
              {user.email}
            </div>
          </div>

          {/* Base Role */}
          <div className="space-y-2">
            <Label htmlFor="baseRole">Função Base</Label>
            <Select 
              value={baseRole} 
              onValueChange={(value: BaseRole) => handleRoleChange(value)}
              disabled={isProtectedAdmin}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BASE_ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isProtectedAdmin && (
              <p className="text-xs text-amber-600">
                Este usuário é protegido e deve permanecer como administrador.
              </p>
            )}
          </div>

          {/* Permission Matrix */}
          <div className="space-y-2">
            <Label>Permissões por Módulo</Label>
            <PermissionMatrix 
              permissions={permissions} 
              onChange={setPermissions}
              disabled={baseRole === 'admin' || isProtectedAdmin}
            />
            {baseRole === 'admin' && (
              <p className="text-xs text-muted-foreground">
                Administradores têm acesso total a todos os módulos.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || isProtectedAdmin}>
              {isLoading ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
