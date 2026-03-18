import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { accessProfileService, type AccessProfile } from '@/services/accessProfileService'
import { Shield } from 'lucide-react'

interface EditAccessProfileModalProps {
  user: { id: string; email: string; roles: string[] }
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated: () => void
}

export const EditAccessProfileModal = ({ user, open, onOpenChange, onUserUpdated }: EditAccessProfileModalProps) => {
  const [profiles, setProfiles] = useState<AccessProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, user.id])

  const loadData = async () => {
    setIsFetching(true)
    try {
      const [profilesList, userRole] = await Promise.all([
        accessProfileService.listProfiles(),
        supabase
          .from('user_roles')
          .select('access_profile_id')
          .eq('user_id', user.id)
          .maybeSingle()
      ])

      setProfiles(profilesList)
      const profileId = userRole.data?.access_profile_id || ''
      setCurrentProfileId(profileId)
      setSelectedProfileId(profileId)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsFetching(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const selectedProfile = profiles.find(p => p.id === selectedProfileId)
      const permissions = selectedProfile?.permissions || {}
      const baseRole = selectedProfile?.base_role || 'visualizador'
      const profileValue = selectedProfileId || null

      // Single call to edge function - updates role, permissions, and profile atomically
      const response = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update-permissions',
          userId: user.id,
          baseRole,
          permissions,
          accessProfileId: profileValue
        }
      })

      if (response.error) {
        // Try to extract detailed error message
        let errorMsg = 'Falha ao sincronizar permissões'
        try {
          const errorData = typeof response.error === 'object' && response.error.message 
            ? response.error.message 
            : JSON.stringify(response.error)
          errorMsg = errorData
        } catch {}
        
        console.error('Error syncing permissions:', response.error)
        throw new Error(errorMsg)
      }

      // Check response data for errors
      if (response.data && !response.data.success) {
        throw new Error(response.data.error || 'Falha ao atualizar permissões')
      }

      // Also update the access_profile_id reference directly (backup)
      await supabase
        .from('user_roles')
        .update({ access_profile_id: profileValue })
        .eq('user_id', user.id)

      toast({
        title: 'Perfil atualizado',
        description: 'O perfil de acesso e as permissões do usuário foram atualizados com sucesso.'
      })
      onUserUpdated()
      onOpenChange(false)
    } catch (error: any) {
      console.error('EditAccessProfileModal error:', error)
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message || 'Falha ao atualizar perfil. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedProfile = profiles.find(p => p.id === selectedProfileId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Editar Perfil de Acesso
          </DialogTitle>
          <DialogDescription>
            Altere o perfil de acesso do usuário <strong>{user.email}</strong>
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Carregando perfis...</div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem perfil vinculado</SelectItem>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProfile && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <p className="text-sm font-medium">{selectedProfile.name}</p>
                {selectedProfile.description && (
                  <p className="text-xs text-muted-foreground">{selectedProfile.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {Object.values(selectedProfile.permissions).filter(p => p !== 'none').length} módulo(s) com permissão
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || isFetching || selectedProfileId === (currentProfileId || '')}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
