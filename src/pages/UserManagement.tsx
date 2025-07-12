import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Layout } from '@/components/Layout'
import { userManagementService, type User } from '@/services/userManagementService'
import { CreateUserModal } from '@/components/user-management/CreateUserModal'
import { UserList } from '@/components/user-management/UserList'

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { toast } = useToast()

  const fetchUsers = async () => {
    try {
      const response = await userManagementService.listUsers()
      
      if (response.success && response.users) {
        setUsers(response.users)
      } else {
        toast({
          title: 'Erro',
          description: response.error || 'Falha ao carregar usuários',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro inesperado ao carregar usuários',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchUsers()
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Carregando usuários...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie usuários e suas permissões no sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
            <CardDescription>
              Lista de todos os usuários cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length > 0 ? (
              <UserList users={users} onUserUpdated={fetchUsers} />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        <CreateUserModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onUserCreated={fetchUsers}
        />
      </div>
    </Layout>
  )
}

export default UserManagement