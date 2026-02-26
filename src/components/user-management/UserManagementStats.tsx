import { Users, UserCheck, Ban, Clock, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { type User } from '@/services/userManagementService'

interface UserManagementStatsProps {
  users: User[]
}

export const UserManagementStats = ({ users }: UserManagementStatsProps) => {
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === 'active').length
  const bannedUsers = users.filter(u => u.status === 'banned').length
  const inactiveUsers = users.filter(u => u.status === 'inactive').length
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const noRecentAccess = users.filter(u => {
    if (!u.last_sign_in_at) return true
    return new Date(u.last_sign_in_at) < thirtyDaysAgo
  }).length

  const stats = [
    {
      label: 'Total de Usuários',
      value: totalUsers,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Ativos',
      value: activeUsers,
      icon: UserCheck,
      color: 'text-[hsl(var(--success))]',
      bg: 'bg-[hsl(var(--success-light))]',
    },
    {
      label: 'Bloqueados',
      value: bannedUsers,
      icon: Ban,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: 'Inativos',
      value: inactiveUsers,
      icon: Clock,
      color: 'text-[hsl(var(--warning))]',
      bg: 'bg-[hsl(var(--warning-light))]',
    },
    {
      label: 'Sem acesso (30d)',
      value: noRecentAccess,
      icon: ShieldAlert,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
