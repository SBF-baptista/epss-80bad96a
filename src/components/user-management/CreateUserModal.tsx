import { useState } from 'react'
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
import { userManagementService } from '@/services/userManagementService'

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated: () => void
}

export const CreateUserModal = ({ open, onOpenChange, onUserCreated }: CreateUserModalProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'gestor' | 'operador_kickoff' | 'operador_homologacao' | 'operador_agendamento' | 'operador_suprimentos'>('operador_homologacao')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const generatePassword = () => {
    // Generate a cryptographically secure random password
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const password = Array.from(array, byte => byte.toString(36).padStart(2, '0')).join('').slice(0, 12);
    setPassword(password);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password || !role) {
      toast({
        title: 'Erro',
        description: 'Todos os campos são obrigatórios',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await userManagementService.createUser({
        email,
        password,
        role
      })

      if (response.success) {
        toast({
          title: 'Sucesso',
          description: response.message || 'Usuário criado com sucesso'
        })
        setEmail('')
        setPassword('')
        setRole('operador_homologacao')
        onOpenChange(false)
        onUserCreated()
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo usuário no sistema.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@exemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha temporária"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
                className="px-3"
              >
                Gerar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="operador_kickoff">Operador de Kickoff</SelectItem>
                <SelectItem value="operador_homologacao">Operador de Homologação</SelectItem>
                <SelectItem value="operador_agendamento">Operador de Agendamento</SelectItem>
                <SelectItem value="operador_suprimentos">Operador de Suprimentos</SelectItem>
              </SelectContent>
            </Select>
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