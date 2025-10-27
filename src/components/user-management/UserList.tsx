import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Key, UserCog } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { userManagementService, type User } from '@/services/userManagementService'
import { EditUserModal } from './EditUserModal'
import { getRoleLabel, getRoleBadgeVariant } from '@/services/permissionsService'

interface UserListProps {
  users: User[]
  onUserUpdated: () => void
}

export const UserList = ({ users, onUserUpdated }: UserListProps) => {
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState<string | null>(null)
  const { toast } = useToast()

  const handleResetPassword = async (userId: string) => {
    setIsResettingPassword(userId)
    
    try {
      const response = await userManagementService.resetUserPassword(userId)
      
      if (response.success) {
        toast({
          title: 'Senha resetada',
          description: `Nova senha temporária: ${response.temporaryPassword}`,
          duration: 10000
        })
      } else {
        toast({
          title: 'Erro',
          description: response.error || 'Falha ao resetar senha',
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
      setIsResettingPassword(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Funções</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <Badge key={role} variant={getRoleBadgeVariant(role as any) as any}>
                          {getRoleLabel(role as any)}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">Sem função</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatDate(user.created_at)}</TableCell>
                <TableCell>
                  {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Nunca'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setEditingUser(user)}>
                        <UserCog className="mr-2 h-4 w-4" />
                        Editar usuário
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleResetPassword(user.id)}
                        disabled={isResettingPassword === user.id}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        {isResettingPassword === user.id ? 'Resetando...' : 'Resetar senha'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onUserUpdated={() => {
            onUserUpdated()
            setEditingUser(null)
          }}
        />
      )}
    </>
  )
}