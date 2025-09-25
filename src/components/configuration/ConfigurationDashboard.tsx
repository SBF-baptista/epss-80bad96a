import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Calendar, Users, Package, AlertTriangle } from 'lucide-react';
import { getTechnicians, type Technician } from '@/services/technicianService';
import { fetchHomologationKits, type HomologationKit } from '@/services/homologationKitService';
import { getKitSchedules, type KitScheduleWithDetails } from '@/services/kitScheduleService';
import { ConfigurationStats } from './ConfigurationStats';
import { KitManagementPanel } from './KitManagementPanel';
import { ScheduleCalendar } from './ScheduleCalendar';

interface ConfigurationDashboardProps {
  onNavigateToSection?: (section: string) => void;
}

export const ConfigurationDashboard = ({ onNavigateToSection }: ConfigurationDashboardProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'kits' | 'schedule'>('overview');
  
  // Data states
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [kits, setKits] = useState<HomologationKit[]>([]);
  const [schedules, setSchedules] = useState<KitScheduleWithDetails[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Load all data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [techniciansData, kitsData, schedulesData] = await Promise.all([
        getTechnicians(),
        fetchHomologationKits(),
        getKitSchedules()
      ]);

      setTechnicians(techniciansData);
      setKits(kitsData);
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da configuração",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter data based on search
  const filteredKits = kits.filter(kit => 
    kit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kit.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTechnicians = technicians.filter(tech =>
    tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tech.address_city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get kits without homologation (alerts)
  const kitsWithoutHomologation = kits.filter(kit => 
    !kit.homologation_card_id || 
    (kit.homologation_card_id && schedules.some(s => s.kit_id === kit.id))
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none px-3 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Planejamento</h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">
              Gerencie técnicos, kits e cronogramas de instalação
            </p>
          </div>
          
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por kit, técnico ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <ConfigurationStats 
          technicians={technicians}
          kits={kits}
          schedules={schedules}
          kitsWithoutHomologation={kitsWithoutHomologation}
        />

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Visão Geral
          </Button>
          <Button
            variant={activeTab === 'kits' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('kits')}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Gestão de Kits
          </Button>
          <Button
            variant={activeTab === 'schedule' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('schedule')}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Cronograma
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 sm:px-6 pb-4 sm:pb-6 overflow-hidden">
        {activeTab === 'overview' && (
          <div className="h-full space-y-4">
            {/* Alerts for kits without homologation */}
            {kitsWithoutHomologation.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="w-5 h-5" />
                    Kits sem Homologação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-orange-700 mb-3">
                    {kitsWithoutHomologation.length} kit(s) precisam de homologação antes da distribuição.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {kitsWithoutHomologation.slice(0, 5).map((kit) => (
                      <Badge key={kit.id} variant="outline" className="border-orange-300 text-orange-800">
                        {kit.name}
                      </Badge>
                    ))}
                    {kitsWithoutHomologation.length > 5 && (
                      <Badge variant="outline" className="border-orange-300 text-orange-800">
                        +{kitsWithoutHomologation.length - 5} mais
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick overview of recent schedules */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Próximos Agendamentos</CardTitle>
              </CardHeader>
              <CardContent className="h-full overflow-auto">
                {schedules.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum agendamento encontrado
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.slice(0, 10).map((schedule) => (
                      <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{schedule.kit.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {schedule.technician.name} • {new Date(schedule.scheduled_date).toLocaleDateString('pt-BR')}
                            {schedule.installation_time && ` às ${schedule.installation_time}`}
                          </p>
                        </div>
                        <Badge variant={
                          schedule.status === 'completed' ? 'default' : 
                          schedule.status === 'in_progress' ? 'secondary' : 'outline'
                        }>
                          {schedule.status === 'scheduled' ? 'Agendado' :
                           schedule.status === 'in_progress' ? 'Em Progresso' :
                           schedule.status === 'completed' ? 'Concluído' : 'Cancelado'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'kits' && (
          <KitManagementPanel
            kits={filteredKits}
            technicians={filteredTechnicians}
            schedules={schedules}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleCalendar
            schedules={schedules}
            technicians={technicians}
            kits={kits}
            onRefresh={loadData}
          />
        )}
      </div>
    </div>
  );
};