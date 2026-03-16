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
import { AlertCircle, Plus, Check, Mail } from 'lucide-react'
import { userManagementService } from '@/services/userManagementService'
import { accessProfileService, AccessProfile } from '@/services/accessProfileService'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AccessProfileModal } from '@/components/access-profiles/AccessProfileModal'

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
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const { toast } = useToast()

  const loadProfiles = () => {
    setIsLoadingProfiles(true)
    accessProfileService.listProfiles()
      .then(data => setProfiles(data))
      .catch(console.error)
      .finally(() => setIsLoadingProfiles(false))
  }

  useEffect(() => {
    if (open) {
      loadProfiles()
      setInviteSent(false)
    }
  }, [open])

  const handleProfileCreated = () => {
    loadProfiles()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast({ title: 'Campo obrigatório', description: 'Por favor, preencha o e-mail', variant: 'destructive' })
      return
    }

    if (!selectedProfileId) {
      toast({ title: 'Perfil obrigatório', description: 'Por favor, selecione um perfil de acesso', variant: 'destructive' })
      return
    }

    const selectedProfile = profiles.find(p => p.id === selectedProfileId)
    if (!selectedProfile) {
      toast({ title: 'Erro', description: 'Perfil selecionado não encontrado', variant: 'destructive' })
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
      })

      if (response.success) {
        setInviteSent(true)
        toast({
          title: 'Usuário criado',
          description: 'Um e-mail de ativação foi enviado para o usuário.'
        })
        onUserCreated()
      } else {
        toast({ title: 'Erro', description: response.error || 'Falha ao criar usuário', variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro inesperado', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setEmail('')
    setName('')
    setSelectedProfileId('')
    setInviteSent(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário para acessar o sistema. Um e-mail será enviado para que ele defina sua própria senha.
            </DialogDescription>
          </DialogHeader>
          
          {inviteSent ? (
            <div className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Usuário criado com sucesso! Um e-mail de ativação foi enviado para <strong>{email}</strong>. O usuário deverá clicar no link recebido para definir sua senha e acessar o sistema.
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button onClick={handleClose}>Fechar</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do usuário" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile">Perfil de Acesso *</Label>
                {isLoadingProfiles ? (
                  <div className="text-sm text-muted-foreground">Carregando perfis...</div>
                ) : profiles.length === 0 ? (
                  <div className="space-y-2">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhum perfil de acesso cadastrado. Crie um perfil primeiro.
                      </AlertDescription>
                    </Alert>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowProfileModal(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Criar Perfil
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                      <SelectTrigger className="flex-1">
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
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowProfileModal(true)} title="Criar novo perfil">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {selectedProfileId && (
                  <p className="text-xs text-muted-foreground">
                    {profiles.find(p => p.id === selectedProfileId)?.description || 
                      'As permissões serão definidas pelo perfil selecionado.'}
                  </p>
                )}
              </div>

              <Alert className="bg-muted/50">
                <Mail className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  O usuário receberá um e-mail com um link para definir sua própria senha no primeiro acesso.
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={isLoading || profiles.length === 0}>
                  {isLoading ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AccessProfileModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        profile={null}
        onSaved={handleProfileCreated}
      />
    </>
  )
}