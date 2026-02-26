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
import {
  MoreHorizontal, Key, UserCog, Eye, Ban, Unlock,
  UserCheck, Clock, AlertTriangle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { userManagementService, type User } from '@/services/userManagementService'
import { EditUserModal } from './EditUserModal'
import { UserDetailDrawer } from './UserDetailDrawer'
import { getRoleLabel, getRoleBadgeVariant } from '@/services/permissionsService'
import { supabase } from '@/integrations/supabase/client'
import { type UserFilterState } from './UserFilters'

interface UserListProps {
  users: User[]
  onUserUpdated: () => void
  filters: UserFilterState
}

export const UserList = ({ users, onUserUpdated, filters }: UserListProps) => {
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState<string | null>(null)
  const { toast } = useToast()

  // Apply filters
  const filteredUsers = users.filter(user => {
    if (filters.search && !user.email?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.status !== 'all' && user.status !== filters.status) {
      return false
    }
    if (filters.role !== 'all') {
      if (filters.role === 'none') {
        if (user.roles.length > 0) return false
      } else {
        if (!user.roles.includes(filters.role)) return false
      }
    }
    return true
  })

  const handleResetPassword = async (userId: string) => {
    setIsResettingPassword(userId)
    try {
      const response = await userManagementService.resetUserPassword(userId)
      if (response.success) {
        toast({
          title: 'Senha resetada',
          description: `Nova senha temporária: ${response.temporaryPassword}`,
          duration: 15000
        })
      } else {
        toast({ title: 'Erro', description: response.error || 'Falha ao resetar senha', variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro inesperado', variant: 'destructive' })
    } finally {
      setIsResettingPassword(null)
    }
  }

  const handleBanToggle = async (user: User) => {
    const action = user.status === 'banned' ? 'unban-user' : 'ban-user'
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action, userId: user.id }
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error)
      toast({
        title: action === 'ban-user' ? 'Usuário bloqueado' : 'Usuário desbloqueado',
      })
      onUserUpdated()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
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

  const getStatusBadge = (status: User['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border-[hsl(var(--success-border))] border hover:bg-[hsl(var(--success-light))]">
            <UserCheck className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        )
      case 'banned':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/30 border hover:bg-destructive/10">
            <Ban className="h-3 w-3 mr-1" />
            Bloqueado
          </Badge>
        )
      case 'inactive':
        return (
          <Badge className="bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))] border-[hsl(var(--warning-border))] border hover:bg-[hsl(var(--warning-light))]">
            <Clock className="h-3 w-3 mr-1" />
            Inativo
          </Badge>
        )
    }
  }

  const getRiskIndicator = (user: User) => {
    const risks: string[] = []
    if (user.status === 'banned') risks.push('Bloqueado')
    if (!user.last_sign_in_at) risks.push('Nunca acessou')
    else {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      if (new Date(user.last_sign_in_at) < thirtyDaysAgo) risks.push('Sem acesso recente')
    }
    if (!user.email_confirmed_at) risks.push('Email não confirmado')

    if (risks.length === 0) return null
    return (
      <div className="flex items-center gap-1" title={risks.join(', ')}>
        <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Perfil</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Criado em</TableHead>
              <TableHead className="font-semibold">Último acesso</TableHead>
              <TableHead className="font-semibold w-[50px]"></TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhum usuário encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setViewingUser(user)}
                >
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge key={role} variant={getRoleBadgeVariant(role as any) as any} className="text-xs">
                            {getRoleLabel(role as any)}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs opacity-60">Sem perfil</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Nunca'}
                  </TableCell>
                  <TableCell>{getRiskIndicator(user)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setViewingUser(user)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingUser(user)}>
                          <UserCog className="mr-2 h-4 w-4" />
                          Editar permissões
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleResetPassword(user.id)}
                          disabled={isResettingPassword === user.id}
                        >
                          <Key className="mr-2 h-4 w-4" />
                          {isResettingPassword === user.id ? 'Resetando...' : 'Redefinir senha'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBanToggle(user)}>
                          {user.status === 'banned' ? (
                            <>
                              <Unlock className="mr-2 h-4 w-4" />
                              Desbloquear
                            </>
                          ) : (
                            <>
                              <Ban className="mr-2 h-4 w-4 text-destructive" />
                              <span className="text-destructive">Bloquear</span>
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingUser && (
        <EditUserModal
          user={{
            id: editingUser.id,
            email: editingUser.email,
            roles: editingUser.roles,
            permissions: editingUser.permissions
          }}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onUserUpdated={() => {
            onUserUpdated()
            setEditingUser(null)
          }}
        />
      )}

      <UserDetailDrawer
        user={viewingUser}
        open={!!viewingUser}
        onOpenChange={(open) => !open && setViewingUser(null)}
        onUserUpdated={() => {
          onUserUpdated()
          setViewingUser(null)
        }}
      />
    </>
  )
}
