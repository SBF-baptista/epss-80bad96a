
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

  const { toast } = useToast()

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
    }
  }, [editingRule, isOpen])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createAutomationRule,
    onSuccess: () => {
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
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

        <ScrollArea className="flex-1 pr-6">
          <div className="space-y-6">
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
                <Select 
                  value={formData.brand} 
                  onValueChange={(value) => setFormData({ ...formData, brand: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleBrands.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo do Veículo *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Ex: FH540, Sprinter 515"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model_year">Ano do Modelo</Label>
              <Input
                id="model_year"
                value={formData.model_year}
                onChange={(e) => setFormData({ ...formData, model_year: e.target.value })}
                placeholder="Ex: 2023, 2024"
              />
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
                className="min-h-[80px]"
              />
            </div>

            {/* Photos section */}
            <AutomationRulePhotos 
              ruleId={editingRule?.id} 
              isEditing={true}
            />
          </div>
        </ScrollArea>

        <div className="flex justify-end space-x-3 pt-4 border-t flex-shrink-0 mt-4">
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
