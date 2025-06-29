
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useMutation } from '@tanstack/react-query'
import { createAutomationRule, updateAutomationRule, AutomationRule } from '@/services/automationRulesService'

interface AutomationRuleModalProps {
  isOpen: boolean
  onClose: () => void
  onRuleCreated: () => void
  editingRule?: AutomationRule | null
}

const vehicleTypes = ['HCV', 'LCV', 'VAN', 'PICKUP']
const vehicleBrands = ['MERCEDES', 'VOLVO', 'SCANIA', 'DAF', 'IVECO', 'FORD', 'FIAT', 'RENAULT', 'PEUGEOT']
const trackerModels = ['Ruptella Smart5', 'Ruptella ECO4', 'Queclink GV75', 'Teltonika FMB920', 'Positron PX300']
const configurationTypes = [
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
    marca_veiculo: '',
    modelo_veiculo: '',
    ano_veiculo: '',
    tipo_veiculo: '',
    modelo_rastreador: '',
    configuracao: ''
  })

  const { toast } = useToast()

  // Reset form when modal opens/closes or when editing rule changes
  useEffect(() => {
    if (editingRule) {
      setFormData({
        marca_veiculo: editingRule.marca_veiculo,
        modelo_veiculo: editingRule.modelo_veiculo,
        ano_veiculo: editingRule.ano_veiculo ? editingRule.ano_veiculo.toString() : '',
        tipo_veiculo: editingRule.tipo_veiculo || '',
        modelo_rastreador: editingRule.modelo_rastreador,
        configuracao: editingRule.configuracao
      })
    } else {
      setFormData({
        marca_veiculo: '',
        modelo_veiculo: '',
        ano_veiculo: '',
        tipo_veiculo: '',
        modelo_rastreador: '',
        configuracao: ''
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
    if (!formData.marca_veiculo || !formData.modelo_veiculo || !formData.modelo_rastreador || !formData.configuracao) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    const submitData = {
      marca_veiculo: formData.marca_veiculo,
      modelo_veiculo: formData.modelo_veiculo,
      ano_veiculo: formData.ano_veiculo ? parseInt(formData.ano_veiculo) : undefined,
      tipo_veiculo: formData.tipo_veiculo || undefined,
      modelo_rastreador: formData.modelo_rastreador,
      configuracao: formData.configuracao
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const isFormValid = formData.marca_veiculo && formData.modelo_veiculo && formData.modelo_rastreador && formData.configuracao

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
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

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marca_veiculo">Marca do Veículo *</Label>
              <Select 
                value={formData.marca_veiculo} 
                onValueChange={(value) => setFormData({ ...formData, marca_veiculo: value })}
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

            <div className="space-y-2">
              <Label htmlFor="modelo_veiculo">Modelo do Veículo *</Label>
              <Input
                id="modelo_veiculo"
                value={formData.modelo_veiculo}
                onChange={(e) => setFormData({ ...formData, modelo_veiculo: e.target.value })}
                placeholder="Ex: FH540, Sprinter 515"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ano_veiculo">Ano do Veículo</Label>
              <Input
                id="ano_veiculo"
                type="number"
                min="1990"
                max="2030"
                value={formData.ano_veiculo}
                onChange={(e) => setFormData({ ...formData, ano_veiculo: e.target.value })}
                placeholder="Ex: 2023, 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_veiculo">Tipo de Veículo</Label>
              <Select 
                value={formData.tipo_veiculo} 
                onValueChange={(value) => setFormData({ ...formData, tipo_veiculo: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {vehicleTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelo_rastreador">Modelo do Rastreador *</Label>
            <Select 
              value={formData.modelo_rastreador} 
              onValueChange={(value) => setFormData({ ...formData, modelo_rastreador: value })}
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
            <Label htmlFor="configuracao">Configuração *</Label>
            <Select 
              value={formData.configuracao} 
              onValueChange={(value) => setFormData({ ...formData, configuracao: value })}
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

          <div className="flex justify-end space-x-3 pt-4">
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
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AutomationRuleModal
