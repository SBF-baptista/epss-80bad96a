
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { fetchAutomationRules, deleteAutomationRule, AutomationRule } from '@/services/automationRulesService'
import AutomationRuleModal from '@/components/AutomationRuleModal'

const ConfigurationManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all')
  const [configurationFilter, setConfigurationFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [deleteRuleId, setDeleteRuleId] = useState<number | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch automation rules
  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: fetchAutomationRules,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteAutomationRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      toast({
        title: "Regra excluída",
        description: "A regra de automação foi excluída com sucesso.",
      })
      setDeleteRuleId(null)
    },
    onError: (error) => {
      console.error('Error deleting rule:', error)
      toast({
        title: "Erro ao excluir regra",
        description: "Ocorreu um erro ao excluir a regra. Tente novamente.",
        variant: "destructive",
      })
    },
  })

  // Filter rules based on search and filters
  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.modelo_veiculo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.modelo_rastreador.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesVehicleType = vehicleTypeFilter === 'all' || rule.tipo_veiculo === vehicleTypeFilter
    const matchesConfiguration = configurationFilter === 'all' || rule.configuracao === configurationFilter
    
    return matchesSearch && matchesVehicleType && matchesConfiguration
  })

  // Get unique values for filters
  const vehicleTypes = [...new Set(rules.map(rule => rule.tipo_veiculo).filter(Boolean))]
  const configurations = [...new Set(rules.map(rule => rule.configuracao))]

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(rule)
    setIsModalOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeleteRuleId(id)
  }

  const confirmDelete = () => {
    if (deleteRuleId) {
      deleteMutation.mutate(deleteRuleId)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingRule(null)
  }

  const handleRuleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    handleModalClose()
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar as regras de automação. Tente recarregar a página.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Configurações</h1>
          <p className="text-gray-600 mt-2">
            Defina regras de automação para associar modelos de veículos com rastreadores e configurações
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Regra
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Regras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{rules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Modelos de Veículos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Set(rules.map(rule => rule.modelo_veiculo)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{configurations.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {vehicleTypes.map(type => (
                  <SelectItem key={type} value={type!}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={configurationFilter} onValueChange={setConfigurationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Configuração" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas configurações</SelectItem>
                {configurations.map(config => (
                  <SelectItem key={config} value={config}>{config}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setVehicleTypeFilter('all')
                setConfigurationFilter('all')
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Regras de Automação ({filteredRules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {rules.length === 0 ? 'Nenhuma regra cadastrada.' : 'Nenhuma regra encontrada com os filtros aplicados.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo do Veículo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Modelo do Rastreador</TableHead>
                  <TableHead>Configuração</TableHead>
                  <TableHead>Qtd. Padrão</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.modelo_veiculo}</TableCell>
                    <TableCell>
                      {rule.tipo_veiculo ? (
                        <Badge variant="secondary">{rule.tipo_veiculo}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{rule.modelo_rastreador}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.configuracao}</Badge>
                    </TableCell>
                    <TableCell>{rule.quantidade_default}</TableCell>
                    <TableCell>
                      {new Date(rule.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(rule)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(rule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AutomationRuleModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onRuleCreated={handleRuleCreated}
        editingRule={editingRule}
      />

      <AlertDialog open={deleteRuleId !== null} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta regra de automação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ConfigurationManagement
