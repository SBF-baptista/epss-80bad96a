import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Search, RefreshCw } from 'lucide-react';
import { getTechnicians, type Technician } from '@/services/technicianService';
import { fetchHomologationKits, type HomologationKit } from '@/services/homologationKitService';
import { getKitSchedules, type KitScheduleWithDetails } from '@/services/kitScheduleService';
import { SchedulingSection } from './SchedulingSection';
import { supabase } from '@/integrations/supabase/client';
import { checkMultipleKitsHomologation, type HomologationStatus } from '@/services/kitHomologationService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConfigurationDashboardProps {
  onNavigateToSection?: (section: string) => void;
}

// Helper function to load accessories counts by plate
const loadAccessoriesCounts = async (): Promise<Map<string, number>> => {
  const { data, error } = await supabase
    .from('accessories')
    .select('vehicle_id, incoming_vehicles!accessories_vehicle_id_fkey(plate)')
    .not('vehicle_id', 'is', null);

  if (error) {
    console.error('Error loading accessories counts:', error);
    return new Map();
  }

  const counts = new Map<string, number>();
  data?.forEach((acc: any) => {
    const plate = acc.incoming_vehicles?.plate;
    if (plate) {
      const normalizedPlate = plate.trim().toUpperCase();
      const current = counts.get(normalizedPlate) || 0;
      counts.set(normalizedPlate, current + 1);
    }
  });
  return counts;
};

export const ConfigurationDashboard = ({ onNavigateToSection }: ConfigurationDashboardProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data states
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [kits, setKits] = useState<HomologationKit[]>([]);
  const [schedules, setSchedules] = useState<KitScheduleWithDetails[]>([]);
  const [homologationStatuses, setHomologationStatuses] = useState<Map<string, HomologationStatus>>(new Map());
  const [accessoriesByPlate, setAccessoriesByPlate] = useState<Map<string, number>>(new Map());
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Load all data in parallel - including homologation statuses and accessories
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load all base data in parallel
      const [techniciansData, kitsData, schedulesData, accessoriesData] = await Promise.all([
        getTechnicians(),
        fetchHomologationKits(),
        getKitSchedules(),
        loadAccessoriesCounts()
      ]);

      // Load homologation statuses (depends on kitsData)
      const homologationStatusesData = kitsData.length > 0 
        ? await checkMultipleKitsHomologation(kitsData)
        : new Map<string, HomologationStatus>();

      // Update all states at once to minimize re-renders
      setTechnicians(techniciansData);
      setKits(kitsData);
      setSchedules(schedulesData);
      setAccessoriesByPlate(accessoriesData);
      setHomologationStatuses(homologationStatusesData);
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

  // Set up real-time subscription for kit_item_options and accessories changes
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
        () => {
          console.log('Kit item option changed in Planning, reloading...');
          loadData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accessories'
        },
        () => {
          console.log('Accessories changed, reloading...');
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    <div className="h-screen flex flex-col overflow-hidden bg-muted/20">
      {/* Header */}
      <div className="flex-none px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-3 sm:pb-4 bg-background border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Planejamento
            </h1>
            <p className="text-muted-foreground/80 mt-1.5 text-sm">
              Gerencie técnicos, kits e cronogramas de instalação
            </p>
          </div>
          
          <div className="flex gap-3 items-center">
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2 h-10 px-4 border-border/60 hover:bg-muted/50 hover:border-border transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            
            {/* Search */}
            <div className="relative w-full sm:w-auto sm:min-w-[280px] lg:min-w-[320px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60 w-4 h-4" />
              <Input
                placeholder="Buscar por kit, técnico ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 border-border/60 bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-5 overflow-auto scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-5 bg-muted/60 p-1 h-11 gap-1">
            <TabsTrigger 
              value="active" 
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-5 py-2 text-sm font-medium transition-all hover:text-foreground/80"
            >
              Veículos Pendentes
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-5 py-2 text-sm font-medium transition-all hover:text-foreground/80"
            >
              Planejamentos Concluídos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-0 animate-in fade-in-50 duration-200">
            <SchedulingSection
              kits={kits}
              technicians={technicians}
              schedules={schedules}
              homologationStatuses={homologationStatuses}
              accessoriesByPlate={accessoriesByPlate}
              onRefresh={loadData}
            />
          </TabsContent>
          
          <TabsContent value="completed" className="mt-0 animate-in fade-in-50 duration-200">
            <SchedulingSection
              kits={kits}
              technicians={technicians}
              schedules={schedules.filter(s => ['scheduled', 'in_progress', 'completed', 'shipped', 'sent_to_pipeline'].includes(s.status))}
              homologationStatuses={homologationStatuses}
              accessoriesByPlate={accessoriesByPlate}
              onRefresh={loadData}
              isCompletedView={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};