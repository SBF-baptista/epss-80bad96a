import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, RefreshCw, Plus, Pencil, Trash2, Shield, Eye, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Layout } from '@/components/Layout'
import { userManagementService, type User } from '@/services/userManagementService'
import { accessProfileService, AccessProfile } from '@/services/accessProfileService'
import { CreateUserModal } from '@/components/user-management/CreateUserModal'
import { UserList } from '@/components/user-management/UserList'
import { UserManagementStats } from '@/components/user-management/UserManagementStats'
import { UserFilters, type UserFilterState } from '@/components/user-management/UserFilters'
import { AccessProfileModal } from '@/components/access-profiles/AccessProfileModal'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BASE_ROLE_LABELS, MODULE_GROUPS, AppModule, PermissionLevel } from '@/types/permissions'
import { useUserRole, UserRole } from '@/hooks/useUserRole'
import { ModulePermission } from '@/types/permissions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const mapRawRole = (rawRole: string): UserRole => {
  if (rawRole === 'admin') return 'admin'
  if (rawRole === 'gestor') return 'gestor'
  if (rawRole === 'operador' || rawRole?.startsWith('operador_')) return 'operador'
  if (rawRole === 'visualizador') return 'visualizador'
  return null
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filters, setFilters] = useState<UserFilterState>({ search: '', status: 'all', role: 'all' })
  
  const [profiles, setProfiles] = useState<AccessProfile[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true)
  const [isRefreshingProfiles, setIsRefreshingProfiles] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null)
  const [deletingProfile, setDeletingProfile] = useState<AccessProfile | null>(null)
  
  const { toast } = useToast()
  const { canEditModule, realRole, isImpersonating, startImpersonation, stopImpersonation } = useUserRole()
  const isRealAdmin = realRole === 'admin' || (!isImpersonating && canEditModule('users'))
  const canEditUsers = isRealAdmin || canEditModule('users')

  const fetchUsers = async () => {
    try {
      const response = await userManagementService.listUsers()
      if (response && response.users) {
        setUsers(response.users)
      } else if (response && response.success === false) {
        toast({ title: 'Erro', description: response.error || 'Falha ao carregar usuários', variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro inesperado', variant: 'destructive' })
    } finally {
      setIsLoadingUsers(false)
      setIsRefreshingUsers(false)
    }
  }

  const fetchProfiles = async () => {
    try {
      const data = await accessProfileService.listProfiles()
      setProfiles(data)
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Falha ao carregar perfis', variant: 'destructive' })
    } finally {
      setIsLoadingProfiles(false)
      setIsRefreshingProfiles(false)
    }
  }

  const handleRefreshUsers = () => { setIsRefreshingUsers(true); fetchUsers() }
  const handleRefreshProfiles = () => { setIsRefreshingProfiles(true); fetchProfiles() }

  const handleDeleteProfile = async () => {
    if (!deletingProfile) return
    const result = await accessProfileService.deleteProfile(deletingProfile.id)
    if (result.success) {
      toast({ title: 'Sucesso', description: 'Perfil excluído com sucesso' })
      fetchProfiles()
    } else {
      toast({ title: 'Erro', description: result.error || 'Falha ao excluir perfil', variant: 'destructive' })
    }
    setDeletingProfile(null)
  }

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'gestor': return 'default'
      case 'operador': return 'secondary'
      default: return 'outline'
    }
  }

  const countPermissions = (permissions: Record<AppModule, PermissionLevel>) => {
    return Object.values(permissions).filter(p => p !== 'none').length
  }

  useEffect(() => {
    fetchUsers()
    fetchProfiles()
  }, [])

  const isLoading = isLoadingUsers || isLoadingProfiles

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie usuários, perfis de acesso e segurança do sistema
            </p>
          </div>
        </div>

        {/* Admin Profile Simulation */}
        {isRealAdmin && (
          <Card className={`border-2 ${isImpersonating ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 'border-dashed border-muted-foreground/30'}`}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span>Simular perfil:</span>
                </div>
                <Select
                  value={isImpersonating ? 'impersonating' : ''}
                  onValueChange={(profileId) => {
                    const profile = profiles.find(p => p.id === profileId)
                    if (profile) {
                      const simulatedRole = mapRawRole(profile.base_role)
                      const simulatedPerms: ModulePermission[] = Object.entries(profile.permissions || {})
                        .filter(([, perm]) => typeof perm === 'string' && perm !== 'none')
                        .map(([mod, perm]) => ({
                          user_id: '',
                          module: mod as AppModule,
                          permission: perm as PermissionLevel,
                        }))
                      startImpersonation(simulatedRole, simulatedPerms)
                      toast({
                        title: 'Simulação ativada',
                        description: `Visualizando como: ${profile.name}`,
                      })
                    }
                  }}
                >
                  <SelectTrigger className="w-[240px] h-9">
                    <SelectValue placeholder="Selecionar perfil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name} ({BASE_ROLE_LABELS[profile.base_role]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isImpersonating && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      stopImpersonation()
                      toast({ title: 'Simulação desativada', description: 'Permissões de administrador restauradas' })
                    }}
                    className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Resetar
                  </Button>
                )}
                {isImpersonating && (
                  <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                    Modo simulação ativo
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Stats */}
        <UserManagementStats users={users} />

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="profiles">Perfis de Acesso</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 space-y-4">
            {/* Filters + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <UserFilters filters={filters} onChange={setFilters} />
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshUsers}
                  disabled={isRefreshingUsers}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingUsers ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                {canEditUsers && (
                  <Button size="sm" onClick={() => setShowCreateModal(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Usuário
                  </Button>
                )}
              </div>
            </div>

            {/* User List */}
            {users.length > 0 ? (
              <UserList users={users} onUserUpdated={fetchUsers} filters={filters} />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="profiles" className="mt-4">
            <div className="flex justify-end gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshProfiles}
                disabled={isRefreshingProfiles}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingProfiles ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              {canEditUsers && (
                <Button size="sm" onClick={() => { setEditingProfile(null); setShowProfileModal(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Perfil
                </Button>
              )}
            </div>

            {profiles.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum perfil cadastrado</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Crie perfis de acesso para definir as permissões que serão atribuídas aos usuários.
                  </p>
                  {canEditUsers && (
                    <Button onClick={() => setShowProfileModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Perfil
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map((profile) => (
                  <Card key={profile.id} className="group hover:shadow-md transition-shadow border-none shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{profile.name}</CardTitle>
                          {profile.description && (
                            <CardDescription className="mt-1">{profile.description}</CardDescription>
                          )}
                        </div>
                        <Badge variant={getRoleBadgeVariant(profile.base_role)}>
                          {BASE_ROLE_LABELS[profile.base_role]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          {countPermissions(profile.permissions)} módulos com permissão
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(profile.permissions)
                            .filter(([_, level]) => level !== 'none')
                            .slice(0, 4)
                            .map(([module, level]) => {
                              const moduleConfig = Object.values(MODULE_GROUPS)
                                .flatMap(g => g.modules)
                                .find(m => m.key === module)
                              return (
                                <Badge key={module} variant="outline" className="text-xs">
                                  {moduleConfig?.label || module}
                                </Badge>
                              )
                            })}
                          {Object.entries(profile.permissions).filter(([_, l]) => l !== 'none').length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{Object.entries(profile.permissions).filter(([_, l]) => l !== 'none').length - 4}
                            </Badge>
                          )}
                        </div>

                        {canEditUsers && (
                          <div className="flex gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => { setEditingProfile(profile); setShowProfileModal(true) }}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingProfile(profile)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <CreateUserModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onUserCreated={fetchUsers}
        />

        <AccessProfileModal
          open={showProfileModal}
          onOpenChange={setShowProfileModal}
          profile={editingProfile}
          onSaved={fetchProfiles}
        />

        <AlertDialog open={!!deletingProfile} onOpenChange={() => setDeletingProfile(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Perfil</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o perfil "{deletingProfile?.name}"? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  )
}

export default UserManagement
