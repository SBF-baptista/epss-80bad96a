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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Wand2 } from 'lucide-react'
import { userManagementService } from '@/services/userManagementService'
import { PermissionMatrix } from './PermissionMatrix'
import { 
  AppModule, 
  PermissionLevel, 
  BASE_ROLE_LABELS,
  getDefaultPermissionsForRole 
} from '@/types/permissions'

type BaseRole = 'admin' | 'gestor' | 'operador' | 'visualizador'

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated: () => void
}

export const CreateUserModal = ({ open, onOpenChange, onUserCreated }: CreateUserModalProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [baseRole, setBaseRole] = useState<BaseRole>('visualizador')
  const [permissions, setPermissions] = useState<Record<AppModule, PermissionLevel>>(() => 
    getDefaultPermissionsForRole('visualizador')
  )
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Update permissions when base role changes
  useEffect(() => {
    setPermissions(getDefaultPermissionsForRole(baseRole))
  }, [baseRole])

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
    let result = ''
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(result)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha email e senha',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await userManagementService.createUser({
        email, 
        password, 
        baseRole, 
        permissions
      })

      if (response.success) {
        toast({
          title: 'Sucesso',
          description: 'Usuário criado com sucesso'
        })
        onUserCreated()
        onOpenChange(false)
        // Reset form
        setEmail('')
        setPassword('')
        setBaseRole('visualizador')
        setPermissions(getDefaultPermissionsForRole('visualizador'))
      } else {
        toast({
          title: 'Erro',
          description: response.error || 'Falha ao criar usuário',
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
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha os dados e configure as permissões do novo usuário.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha temporária"
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={generatePassword}>
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Base Role */}
          <div className="space-y-2">
            <Label htmlFor="baseRole">Função Base</Label>
            <Select value={baseRole} onValueChange={(value: BaseRole) => setBaseRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BASE_ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A função base define as permissões padrão. Você pode personalizar abaixo.
            </p>
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
                Administradores têm acesso total a todos os módulos.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
