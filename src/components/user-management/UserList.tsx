import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  MoreHorizontal, Key, UserCog, Eye, Ban, Unlock, Trash2,
  UserCheck, Clock, AlertTriangle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [bulkAction, setBulkAction] = useState<{ action: 'ban' | 'unban' | 'delete'; count: number } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  const { user: currentUser } = useAuth()

  const filteredUsers = users.filter(user => {
    if (filters.search && !user.email?.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.status !== 'all' && user.status !== filters.status) return false
    if (filters.role !== 'all') {
      if (filters.role === 'none') { if (user.roles.length > 0) return false }
      else { if (!user.roles.includes(filters.role)) return false }
    }
    return true
  })

  const isSelf = (userId: string) => currentUser?.id === userId

  // Selection handlers
  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  // Individual actions
  const handleResetPassword = async (userId: string) => {
    setIsResettingPassword(userId)
    try {
      const response = await userManagementService.resetUserPassword(userId)
      if (response.success) {
        toast({ title: 'Senha resetada', description: `Nova senha temporária: ${response.temporaryPassword}`, duration: 15000 })
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
      toast({ title: action === 'ban-user' ? 'Usuário bloqueado' : 'Usuário desbloqueado' })
      onUserUpdated()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    setIsProcessing(true)
    try {
      const response = await userManagementService.deleteUser(deleteTarget.id)
      if (response.success) {
        toast({ title: 'Usuário excluído', description: 'O usuário foi removido permanentemente.' })
        onUserUpdated()
      } else {
        toast({ title: 'Erro', description: response.error || 'Falha ao excluir', variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
      setIsProcessing(false)
    }
  }

  // Bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction) return
    setIsProcessing(true)
    try {
      const ids = Array.from(selectedIds)
      const response = await userManagementService.bulkAction(ids, bulkAction.action)
      if (response.success) {
        toast({ title: 'Ação concluída', description: response.message })
        clearSelection()
        onUserUpdated()
      } else {
        toast({ title: 'Erro', description: response.error || 'Falha na ação em massa', variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setBulkAction(null)
      setIsProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const getStatusBadge = (status: User['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border-[hsl(var(--success-border))] border hover:bg-[hsl(var(--success-light))]">
            <UserCheck className="h-3 w-3 mr-1" />Ativo
          </Badge>
        )
      case 'banned':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/30 border hover:bg-destructive/10">
            <Ban className="h-3 w-3 mr-1" />Bloqueado
          </Badge>
        )
      case 'inactive':
        return (
          <Badge className="bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))] border-[hsl(var(--warning-border))] border hover:bg-[hsl(var(--warning-light))]">
            <Clock className="h-3 w-3 mr-1" />Inativo
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

  const allSelected = filteredUsers.length > 0 && selectedIds.size === filteredUsers.length
  const someSelected = selectedIds.size > 0

  return (
    <>
      {/* Bulk actions bar */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-3 mb-3">
          <span className="text-sm font-medium">{selectedIds.size} usuário(s) selecionado(s)</span>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => setBulkAction({ action: 'ban', count: selectedIds.size })}>
              <Ban className="h-4 w-4 mr-1.5" />Bloquear
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBulkAction({ action: 'unban', count: selectedIds.size })}>
              <Unlock className="h-4 w-4 mr-1.5" />Desbloquear
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setBulkAction({ action: 'delete', count: selectedIds.size })}>
              <Trash2 className="h-4 w-4 mr-1.5" />Excluir
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>Limpar</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
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
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(user.id)}
                      onCheckedChange={() => toggleSelect(user.id)}
                      aria-label={`Selecionar ${user.email}`}
                    />
                  </TableCell>
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
                          <Eye className="mr-2 h-4 w-4" />Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingUser(user)}>
                          <UserCog className="mr-2 h-4 w-4" />Editar permissões
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
                            <><Unlock className="mr-2 h-4 w-4" />Desbloquear</>
                          ) : (
                            <><Ban className="mr-2 h-4 w-4 text-destructive" /><span className="text-destructive">Bloquear</span></>
                          )}
                        </DropdownMenuItem>
                        {!isSelf(user.id) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(user)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />Excluir usuário
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete single user dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Excluir Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja excluir permanentemente o usuário <strong>{deleteTarget?.email}</strong>?</p>
              <ul className="text-xs list-disc pl-4 space-y-1 mt-2">
                <li>O usuário perderá acesso ao sistema imediatamente</li>
                <li>Dados de permissões e roles serão removidos</li>
                <li>Registros de auditoria serão mantidos para rastreabilidade</li>
              </ul>
              <p className="text-destructive font-medium text-sm mt-2">Esta ação não pode ser desfeita.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk action dialog */}
      <AlertDialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction?.action === 'ban' && 'Bloquear Usuários'}
              {bulkAction?.action === 'unban' && 'Desbloquear Usuários'}
              {bulkAction?.action === 'delete' && (
                <span className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Excluir Usuários
                </span>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction?.action === 'ban' && `Tem certeza que deseja bloquear ${bulkAction.count} usuário(s)? Eles não poderão acessar o sistema.`}
              {bulkAction?.action === 'unban' && `Tem certeza que deseja desbloquear ${bulkAction.count} usuário(s)?`}
              {bulkAction?.action === 'delete' && (
                <>
                  <p>Tem certeza que deseja excluir permanentemente <strong>{bulkAction.count} usuário(s)</strong>?</p>
                  <p className="text-destructive font-medium text-sm mt-2">Esta ação não pode ser desfeita. Sua própria conta será ignorada caso esteja na seleção.</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkAction}
              disabled={isProcessing}
              className={bulkAction?.action === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {isProcessing ? 'Processando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingUser && (
        <EditUserModal
          user={{ id: editingUser.id, email: editingUser.email, roles: editingUser.roles, permissions: editingUser.permissions }}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onUserUpdated={() => { onUserUpdated(); setEditingUser(null) }}
        />
      )}

      <UserDetailDrawer
        user={viewingUser}
        open={!!viewingUser}
        onOpenChange={(open) => !open && setViewingUser(null)}
        onUserUpdated={() => { onUserUpdated(); setViewingUser(null) }}
      />
    </>
  )
}
