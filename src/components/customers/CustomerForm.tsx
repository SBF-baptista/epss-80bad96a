import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useStates, useCities } from '@/hooks/useIBGEData';
import { 
  createCustomer, 
  validateCPF, 
  validateCNPJ, 
  validatePhone, 
  validateEmail,
  getCustomerByDocument
} from '@/services/customerService';
import type { Customer, CreateCustomerData } from '@/services/customerService';

const customerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  document_type: z.enum(['cpf', 'cnpj'], { required_error: 'Tipo de documento é obrigatório' }),
  document_number: z.string().min(1, 'Documento é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido').max(255, 'Email deve ter no máximo 255 caracteres'),
  address_street: z.string().min(1, 'Rua é obrigatória').max(200, 'Rua deve ter no máximo 200 caracteres'),
  address_number: z.string().min(1, 'Número é obrigatório').max(20, 'Número deve ter no máximo 20 caracteres'),
  address_neighborhood: z.string().min(1, 'Bairro é obrigatório').max(100, 'Bairro deve ter no máximo 100 caracteres'),
  address_city: z.string().min(1, 'Cidade é obrigatória'),
  address_state: z.string().min(2, 'Estado é obrigatório').max(2, 'Estado deve ter 2 caracteres'),
  address_postal_code: z.string().min(8, 'CEP deve ter 8 dígitos').max(9, 'CEP inválido'),
  address_complement: z.string().max(100, 'Complemento deve ter no máximo 100 caracteres').optional()
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  onSuccess: (customer: Customer) => void;
  onCancel: () => void;
}

export const CustomerForm = ({ onSuccess, onCancel }: CustomerFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { states } = useStates();
  
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      document_type: 'cpf',
      address_complement: ''
    }
  });

  const selectedState = form.watch('address_state');
  const { cities } = useCities(selectedState);
  const documentType = form.watch('document_type');

  const validateDocument = async (document: string, type: 'cpf' | 'cnpj'): Promise<string | null> => {
    const cleanDocument = document.replace(/[^\d]/g, '');
    
    if (type === 'cpf' && !validateCPF(cleanDocument)) {
      return 'CPF inválido';
    }
    
    if (type === 'cnpj' && !validateCNPJ(cleanDocument)) {
      return 'CNPJ inválido';
    }

    // Check if document already exists
    try {
      const existingCustomer = await getCustomerByDocument(cleanDocument);
      if (existingCustomer) {
        return `${type.toUpperCase()} já cadastrado para ${existingCustomer.name}`;
      }
    } catch (error) {
      console.error('Error checking existing document:', error);
    }

    return null;
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setIsSubmitting(true);

      // Validate document
      const documentError = await validateDocument(data.document_number, data.document_type);
      if (documentError) {
        form.setError('document_number', { message: documentError });
        return;
      }

      // Validate phone
      if (!validatePhone(data.phone)) {
        form.setError('phone', { message: 'Telefone inválido. Use formato (XX) XXXXX-XXXX' });
        return;
      }

      // Validate email
      if (!validateEmail(data.email)) {
        form.setError('email', { message: 'Email inválido' });
        return;
      }

      // Clean document number for storage
      const customerData: CreateCustomerData = {
        name: data.name,
        document_type: data.document_type,
        document_number: data.document_number.replace(/[^\d]/g, ''),
        phone: data.phone.replace(/[^\d]/g, ''),
        email: data.email,
        address_street: data.address_street,
        address_number: data.address_number,
        address_neighborhood: data.address_neighborhood,
        address_city: data.address_city,
        address_state: data.address_state,
        address_postal_code: data.address_postal_code.replace(/[^\d]/g, ''),
        address_complement: data.address_complement
      };

      const customer = await createCustomer(customerData);
      
      toast({
        title: "Cliente cadastrado",
        description: `Cliente "${customer.name}" foi cadastrado com sucesso.`
      });

      onSuccess(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao cadastrar cliente",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastrar Novo Cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              placeholder="Nome completo do cliente"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Document Type and Number */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Documento *</Label>
              <Select
                value={form.watch('document_type')}
                onValueChange={(value: 'cpf' | 'cnpj') => form.setValue('document_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="document_number">
                {documentType === 'cpf' ? 'CPF' : 'CNPJ'} *
              </Label>
              <Input
                id="document_number"
                placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                {...form.register('document_number')}
              />
              {form.formState.errors.document_number && (
                <p className="text-sm text-destructive">{form.formState.errors.document_number.message}</p>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                {...form.register('phone')}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@email.com"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Endereço de Instalação</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="address_street">Rua *</Label>
                <Input
                  id="address_street"
                  placeholder="Nome da rua"
                  {...form.register('address_street')}
                />
                {form.formState.errors.address_street && (
                  <p className="text-sm text-destructive">{form.formState.errors.address_street.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_number">Número *</Label>
                <Input
                  id="address_number"
                  placeholder="123"
                  {...form.register('address_number')}
                />
                {form.formState.errors.address_number && (
                  <p className="text-sm text-destructive">{form.formState.errors.address_number.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address_neighborhood">Bairro *</Label>
                <Input
                  id="address_neighborhood"
                  placeholder="Nome do bairro"
                  {...form.register('address_neighborhood')}
                />
                {form.formState.errors.address_neighborhood && (
                  <p className="text-sm text-destructive">{form.formState.errors.address_neighborhood.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_postal_code">CEP *</Label>
                <Input
                  id="address_postal_code"
                  placeholder="00000-000"
                  {...form.register('address_postal_code')}
                />
                {form.formState.errors.address_postal_code && (
                  <p className="text-sm text-destructive">{form.formState.errors.address_postal_code.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado *</Label>
                <Select
                  value={form.watch('address_state')}
                  onValueChange={(value) => {
                    form.setValue('address_state', value);
                    form.setValue('address_city', ''); // Reset city when state changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state.sigla} value={state.sigla}>
                        {state.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.address_state && (
                  <p className="text-sm text-destructive">{form.formState.errors.address_state.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Select
                  value={form.watch('address_city')}
                  onValueChange={(value) => form.setValue('address_city', value)}
                  disabled={!selectedState}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.address_city && (
                  <p className="text-sm text-destructive">{form.formState.errors.address_city.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_complement">Complemento</Label>
              <Input
                id="address_complement"
                placeholder="Apartamento, bloco, etc. (opcional)"
                {...form.register('address_complement')}
              />
              {form.formState.errors.address_complement && (
                <p className="text-sm text-destructive">{form.formState.errors.address_complement.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Cadastrando..." : "Cadastrar Cliente"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};