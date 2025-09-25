import { useState, useEffect } from 'react';
import { Search, Plus, User, FileText, Phone, Mail, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getCustomers, formatCPF, formatCNPJ, formatPhone } from '@/services/customerService';
import type { Customer } from '@/services/customerService';

interface CustomerSelectorProps {
  onSelectCustomer: (customer: Customer | null) => void;
  onCreateNew: () => void;
  selectedCustomer?: Customer | null;
}

export const CustomerSelector = ({ 
  onSelectCustomer, 
  onCreateNew, 
  selectedCustomer 
}: CustomerSelectorProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [searchTerm]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await getCustomers(searchTerm || undefined);
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
  };

  const clearSelection = () => {
    onSelectCustomer(null);
  };

  if (selectedCustomer) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Cliente Selecionado</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSelection}
          >
            Alterar Cliente
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{selectedCustomer.name}</span>
                <Badge variant="outline">
                  {selectedCustomer.document_type === 'cpf' ? 'CPF' : 'CNPJ'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-3 h-3" />
                <span>
                  {selectedCustomer.document_type === 'cpf' 
                    ? formatCPF(selectedCustomer.document_number)
                    : formatCNPJ(selectedCustomer.document_number)
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span>{formatPhone(selectedCustomer.phone)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span>{selectedCustomer.email}</span>
              </div>
              
              <Separator />
              
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3 mt-0.5" />
                <div>
                  <p>{selectedCustomer.address_street}, {selectedCustomer.address_number}</p>
                  <p>{selectedCustomer.address_neighborhood}</p>
                  <p>{selectedCustomer.address_city} - {selectedCustomer.address_state}</p>
                  <p>CEP: {selectedCustomer.address_postal_code}</p>
                  {selectedCustomer.address_complement && (
                    <p className="text-xs">{selectedCustomer.address_complement}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Selecionar Cliente</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCreateNew}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, documento ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Carregando clientes...
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </div>
          ) : (
            customers.map((customer) => (
              <Card 
                key={customer.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSelectCustomer(customer)}
              >
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{customer.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {customer.document_type === 'cpf' ? 'CPF' : 'CNPJ'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {customer.document_type === 'cpf' 
                          ? formatCPF(customer.document_number)
                          : formatCNPJ(customer.document_number)
                        }
                      </span>
                      <span>{formatPhone(customer.phone)}</span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {customer.address_city} - {customer.address_state}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};