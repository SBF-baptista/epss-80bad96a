import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Search, RefreshCw } from 'lucide-react';
import { getTechnicians, type Technician } from '@/services/technicianService';
import { fetchHomologationKits, type HomologationKit } from '@/services/homologationKitService';
import { getKitSchedules, type KitScheduleWithDetails } from '@/services/kitScheduleService';
import { ConfigurationStats } from './ConfigurationStats';
import { SchedulingSection } from './SchedulingSection';
import { supabase } from '@/integrations/supabase/client';
import { checkMultipleKitsHomologation, type HomologationStatus } from '@/services/kitHomologationService';

interface ConfigurationDashboardProps {
  onNavigateToSection?: (section: string) => void;
}

export const ConfigurationDashboard = ({ onNavigateToSection }: ConfigurationDashboardProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data states
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [kits, setKits] = useState<HomologationKit[]>([]);
  const [schedules, setSchedules] = useState<KitScheduleWithDetails[]>([]);
  const [homologationStatuses, setHomologationStatuses] = useState<Map<string, HomologationStatus>>(new Map());
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Load homologation statuses
  const loadHomologationStatuses = async (kitsData: HomologationKit[]) => {
    try {
      if (kitsData.length > 0) {
        const statuses = await checkMultipleKitsHomologation(kitsData);
        setHomologationStatuses(statuses);
      }
    } catch (error) {
      console.error('Error loading homologation statuses:', error);
      toast({
        title: "Erro de sincronização",
        description: "Não foi possível sincronizar o status de homologação dos kits.",
        variant: "destructive"
      });
    }
  };

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
      
      // Load homologation statuses after kits are loaded
      await loadHomologationStatuses(kitsData);
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

  // Set up real-time subscription for kit_item_options changes
  useEffect(() => {
    const channel = supabase
      .channel('planning-kit-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kit_item_options'
        },
        (payload) => {
          console.log('Kit item option changed in Planning:', payload);
          // Reload homologation statuses when kit_item_options changes
          if (kits.length > 0) {
            loadHomologationStatuses(kits);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [kits]);

  // Filter data based on search
  const filteredKits = kits.filter(kit => 
    kit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kit.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTechnicians = technicians.filter(tech =>
    tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tech.address_city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get kits without homologation (alerts) - using real homologation status
  const kitsWithoutHomologation = kits.filter(kit => {
    const homologationStatus = homologationStatuses.get(kit.id!);
    return homologationStatus ? !homologationStatus.isHomologated : true;
  });

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
          
          <div className="flex gap-2 items-center">
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
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
        </div>

        {/* Stats */}
        <ConfigurationStats 
          technicians={technicians}
          kits={kits}
          schedules={schedules}
          kitsWithoutHomologation={kitsWithoutHomologation}
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-3 sm:px-6 pb-4 sm:pb-6 overflow-hidden">
        <SchedulingSection
          kits={kits}
          technicians={technicians}
          schedules={schedules}
          homologationStatuses={homologationStatuses}
          onRefresh={loadData}
        />
      </div>
    </div>
  );
};