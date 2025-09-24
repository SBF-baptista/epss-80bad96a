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
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-none px-3 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">Gestão de Configurações</h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">
              Defina regras de automação para associar modelos de veículos com rastreadores e configurações
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Nova Regra
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
          <Card className="min-h-[80px] sm:min-h-[100px]">
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total de Regras</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">{rules.length}</div>
            </CardContent>
          </Card>
          <Card className="min-h-[80px] sm:min-h-[100px]">
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Categorias</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-secondary">{categories.length}</div>
            </CardContent>
          </Card>
          <Card className="min-h-[80px] sm:min-h-[100px]">
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Marcas de Veículos</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-accent">{brands.length}</div>
            </CardContent>
          </Card>
          <Card className="min-h-[80px] sm:min-h-[100px]">
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-destructive">{configurations.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">Filtros e Busca</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por marca/modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="text-sm">
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
                <SelectTrigger className="text-sm">
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
                <SelectTrigger className="text-sm">
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
                className="w-full text-sm"
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Table - Fixed height with internal scroll */}
      <div className="flex-1 px-3 sm:px-6 pb-4 sm:pb-6 overflow-hidden">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 flex-none">
            <CardTitle className="text-sm sm:text-base">Regras de Automação ({filteredRules.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4 flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="flex justify-center items-center h-full text-muted-foreground">
                {rules.length === 0 ? 'Nenhuma regra cadastrada.' : 'Nenhuma regra encontrada com os filtros aplicados.'}
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="min-w-[100px] text-xs sm:text-sm">Categoria</TableHead>
                      <TableHead className="min-w-[100px] text-xs sm:text-sm">Marca</TableHead>
                      <TableHead className="min-w-[120px] text-xs sm:text-sm">Modelo do Veículo</TableHead>
                      <TableHead className="min-w-[70px] text-xs sm:text-sm">Ano</TableHead>
                      <TableHead className="min-w-[120px] text-xs sm:text-sm">Modelo do Rastreador</TableHead>
                      <TableHead className="min-w-[150px] text-xs sm:text-sm">Configuração</TableHead>
                      <TableHead className="min-w-[120px] text-xs sm:text-sm">Nota (Local de Instalação)</TableHead>
                      <TableHead className="min-w-[100px] text-xs sm:text-sm">Data de Criação</TableHead>
                      <TableHead className="text-right min-w-[100px] text-xs sm:text-sm">Ações</TableHead>
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
                        <TableCell className="font-medium text-xs sm:text-sm">{rule.model}</TableCell>
                        <TableCell>
                          {rule.model_year ? (
                            <span className="text-xs sm:text-sm text-muted-foreground">{rule.model_year}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">{rule.tracker_model}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="max-w-[200px] truncate text-xs">
                            {rule.configuration}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rule.notes ? (
                            <span className="text-xs sm:text-sm text-muted-foreground max-w-[150px] truncate block">
                              {rule.notes}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {new Date(rule.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(rule)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(rule.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
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
      </div>

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