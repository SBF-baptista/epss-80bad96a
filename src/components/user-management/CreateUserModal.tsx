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
import { AlertCircle, Send } from 'lucide-react'
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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [profiles, setProfiles] = useState<AccessProfile[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setIsLoadingProfiles(true)
      accessProfileService.listProfiles()
        .then(data => setProfiles(data))
        .catch(console.error)
        .finally(() => setIsLoadingProfiles(false))
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, preencha o e-mail',
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
        name: name || undefined,
        baseRole: selectedProfile.base_role, 
        permissions: selectedProfile.permissions,
        accessProfileId: selectedProfileId,
        redirectTo: `${window.location.origin}/ativar`
      })

      if (response.success) {
        toast({
          title: 'Convite enviado',
          description: 'O usuário receberá um e-mail com link para definir sua senha.'
        })
        onUserCreated()
        onOpenChange(false)
        setEmail('')
        setName('')
        setSelectedProfileId('')
      } else {
        toast({
          title: 'Erro',
          description: response.error || 'Falha ao convidar usuário',
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
          <DialogTitle>Convidar Novo Usuário</DialogTitle>
          <DialogDescription>
            O usuário receberá um e-mail com link para definir sua própria senha.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>

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

          <Alert>
            <Send className="h-4 w-4" />
            <AlertDescription>
              O usuário receberá um e-mail com link seguro para definir sua senha. O link expira em 24 horas.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || profiles.length === 0}>
              {isLoading ? 'Enviando convite...' : 'Enviar Convite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
