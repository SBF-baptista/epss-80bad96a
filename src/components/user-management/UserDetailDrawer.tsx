import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Shield, Key, Lock, Unlock, Ban, UserCheck, Clock,
  AlertTriangle, History, RefreshCw, Copy, Check, Mail,
  ShieldAlert, Timer
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { userManagementService, type User } from '@/services/userManagementService'
import { supabase } from '@/integrations/supabase/client'
import { getRoleLabel, getRoleBadgeVariant } from '@/services/permissionsService'
import { PERMISSION_LABELS, MODULE_GROUPS } from '@/types/permissions'

interface PasswordResetInfo {
  temporaryPassword: string
  resetAt: string
  userEmail: string
}

interface UserDetailDrawerProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated: () => void
}

export const UserDetailDrawer = ({ user, open, onOpenChange, onUserUpdated }: UserDetailDrawerProps) => {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [passwordResetInfo, setPasswordResetInfo] = useState<PasswordResetInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  if (!user) return null

  const statusConfig = getStatusConfig(user.status)
  const StatusIcon = statusConfig.icon

  const handleAction = async (action: string) => {
    setIsLoading(action)
    try {
      if (action === 'reset-password') {
        const response = await userManagementService.resetUserPassword(user.id)
        if (response.success && response.temporaryPassword) {
          setPasswordResetInfo({
            temporaryPassword: response.temporaryPassword,
            resetAt: new Date().toISOString(),
            userEmail: user.email,
          })
        } else {
          throw new Error(response.error || 'Erro ao redefinir senha')
        }
      } else if (action === 'ban' || action === 'unban') {
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: { action: action === 'ban' ? 'ban-user' : 'unban-user', userId: user.id }
        })
        if (error) throw error
        if (!data?.success) throw new Error(data?.error)
        toast({
          title: action === 'ban' ? 'Usuário bloqueado' : 'Usuário desbloqueado',
          description: action === 'ban'
            ? 'O usuário foi impedido de fazer login.'
            : 'O usuário pode fazer login novamente.'
        })
        onUserUpdated()
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro inesperado',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(null)
    }
  }

  const handleCopyPassword = async () => {
    if (!passwordResetInfo) return
    await navigator.clipboard.writeText(passwordResetInfo.temporaryPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const permissionsByGroup = Object.entries(MODULE_GROUPS).map(([groupKey, group]) => ({
    groupKey,
    label: group.label,
    modules: group.modules.map(mod => {
      const userPerm = user.permissions?.find(p => p.module === mod.key)
      return { ...mod, permission: userPerm?.permission || 'none' }
    })
  }))

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setPasswordResetInfo(null); setCopied(false) } }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${statusConfig.bg}`}>
              <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
            </div>
            <div>
              <SheetTitle className="text-lg">{user.email}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Badge className={`${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border} hover:${statusConfig.bg}`}>
                  {statusConfig.label}
                </Badge>
                {user.roles.map(role => (
                  <Badge key={role} variant={getRoleBadgeVariant(role as any) as any}>
                    {getRoleLabel(role as any)}
                  </Badge>
                ))}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="security" className="mt-2">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="security" className="text-xs">
              <Key className="h-3.5 w-3.5 mr-1.5" />Segurança
            </TabsTrigger>
            <TabsTrigger value="access" className="text-xs">
              <Shield className="h-3.5 w-3.5 mr-1.5" />Acesso
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs">
              <History className="h-3.5 w-3.5 mr-1.5" />Auditoria
            </TabsTrigger>
          </TabsList>

          {/* ─── Security Tab ─── */}
          <TabsContent value="security" className="mt-4 space-y-5">
            {/* Info cards */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Informações de Segurança
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={<Mail className="h-3.5 w-3.5" />} label="Email confirmado" value={user.email_confirmed_at ? 'Confirmado ✔️' : 'Não confirmado ❌'} />
                <InfoItem icon={<Clock className="h-3.5 w-3.5" />} label="Criado em" value={formatDate(user.created_at)} />
                <InfoItem icon={<RefreshCw className="h-3.5 w-3.5" />} label="Atualizado em" value={formatDate(user.updated_at)} />
              </div>
            </section>

            <Separator />

            {/* Last access highlight */}
            <LastAccessCard lastSignInAt={user.last_sign_in_at} createdAt={user.created_at} />

            <Separator />

            {/* ─── Credential History ─── */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                Credenciais e Ações de Senha
              </h4>

              {passwordResetInfo ? (
                <div className="space-y-3">
                  {/* Temp password card */}
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Senha temporária gerada</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono tracking-wider select-all">
                        {passwordResetInfo.temporaryPassword}
                      </code>
                      <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={handleCopyPassword}>
                        {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>

                    <div className="rounded-lg bg-accent/50 border border-accent px-3 py-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <AlertTriangle className="h-3 w-3 inline mr-1 text-destructive" />
                        Esta senha não poderá ser visualizada novamente após fechar este painel. Copie-a agora.
                      </p>
                    </div>
                  </div>

                  {/* Reset metadata */}
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={passwordResetInfo.userEmail} />
                    <InfoItem icon={<Clock className="h-3.5 w-3.5" />} label="Redefinida em" value={formatDate(passwordResetInfo.resetAt)} />
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Aguardando primeiro login com a nova senha</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Nenhuma ação recente de credenciais registrada nesta sessão.</p>
                </div>
              )}
            </section>

            <Separator />

            {/* Risk indicators */}
            {(user.status === 'inactive' || user.status === 'banned') && (
              <>
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">
                        {user.status === 'banned' ? 'Usuário bloqueado' : 'Sem acesso recente'}
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {user.status === 'banned'
                          ? 'Este usuário está impedido de fazer login no sistema.'
                          : 'Este usuário não acessa o sistema há mais de 30 dias.'}
                      </p>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Admin actions */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Ações Administrativas</h4>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline" size="sm" className="justify-start"
                  onClick={() => handleAction('reset-password')}
                  disabled={isLoading === 'reset-password'}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading === 'reset-password' ? 'animate-spin' : ''}`} />
                  Redefinir senha
                </Button>
                {user.status === 'banned' ? (
                  <Button
                    variant="outline" size="sm" className="justify-start text-primary"
                    onClick={() => handleAction('unban')}
                    disabled={isLoading === 'unban'}
                  >
                    <Unlock className={`h-4 w-4 mr-2 ${isLoading === 'unban' ? 'animate-spin' : ''}`} />
                    Desbloquear usuário
                  </Button>
                ) : (
                  <Button
                    variant="outline" size="sm" className="justify-start text-destructive"
                    onClick={() => handleAction('ban')}
                    disabled={isLoading === 'ban'}
                  >
                    <Lock className={`h-4 w-4 mr-2 ${isLoading === 'ban' ? 'animate-spin' : ''}`} />
                    Bloquear login
                  </Button>
                )}
              </div>
            </section>
          </TabsContent>

          {/* ─── Access Tab ─── */}
          <TabsContent value="access" className="mt-4 space-y-5">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Perfis Vinculados</h4>
              <div className="flex flex-wrap gap-2">
                {user.roles.length > 0 ? (
                  user.roles.map(role => (
                    <Badge key={role} variant={getRoleBadgeVariant(role as any) as any} className="text-sm py-1 px-3">
                      {getRoleLabel(role as any)}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum perfil atribuído</p>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Permissões por Módulo</h4>
              {permissionsByGroup.map(group => {
                const hasAny = group.modules.some(m => m.permission !== 'none')
                if (!hasAny && user.roles.includes('admin')) return null
                return (
                  <div key={group.groupKey} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{group.label}</p>
                    <div className="space-y-1">
                      {group.modules.map(mod => {
                        const level = user.roles.includes('admin') ? 'admin' : mod.permission
                        if (level === 'none') return (
                          <div key={mod.key} className="flex items-center justify-between py-1.5 px-2 rounded-lg">
                            <span className="text-sm text-muted-foreground">{mod.label}</span>
                            <Badge variant="outline" className="text-xs opacity-50">Sem acesso</Badge>
                          </div>
                        )
                        return (
                          <div key={mod.key} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/50">
                            <span className="text-sm">{mod.label}</span>
                            <Badge variant="secondary" className="text-xs">
                              {PERMISSION_LABELS[level as keyof typeof PERMISSION_LABELS] || level}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {user.roles.includes('admin') && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-sm text-primary">
                  <Shield className="h-4 w-4 inline mr-2" />
                  Administradores possuem acesso total a todos os módulos.
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── Audit Tab ─── */}
          <TabsContent value="audit" className="mt-4 space-y-5">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Linha do Tempo</h4>
              <div className="space-y-3">
                <AuditEntry icon={<UserCheck className="h-3.5 w-3.5" />} label="Conta criada" date={formatDate(user.created_at)} type="info" />
                {user.email_confirmed_at && (
                  <AuditEntry icon={<Shield className="h-3.5 w-3.5" />} label="Email confirmado" date={formatDate(user.email_confirmed_at)} type="success" />
                )}
                {user.last_sign_in_at && (
                  <AuditEntry icon={<Key className="h-3.5 w-3.5" />} label="Último login" date={formatDate(user.last_sign_in_at)} type="info" />
                )}
                {user.status === 'banned' && (
                  <AuditEntry icon={<Ban className="h-3.5 w-3.5" />} label="Usuário bloqueado" date={formatDate(user.banned_until)} type="error" />
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Dados da Conta</h4>
              <div className="space-y-2">
                <InfoItem label="ID do Usuário" value={user.id} mono />
                <InfoItem label="Criação" value={formatDate(user.created_at)} />
                <InfoItem label="Última atualização" value={formatDate(user.updated_at)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

/* ─── Helpers ─── */

function formatDate(dateString?: string | null) {
  if (!dateString) return 'Nunca'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function getStatusConfig(status: User['status']) {
  switch (status) {
    case 'active':
      return { label: 'Ativo', icon: UserCheck, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' }
    case 'banned':
      return { label: 'Bloqueado', icon: Ban, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' }
    case 'inactive':
      return { label: 'Inativo', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' }
    default:
      return { label: 'Desconhecido', icon: AlertTriangle, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' }
  }
}

function InfoItem({ label, value, mono, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="bg-muted/50 rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-sm font-medium mt-0.5 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</p>
    </div>
  )
}

function AuditEntry({ icon, label, date, type }: { icon: React.ReactNode; label: string; date: string; type: 'info' | 'success' | 'error' }) {
  const colors = {
    info: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-primary/10 text-primary border-primary/20',
    error: 'bg-destructive/10 text-destructive border-destructive/30'
  }
  return (
    <div className="flex items-start gap-3">
      <div className={`p-1.5 rounded-lg border ${colors[type]} shrink-0 mt-0.5`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
    </div>
  )
}

function LastAccessCard({ lastSignInAt, createdAt }: { lastSignInAt?: string | null; createdAt: string }) {
  const neverAccessed = !lastSignInAt
  const isSameAsCreation = lastSignInAt && Math.abs(new Date(lastSignInAt).getTime() - new Date(createdAt).getTime()) < 60000

  const getAccessStatus = () => {
    if (neverAccessed || isSameAsCreation) {
      return { level: 'none' as const, label: 'Sem registros de acesso', sublabel: 'Este usuário nunca realizou login no sistema.', color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border', iconColor: 'text-muted-foreground' }
    }
    const daysSince = Math.floor((Date.now() - new Date(lastSignInAt!).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince > 30) {
      return { level: 'warning' as const, label: `Sem acesso há ${daysSince} dias`, sublabel: 'Este usuário não acessa o sistema há mais de 30 dias.', color: 'text-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20', iconColor: 'text-destructive' }
    }
    if (daysSince <= 7) {
      return { level: 'ok' as const, label: 'Acesso recente', sublabel: `Último login: ${formatDate(lastSignInAt)}`, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20', iconColor: 'text-primary' }
    }
    return { level: 'normal' as const, label: 'Acesso normal', sublabel: `Último login: ${formatDate(lastSignInAt)}`, color: 'text-foreground', bg: 'bg-muted/30', border: 'border-border', iconColor: 'text-muted-foreground' }
  }

  const status = getAccessStatus()

  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Key className="h-4 w-4 text-muted-foreground" />
        Último Acesso
      </h4>
      <div className={`rounded-xl border ${status.border} ${status.bg} p-4`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${status.bg} border ${status.border}`}>
            {status.level === 'warning' ? <AlertTriangle className={`h-4 w-4 ${status.iconColor}`} /> : status.level === 'none' ? <Clock className={`h-4 w-4 ${status.iconColor}`} /> : <UserCheck className={`h-4 w-4 ${status.iconColor}`} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{status.sublabel}</p>
            {!neverAccessed && !isSameAsCreation && (
              <p className="text-xs text-muted-foreground mt-1 opacity-70">Último login realizado pelo usuário</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}