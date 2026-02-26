import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface UserFilterState {
  search: string
  status: string
  role: string
}

interface UserFiltersProps {
  filters: UserFilterState
  onChange: (filters: UserFilterState) => void
}

export const UserFilters = ({ filters, onChange }: UserFiltersProps) => {
  const activeCount = [
    filters.search,
    filters.status !== 'all' ? filters.status : '',
    filters.role !== 'all' ? filters.role : '',
  ].filter(Boolean).length

  const clearFilters = () => {
    onChange({ search: '', status: 'all', role: 'all' })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por email..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status}
        onValueChange={(v) => onChange({ ...filters, status: v })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="active">Ativos</SelectItem>
          <SelectItem value="banned">Bloqueados</SelectItem>
          <SelectItem value="inactive">Inativos</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.role}
        onValueChange={(v) => onChange({ ...filters, role: v })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Perfil" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os perfis</SelectItem>
          <SelectItem value="admin">Administrador</SelectItem>
          <SelectItem value="gestor">Gestor</SelectItem>
          <SelectItem value="operador">Operador</SelectItem>
          <SelectItem value="visualizador">Visualizador</SelectItem>
          <SelectItem value="none">Sem perfil</SelectItem>
        </SelectContent>
      </Select>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          Limpar
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
            {activeCount}
          </Badge>
        </Button>
      )}
    </div>
  )
}
