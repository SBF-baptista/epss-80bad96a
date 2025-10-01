
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useMutation } from '@tanstack/react-query'
import { createAutomationRule, updateAutomationRule, AutomationRule } from '@/services/automationRulesService'
import AutomationRulePhotos from './AutomationRulePhotos'
import { useFipeBrands, useFipeModels, useFipeYears } from '@/hooks/useFipeData'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutomationRuleModalProps {
  isOpen: boolean
  onClose: () => void
  onRuleCreated: () => void
  editingRule?: AutomationRule | null
}

const vehicleCategories = ['PESADO', 'LEVE', 'MÁQUINA', 'VAN', 'PICKUP']
const vehicleBrands = ['VOLKSWAGEN', 'CATERPILLAR', 'XCMG', 'FORD', 'BMW', 'CITROEN', 'HYUNDAI', 'MERCEDES', 'VOLVO', 'SCANIA', 'DAF', 'IVECO', 'FIAT', 'RENAULT', 'PEUGEOT']
const trackerModels = ['SMART5', 'Ruptella Smart5', 'Ruptella ECO4', 'Queclink GV75', 'Teltonika FMB920', 'Positron PX300']
const configurationTypes = [
  'FMS250',
  'Testar Truck14, Truck18 ou FMS250',
  'J1939 + FMS250', 
  'HCV - Truck3 + FMS250',
  'OBD - BMW / LCV - BMW18',
  'LCV group - CITROEN13 / OBD - CITROEN',
  'J1939',
  'HCV MERCEDES',
  'HCV VOLVO',
  'HCV SCANIA',
  'HCV DAF',
  'HCV IVECO',
  'HCV FORD',
  'LCV FIAT',
  'LCV RENAULT',
  'LCV PEUGEOT'
]

const AutomationRuleModal = ({ isOpen, onClose, onRuleCreated, editingRule }: AutomationRuleModalProps) => {
  const [formData, setFormData] = useState({
    category: '',
    brand: '',
    model: '',
    model_year: '',
    tracker_model: '',
    configuration: '',
    notes: ''
  })
  const [temporaryPhotos, setTemporaryPhotos] = useState<File[]>([])
  const [selectedBrandCode, setSelectedBrandCode] = useState("")
  const [selectedModelCode, setSelectedModelCode] = useState("")
  const [openBrand, setOpenBrand] = useState(false)
  const [openModel, setOpenModel] = useState(false)
  const [openYear, setOpenYear] = useState(false)

  const { toast } = useToast()
  const { brands, loading: loadingBrands } = useFipeBrands()
  const { models, loading: loadingModels } = useFipeModels(selectedBrandCode)
  const { years, loading: loadingYears } = useFipeYears(selectedBrandCode, selectedModelCode)

  // Reset form when modal opens/closes or when editing rule changes
  useEffect(() => {
    if (editingRule) {
      setFormData({
        category: editingRule.category,
        brand: editingRule.brand,
        model: editingRule.model,
        model_year: editingRule.model_year || '',
        tracker_model: editingRule.tracker_model,
        configuration: editingRule.configuration,
        notes: editingRule.notes || ''
      })
      setSelectedBrandCode("")
      setSelectedModelCode("")
      setTemporaryPhotos([])
    } else {
      setFormData({
        category: '',
        brand: '',
        model: '',
        model_year: '',
        tracker_model: '',
        configuration: '',
        notes: ''
      })
      setSelectedBrandCode("")
      setSelectedModelCode("")
      setTemporaryPhotos([])
    }
  }, [editingRule, isOpen])

  const handleBrandChange = (value: string) => {
    const brand = brands.find(b => b.code === value)
    if (brand) {
      setSelectedBrandCode(brand.code)
      setFormData({ ...formData, brand: brand.name, model: '', model_year: '' })
      setSelectedModelCode("")
      setOpenBrand(false)
    }
  }

  const handleModelChange = (value: string) => {
    const model = models.find(m => m.code === value)
    if (model) {
      setSelectedModelCode(model.code)
      setFormData({ ...formData, model: model.name, model_year: '' })
      setOpenModel(false)
    }
  }

  const handleYearChange = (value: string) => {
    setFormData({ ...formData, model_year: value })
    setOpenYear(false)
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const rule = await createAutomationRule(data)
      
      // Upload temporary photos if any exist
      if (temporaryPhotos.length > 0) {
        const { uploadAutomationRulePhoto } = await import('@/services/automationRulesService')
        await Promise.all(
          temporaryPhotos.map(photo => uploadAutomationRulePhoto(rule.id, photo))
        )
      }
      
      return rule
    },
    onSuccess: () => {
      setTemporaryPhotos([])
      toast({
        title: "Regra criada",
        description: "A regra de automação foi criada com sucesso.",
      })
      onRuleCreated()
    },
    onError: (error) => {
      console.error('Error creating rule:', error)
      toast({
        title: "Erro ao criar regra",
        description: "Ocorreu um erro ao criar a regra. Tente novamente.",
        variant: "destructive",
      })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateAutomationRule(id, data),
    onSuccess: () => {
      toast({
        title: "Regra atualizada",
        description: "A regra de automação foi atualizada com sucesso.",
      })
      onRuleCreated()
    },
    onError: (error) => {
      console.error('Error updating rule:', error)
      toast({
        title: "Erro ao atualizar regra",
        description: "Ocorreu um erro ao atualizar a regra. Tente novamente.",
        variant: "destructive",
      })
    },
  })

  const handleSubmit = () => {
    if (!formData.category || !formData.brand || !formData.model || !formData.tracker_model || !formData.configuration) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    const submitData = {
      category: formData.category,
      brand: formData.brand,
      model: formData.model,
      model_year: formData.model_year || undefined,
      tracker_model: formData.tracker_model,
      configuration: formData.configuration,
      notes: formData.notes || undefined
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const isFormValid = formData.category && formData.brand && formData.model && formData.tracker_model && formData.configuration

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-0">
          <DialogTitle>
            {editingRule ? 'Editar Regra de Automação' : 'Nova Regra de Automação'}
          </DialogTitle>
          <DialogDescription>
            {editingRule 
              ? 'Atualize os dados da regra de automação.'
              : 'Defina uma nova regra para automatizar a associação de veículos com rastreadores.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Marca do Veículo *</Label>
                <Popover open={openBrand} onOpenChange={setOpenBrand}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openBrand}
                      className="w-full justify-between"
                      disabled={loadingBrands}
                    >
                      {formData.brand || (loadingBrands ? "Carregando..." : "Selecione ou digite a marca")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Pesquisar ou criar marca..." 
                        className="h-9"
                        value={formData.brand}
                        onValueChange={(value) => {
                          setFormData({ ...formData, brand: value });
                          setSelectedBrandCode("");
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="py-6 text-center text-sm">
                            <p className="mb-2">Marca não encontrada na FIPE</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (formData.brand.trim()) {
                                  setOpenBrand(false);
                                  setFormData({ ...formData, model: '', model_year: '' });
                                  setSelectedModelCode("");
                                }
                              }}
                            >
                              Criar "{formData.brand}" manualmente
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {brands
                            .filter(brand => 
                              brand.name.toLowerCase().includes(formData.brand.toLowerCase())
                            )
                            .map((brand) => (
                              <CommandItem
                                key={brand.code}
                                value={brand.name}
                                onSelect={() => handleBrandChange(brand.code)}
                              >
                                {brand.name}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedBrandCode === brand.code ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo do Veículo *</Label>
              <Popover open={openModel} onOpenChange={setOpenModel}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openModel}
                    className="w-full justify-between"
                    disabled={!selectedBrandCode && !formData.brand || loadingModels}
                  >
                    {formData.model || 
                      (!formData.brand ? "Selecione uma marca primeiro" :
                      loadingModels ? "Carregando..." :
                      "Selecione ou digite o modelo")}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Pesquisar ou criar modelo..." 
                      className="h-9"
                      value={formData.model}
                      onValueChange={(value) => {
                        setFormData({ ...formData, model: value });
                        setSelectedModelCode("");
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-6 text-center text-sm">
                          <p className="mb-2">Modelo não encontrado na FIPE</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (formData.model.trim()) {
                                setOpenModel(false);
                                setFormData({ ...formData, model_year: '' });
                              }
                            }}
                          >
                            Criar "{formData.model}" manualmente
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {models
                          .filter(model => 
                            model.name.toLowerCase().includes(formData.model.toLowerCase())
                          )
                          .map((model) => (
                            <CommandItem
                              key={model.code}
                              value={model.name}
                              onSelect={() => handleModelChange(model.code)}
                            >
                              {model.name}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  selectedModelCode === model.code ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model_year">Ano do Modelo</Label>
              <Popover open={openYear} onOpenChange={setOpenYear}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openYear}
                    className="w-full justify-between"
                    disabled={!selectedModelCode && !formData.model || loadingYears}
                  >
                    {formData.model_year ? 
                      (years.find(y => y.code === formData.model_year)?.name || formData.model_year) :
                      (!formData.model ? "Selecione um modelo primeiro" :
                      loadingYears ? "Carregando..." :
                      "Selecione ou digite o ano (opcional)")}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Pesquisar ou criar ano..." 
                      className="h-9"
                      value={formData.model_year}
                      onValueChange={(value) => {
                        setFormData({ ...formData, model_year: value });
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-6 text-center text-sm">
                          <p className="mb-2">Ano não encontrado na FIPE</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (formData.model_year.trim() && /^\d{4}$/.test(formData.model_year)) {
                                setOpenYear(false);
                              }
                            }}
                          >
                            Criar "{formData.model_year}" manualmente
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {years
                          .filter(year => 
                            year.name.toLowerCase().includes(formData.model_year.toLowerCase())
                          )
                          .map((year) => (
                            <CommandItem
                              key={year.code}
                              value={year.name}
                              onSelect={() => handleYearChange(year.code)}
                            >
                              {year.name}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  formData.model_year === year.code ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracker_model">Modelo do Rastreador *</Label>
              <Select 
                value={formData.tracker_model} 
                onValueChange={(value) => setFormData({ ...formData, tracker_model: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo do rastreador" />
                </SelectTrigger>
                <SelectContent>
                  {trackerModels.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="configuration">Configuração *</Label>
              <Select 
                value={formData.configuration} 
                onValueChange={(value) => setFormData({ ...formData, configuration: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a configuração" />
                </SelectTrigger>
                <SelectContent>
                  {configurationTypes.map(config => (
                    <SelectItem key={config} value={config}>{config}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Nota (Local de Instalação)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ex: Painel principal, Central do veículo, Compartimento motor..."
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Photos section */}
            <AutomationRulePhotos 
              ruleId={editingRule?.id} 
              isEditing={true}
              temporaryPhotos={!editingRule ? temporaryPhotos : undefined}
              onTemporaryPhotosChange={!editingRule ? setTemporaryPhotos : undefined}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 pt-4 border-t flex-shrink-0 bg-background">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
            {isSubmitting 
              ? (editingRule ? 'Atualizando...' : 'Criando...') 
              : (editingRule ? 'Atualizar Regra' : 'Criar Regra')
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AutomationRuleModal
