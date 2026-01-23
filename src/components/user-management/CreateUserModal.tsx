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
import { Wand2, AlertCircle } from 'lucide-react'
import { userManagementService } from '@/services/userManagementService'
import { accessProfileService, AccessProfile } from '@/services/accessProfileService'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Link } from 'react-router-dom'

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated: () => void
}

export const CreateUserModal = ({ open, onOpenChange, onUserCreated }: CreateUserModalProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [profiles, setProfiles] = useState<AccessProfile[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Fetch profiles when modal opens
  useEffect(() => {
    if (open) {
      setIsLoadingProfiles(true)
      accessProfileService.listProfiles()
        .then(data => setProfiles(data))
        .catch(console.error)
        .finally(() => setIsLoadingProfiles(false))
    }
  }, [open])

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

    if (!selectedProfileId) {
      toast({
        title: 'Perfil obrigatório',
        description: 'Por favor, selecione um perfil de acesso',
        variant: 'destructive'
      })
      return
    }

    const selectedProfile = profiles.find(p => p.id === selectedProfileId)
    if (!selectedProfile) {
      toast({
        title: 'Erro',
        description: 'Perfil selecionado não encontrado',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await userManagementService.createUser({
        email, 
        password, 
        baseRole: selectedProfile.base_role, 
        permissions: selectedProfile.permissions,
        accessProfileId: selectedProfileId
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
        setSelectedProfileId('')
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha os dados e selecione o perfil de acesso do novo usuário.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
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

          {/* Profile Selection */}
          <div className="space-y-2">
            <Label htmlFor="profile">Perfil de Acesso *</Label>
            {isLoadingProfiles ? (
              <div className="text-sm text-muted-foreground">Carregando perfis...</div>
            ) : profiles.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum perfil de acesso cadastrado.{' '}
                  <Link to="/access-profiles" className="underline font-medium" onClick={() => onOpenChange(false)}>
                    Crie um perfil primeiro
                  </Link>
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedProfileId && (
              <p className="text-xs text-muted-foreground">
                {profiles.find(p => p.id === selectedProfileId)?.description || 
                  'As permissões serão definidas pelo perfil selecionado.'}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || profiles.length === 0}>
              {isLoading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
