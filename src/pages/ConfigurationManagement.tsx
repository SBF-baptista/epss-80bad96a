
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
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
    const matchesSearch = rule.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.tracker_model.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || rule.category === categoryFilter
    const matchesBrand = brandFilter === 'all' || rule.brand === brandFilter
    const matchesConfiguration = configurationFilter === 'all' || rule.configuration === configurationFilter
    
    return matchesSearch && matchesCategory && matchesBrand && matchesConfiguration
  })

  // Get unique values for filters
  const categories = [...new Set(rules.map(rule => rule.category).filter(Boolean))]
  const brands = [...new Set(rules.map(rule => rule.brand).filter(Boolean))]
  const configurations = [...new Set(rules.map(rule => rule.configuration))]

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
      <div className="container-mobile mx-auto py-8 px-3 sm:px-6">
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar as regras de automação. Tente recarregar a página.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container-mobile mx-auto py-4 sm:py-8 space-y-4 sm:space-y-6 px-3 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">Gestão de Configurações</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Defina regras de automação para associar modelos de veículos com rastreadores e configurações
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nova Regra
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total de Regras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{rules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">Marcas de Veículos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{brands.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{configurations.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="truncate">Filtros e Busca</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por marca/modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Marca do Veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as marcas</SelectItem>
                {brands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
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
                setCategoryFilter('all')
                setBrandFilter('all')
                setConfigurationFilter('all')
              }}
              className="w-full"
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Regras de Automação ({filteredRules.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {rules.length === 0 ? 'Nenhuma regra cadastrada.' : 'Nenhuma regra encontrada com os filtros aplicados.'}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Categoria</TableHead>
                    <TableHead className="min-w-[100px]">Marca</TableHead>
                    <TableHead className="min-w-[120px]">Modelo do Veículo</TableHead>
                    <TableHead className="min-w-[70px]">Ano</TableHead>
                    <TableHead className="min-w-[120px]">Modelo do Rastreador</TableHead>
                    <TableHead className="min-w-[150px]">Configuração</TableHead>
                    <TableHead className="min-w-[120px]">Nota (Local de Instalação)</TableHead>
                    <TableHead className="min-w-[100px]">Data de Criação</TableHead>
                    <TableHead className="text-right min-w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{rule.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{rule.brand}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{rule.model}</TableCell>
                      <TableCell>
                        {rule.model_year ? (
                          <span className="text-sm text-gray-600">{rule.model_year}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{rule.tracker_model}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="max-w-[200px] truncate text-xs">
                          {rule.configuration}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rule.notes ? (
                          <span className="text-sm text-gray-600 max-w-[150px] truncate block">
                            {rule.notes}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
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
            </div>
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
