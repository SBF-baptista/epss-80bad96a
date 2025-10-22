import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar, User, Package, Clock, MapPin, Phone, Mail, FileText, Wrench } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Technician } from '@/services/technicianService';
import type { HomologationKit } from '@/services/homologationKitService';
import type { KitScheduleWithDetails } from '@/services/kitScheduleService';
import type { ExtendedScheduleData } from '@/services/mockScheduleDataService';

interface ScheduleCalendarProps {
  schedules: (KitScheduleWithDetails | ExtendedScheduleData)[];
  technicians: Technician[];
  kits: HomologationKit[];
  onRefresh: () => void;
}

export const ScheduleCalendar = ({ 
  schedules, 
  technicians, 
  kits, 
  onRefresh 
}: ScheduleCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [selectedKit, setSelectedKit] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Filter schedules based on selected filters
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      if (selectedTechnician !== 'all' && schedule.technician_id !== selectedTechnician) {
        return false;
      }
      if (selectedKit !== 'all' && schedule.kit_id !== selectedKit) {
        return false;
      }
      return true;
    });
  }, [schedules, selectedTechnician, selectedKit]);

  // Group schedules by customer
  const groupedSchedules = useMemo(() => {
    const groups = new Map<string, (KitScheduleWithDetails | ExtendedScheduleData)[]>();
    
    filteredSchedules.forEach(schedule => {
      const customerKey = schedule.customer_document_number || `${schedule.customer_name}-${schedule.customer_phone}`;
      if (!groups.has(customerKey)) {
        groups.set(customerKey, []);
      }
      groups.get(customerKey)!.push(schedule);
    });

    // Sort visits within each group chronologically
    groups.forEach(visits => {
      visits.sort((a, b) => {
        const dateCompare = new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        
        if (a.installation_time && b.installation_time) {
          return a.installation_time.localeCompare(b.installation_time);
        }
        return 0;
      });
    });

    return Array.from(groups.values());
  }, [filteredSchedules]);

  // Check if schedule is extended with mock data
  const isExtendedSchedule = (schedule: KitScheduleWithDetails | ExtendedScheduleData): schedule is ExtendedScheduleData => {
    return 'company_name' in schedule;
  };

  // Get calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get schedules for a specific date
  const getSchedulesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredSchedules.filter(schedule => schedule.scheduled_date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'in_progress': return 'Em Progresso';
      case 'scheduled': return 'Agendado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Filters and Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Cronograma de Instalações
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                Calendário
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                Lista
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="min-w-[120px] text-center font-medium">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por técnico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os técnicos</SelectItem>
                  {technicians.map((technician) => (
                    <SelectItem key={technician.id} value={technician.id!}>
                      {technician.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedKit} onValueChange={setSelectedKit}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por kit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os kits</SelectItem>
                  {kits.map((kit) => (
                    <SelectItem key={kit.id} value={kit.id!}>
                      {kit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar or List View */}
      <Card className="flex-1">
        <CardContent className="p-0 h-full">
          {viewMode === 'calendar' ? (
            <div className="h-full p-4">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 h-full">
                {calendarDays.map((date) => {
                  const daySchedules = getSchedulesForDate(date);
                  const isToday = isSameDay(date, new Date());

                  return (
                    <div
                      key={date.toISOString()}
                      className={`border rounded-md p-1 min-h-[100px] ${
                        isSameMonth(date, currentDate) ? 'bg-background' : 'bg-muted/30'
                      } ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-primary' : 'text-foreground'
                      }`}>
                        {format(date, 'd')}
                      </div>
                      
                      <div className="space-y-1">
                        {daySchedules.slice(0, 3).map((schedule) => (
                          <div
                            key={schedule.id}
                            className={`text-xs p-1 rounded border ${getStatusColor(schedule.status)}`}
                          >
                            <div className="truncate font-medium">{schedule.kit?.name || 'Kit não especificado'}</div>
                            <div className="truncate">{schedule.technician?.name || 'Técnico não especificado'}</div>
                            {schedule.installation_time && (
                              <div className="truncate">{schedule.installation_time}</div>
                            )}
                          </div>
                        ))}
                        {daySchedules.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{daySchedules.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto p-4">
              {groupedSchedules.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum agendamento encontrado
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedSchedules.map((customerVisits, index) => {
                    const firstVisit = customerVisits[0];
                    return (
                      <div key={index} className="border rounded-lg p-6 hover:bg-muted/20 transition-colors">
                        {/* Customer Information Header */}
                        <div className="flex items-start justify-between mb-4 pb-4 border-b">
                          <div className="flex-1 space-y-2">
                            <h3 className="text-lg font-semibold text-foreground">
                              {firstVisit.customer_name}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                <span>CPF/CNPJ: {firstVisit.customer_document_number}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{firstVisit.customer_phone}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span>{firstVisit.customer_email}</span>
                              </div>
                            </div>

                            {/* Installation Address */}
                            {(firstVisit.installation_address_street || firstVisit.installation_address_city) && (
                              <div className="flex items-start gap-1 text-sm text-muted-foreground">
                                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <div>
                                  {firstVisit.installation_address_street} {firstVisit.installation_address_number}
                                  {firstVisit.installation_address_complement && `, ${firstVisit.installation_address_complement}`}
                                  <br />
                                  {firstVisit.installation_address_neighborhood}, {firstVisit.installation_address_city} - {firstVisit.installation_address_state}
                                  <br />
                                  CEP: {firstVisit.installation_address_postal_code}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <Badge variant="outline" className="ml-4">
                            {customerVisits.length} visita{customerVisits.length > 1 ? 's' : ''}
                          </Badge>
                        </div>

                        {/* All Visits for this Customer */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-foreground">Agendamentos:</h4>
                          {customerVisits.map((visit) => (
                            <div key={visit.id} className="bg-muted/30 rounded-lg p-4 space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4" />
                                  <span className="font-medium">{visit.kit?.name || 'Kit não especificado'}</span>
                                  <Badge className={getStatusColor(visit.status)}>
                                    {getStatusLabel(visit.status)}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span className="font-medium text-foreground">{visit.technician?.name || 'Técnico não especificado'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span className="font-medium text-foreground">
                                    {new Date(visit.scheduled_date).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                {visit.installation_time && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span className="font-medium text-foreground">{visit.installation_time}</span>
                                  </div>
                                )}
                              </div>

                              {visit.kit?.description && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Descrição do Kit:</span> {visit.kit.description}
                                </div>
                              )}

                              {isExtendedSchedule(visit) && (
                                <>
                                  {/* Company and Package Info */}
                                  <div className="bg-muted/50 rounded-md p-3 space-y-2">
                                    <div className="text-sm">
                                      <span className="font-medium text-foreground">Empresa:</span> {visit.company_name}
                                    </div>
                                    <div className="text-sm">
                                      <span className="font-medium text-foreground">Pacote:</span> {visit.package_name}
                                    </div>
                                    
                                    {/* Sales Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                      <div>
                                        <span className="font-medium">Contrato:</span> {visit.sales_info.contract_number}
                                      </div>
                                      <div>
                                        <span className="font-medium">Vendedor:</span> {visit.sales_info.sales_representative}
                                      </div>
                                      {visit.sales_info.total_value && (
                                        <div>
                                          <span className="font-medium">Valor:</span> R$ {visit.sales_info.total_value.toLocaleString('pt-BR')}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Vehicles */}
                                  <div className="space-y-2">
                                    <h5 className="font-medium text-foreground">Veículos:</h5>
                                    {visit.vehicles.map((vehicle, vehicleIndex) => (
                                      <div key={vehicleIndex} className="bg-muted/30 rounded-md p-2 text-sm">
                                        <div className="font-medium text-foreground">
                                          {vehicle.brand} {vehicle.model} ({vehicle.year})
                                        </div>
                                        <div className="text-muted-foreground">
                                          Quantidade: {vehicle.quantity}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Accessories */}
                                  <div className="space-y-2">
                                    <h5 className="font-medium text-foreground">Acessórios:</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {visit.accessories.map((accessory, accessoryIndex) => (
                                        <Badge key={accessoryIndex} variant="outline" className="text-xs">
                                          {accessory}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Insumos */}
                                  <div className="space-y-2">
                                    <h5 className="font-medium text-foreground">Insumos:</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {visit.modules.map((module, moduleIndex) => (
                                        <Badge key={moduleIndex} variant="secondary" className="text-xs">
                                          <Wrench className="w-3 h-3 mr-1" />
                                          {module}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}

                              {visit.notes && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Observações:</span> {visit.notes}
                                </div>
                              )}

                              {visit.homologation_card && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Veículo:</span> {visit.homologation_card.brand} {visit.homologation_card.model}
                                </div>
                              )}

                              {visit.technician?.address_city && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Técnico de:</span> {visit.technician.address_city}
                                  {visit.technician.address_state && ` - ${visit.technician.address_state}`}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};