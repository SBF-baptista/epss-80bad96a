import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Calendar, User, Package, MapPin, FileText, Phone, Clock, Plus } from 'lucide-react';
import type { Technician } from '@/services/technicianService';
import type { HomologationKit } from '@/services/homologationKitService';
import type { KitScheduleWithDetails } from '@/services/kitScheduleService';
import type { HomologationStatus } from '@/services/kitHomologationService';
import type { Customer } from '@/services/customerService';
import { getCustomers } from '@/services/customerService';
import { ScheduleModal } from './ScheduleModal';

interface SchedulingSectionProps {
  kits: HomologationKit[];
  technicians: Technician[];
  schedules: KitScheduleWithDetails[];
  homologationStatuses: Map<string, HomologationStatus>;
  onRefresh: () => void;
}

export const SchedulingSection = ({
  kits,
  technicians,
  schedules,
  homologationStatuses,
  onRefresh
}: SchedulingSectionProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsScheduleModalOpen(true);
  };

  const getCustomerSchedules = (customerId: string) => {
    return schedules.filter(schedule => schedule.customer_id === customerId);
  };

  const getHomologatedKits = () => {
    return kits.filter(kit => {
      const status = homologationStatuses.get(kit.id!);
      return status?.isHomologated ?? false;
    });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.document_number.includes(searchTerm) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold">Agendamento de Instalações</h3>
          <p className="text-sm text-muted-foreground">
            Vincule kits homologados aos clientes e agende instalações
          </p>
        </div>
        
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar cliente por nome, documento ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
              <User className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kits Homologados</p>
                <p className="text-2xl font-bold">{getHomologatedKits().length}</p>
              </div>
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendamentos Ativos</p>
                <p className="text-2xl font-bold">
                  {schedules.filter(s => ['scheduled', 'in_progress'].includes(s.status)).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Instalações Completas</p>
                <p className="text-2xl font-bold">
                  {schedules.filter(s => s.status === 'completed').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-hidden">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Clientes Cadastrados</span>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedCustomer(null);
                  setIsScheduleModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-full overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Tente ajustar os termos de busca.' : 'Crie o primeiro agendamento para começar.'}
                </p>
                <Button onClick={() => setIsScheduleModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Agendamento
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCustomers.map((customer) => {
                  const customerSchedules = getCustomerSchedules(customer.id!);
                  const activeSchedules = customerSchedules.filter(s => 
                    ['scheduled', 'in_progress'].includes(s.status)
                  );
                  const completedSchedules = customerSchedules.filter(s => 
                    s.status === 'completed'
                  );

                  return (
                    <Card key={customer.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Customer Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{customer.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {customer.document_type === 'cpf' ? 'CPF' : 'CNPJ'}: {customer.document_number}
                              </p>
                            </div>
                            <Badge variant={activeSchedules.length > 0 ? 'default' : 'outline'}>
                              {activeSchedules.length > 0 ? 'Ativo' : 'Disponível'}
                            </Badge>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              <span>{customer.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              <span>{customer.address_city} - {customer.address_state}</span>
                            </div>
                          </div>

                          {/* Schedule Info */}
                          <div className="space-y-2">
                            {activeSchedules.length > 0 && (
                              <div className="bg-blue-50 p-2 rounded-md">
                                <h5 className="text-xs font-semibold text-blue-800 mb-1">
                                  Agendamentos Ativos ({activeSchedules.length})
                                </h5>
                                {activeSchedules.slice(0, 2).map((schedule) => (
                                  <div key={schedule.id} className="flex items-center justify-between text-xs text-blue-700">
                                    <span>{schedule.kit.name}</span>
                                    <span>
                                      {new Date(schedule.scheduled_date).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                ))}
                                {activeSchedules.length > 2 && (
                                  <p className="text-xs text-blue-600">
                                    +{activeSchedules.length - 2} mais
                                  </p>
                                )}
                              </div>
                            )}

                            {completedSchedules.length > 0 && (
                              <div className="bg-green-50 p-2 rounded-md">
                                <p className="text-xs font-semibold text-green-800">
                                  {completedSchedules.length} instalação(ões) concluída(s)
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleScheduleCustomer(customer)}
                            className="w-full"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            {activeSchedules.length > 0 ? 'Novo Agendamento' : 'Agendar Instalação'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setSelectedCustomer(null);
        }}
        selectedCustomer={selectedCustomer}
        kits={getHomologatedKits()}
        technicians={technicians}
        onSuccess={() => {
          onRefresh();
          setIsScheduleModalOpen(false);
          setSelectedCustomer(null);
          loadCustomers();
        }}
      />
    </div>
  );
};