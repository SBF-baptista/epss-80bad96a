import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";
import { supabase } from "@/integrations/supabase/client";
import { logUpdate } from "@/services/logService";

export interface ProductionItem {
  id: string;
  pedido_id: string | null;
  kit_schedule_id: string | null;
  imei: string;
  serial_number: string | null;
  production_line_code: string;
  scanned_at: string;
  created_by?: string;
}

export const useProductionItems = (
  order: Order | null, 
  isOpen: boolean, 
  scheduleId?: string,
  onStatusChange?: () => void,
  companyName?: string
) => {
  const { toast } = useToast();
  const [productionItems, setProductionItems] = useState<ProductionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Get the schedule ID - either passed directly or from order.id
  const getScheduleId = () => scheduleId || order?.id || null;
  
  // Get company name for bulk operations
  const getCompanyName = () => companyName || order?.company_name || null;

  const loadProductionItems = async () => {
    const currentScheduleId = getScheduleId();
    if (!currentScheduleId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('production_items')
        .select('*')
        .eq('kit_schedule_id', currentScheduleId)
        .order('scanned_at', { ascending: false });
      
      if (error) {
        console.error('Error loading production items:', error);
        return;
      }
      
      setProductionItems(data || []);
    } catch (error) {
      console.error('Error loading production items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get the total expected vehicle count for this company
  const getTotalVehicleCount = async (): Promise<number> => {
    const currentCompanyName = getCompanyName();
    if (!currentCompanyName) return 1;
    
    const normalizedCompanyName = currentCompanyName.trim().toUpperCase();
    const { data: companySchedules } = await supabase
      .from('kit_schedules')
      .select('id, customer_name')
      .in('status', ['in_progress', 'scheduled']);
    
    if (companySchedules) {
      return companySchedules.filter(
        s => s.customer_name?.trim().toUpperCase() === normalizedCompanyName
      ).length;
    }
    return 1;
  };

  // Get total scanned items across all schedules for this company
  const getTotalScannedForCompany = async (): Promise<number> => {
    const currentCompanyName = getCompanyName();
    if (!currentCompanyName) return productionItems.length;
    
    const normalizedCompanyName = currentCompanyName.trim().toUpperCase();
    const { data: companySchedules } = await supabase
      .from('kit_schedules')
      .select('id, customer_name')
      .in('status', ['in_progress', 'scheduled']);
    
    if (!companySchedules) return productionItems.length;
    
    const matchingIds = companySchedules
      .filter(s => s.customer_name?.trim().toUpperCase() === normalizedCompanyName)
      .map(s => s.id);
    
    if (matchingIds.length === 0) return productionItems.length;
    
    const { data: allItems } = await supabase
      .from('production_items')
      .select('id')
      .in('kit_schedule_id', matchingIds);
    
    return allItems?.length || 0;
  };

  const handleScanItem = async (imei: string, productionLineCode: string, serialNumber?: string) => {
    const currentScheduleId = getScheduleId();
    
    if (!currentScheduleId || (!imei.trim() && !serialNumber?.trim())) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o IMEI ou o Serial",
        variant: "destructive"
      });
      return false;
    }

    try {
      setIsScanning(true);

      // Check if IMEI already exists globally
      const { data: existingImei } = await supabase
        .from('production_items')
        .select('id, kit_schedule_id')
        .eq('imei', imei.trim())
        .limit(1);
      
      if (existingImei && existingImei.length > 0) {
        toast({
          title: "IMEI duplicado",
          description: `O IMEI ${imei} já está cadastrado no sistema. Não é possível registrá-lo novamente.`,
          variant: "destructive"
        });
        return false;
      }

      // Check vehicle count limit
      const totalVehicles = await getTotalVehicleCount();
      const totalScanned = await getTotalScannedForCompany();
      
      if (totalScanned >= totalVehicles) {
        toast({
          title: "Limite atingido",
          description: `Já foram escaneados ${totalScanned} de ${totalVehicles} veículos para este cliente. Não é possível adicionar mais.`,
          variant: "destructive"
        });
        return false;
      }
      
      const { data: user } = await supabase.auth.getUser();
      
      const insertData: any = {
        kit_schedule_id: currentScheduleId,
        imei: imei.trim(),
        production_line_code: productionLineCode.trim(),
        created_by: user.user?.id
      };
      if (serialNumber?.trim()) {
        insertData.serial_number = serialNumber.trim();
      }
      
      const { error } = await supabase
        .from('production_items')
        .insert(insertData);
      
      if (error) {
        console.error('Error adding production item:', error);
        toast({
          title: "Erro",
          description: "Erro ao adicionar item à produção",
          variant: "destructive"
        });
        return false;
      }
      
      toast({
        title: "Item adicionado com sucesso",
        description: `IMEI ${imei} adicionado à produção na linha ${productionLineCode} (${totalScanned + 1}/${totalVehicles})`
      });

      // Reload items
      await loadProductionItems();
      return true;
    } catch (error) {
      console.error('Error scanning item:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar item à produção",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsScanning(false);
    }
  };

  // Start production: update status from 'scheduled' to 'in_progress' for ALL schedules of same company
  const handleStartProduction = async () => {
    const currentScheduleId = getScheduleId();
    const currentCompanyName = getCompanyName();
    if (!currentScheduleId) return false;

    try {
      let scheduleIds: string[] = [currentScheduleId];
      
      // If we have a company name, find all schedules for that company with 'scheduled' status
      if (currentCompanyName) {
        const normalizedCompanyName = currentCompanyName.trim().toUpperCase();
        const { data: companySchedules } = await supabase
          .from('kit_schedules')
          .select('id, customer_name')
          .eq('status', 'scheduled');
        
        if (companySchedules) {
          const matchingIds = companySchedules
            .filter(s => s.customer_name?.trim().toUpperCase() === normalizedCompanyName)
            .map(s => s.id);
          if (matchingIds.length > 0) {
            scheduleIds = matchingIds;
          }
        }
      }

      const { error } = await supabase
        .from('kit_schedules')
        .update({ status: 'in_progress' })
        .in('id', scheduleIds);

      if (error) {
        console.error('Error starting production:', error);
        toast({
          title: "Erro",
          description: "Erro ao iniciar produção",
          variant: "destructive"
        });
        return false;
      }

      // Log each schedule movement
      for (const id of scheduleIds) {
        await logUpdate(
          "Logística",
          "status do pedido",
          id,
          "Status alterado de Pedidos para Em Produção"
        );
      }

      toast({
        title: "Produção iniciada",
        description: scheduleIds.length > 1 
          ? `${scheduleIds.length} pedidos movidos para Em Produção`
          : "Pedido movido para Em Produção"
      });
      
      onStatusChange?.();
      return true;
    } catch (error) {
      console.error('Error starting production:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar produção",
        variant: "destructive"
      });
      return false;
    }
  };

  // Complete production: update status from 'in_progress' to 'completed' for ALL schedules of same company
  const handleCompleteProduction = async () => {
    const currentScheduleId = getScheduleId();
    const currentCompanyName = getCompanyName();
    if (!currentScheduleId) return false;

    try {
      let scheduleIds: string[] = [currentScheduleId];
      
      // If we have a company name, find all schedules for that company with 'in_progress' status
      if (currentCompanyName) {
        const normalizedCompanyName = currentCompanyName.trim().toUpperCase();
        const { data: companySchedules } = await supabase
          .from('kit_schedules')
          .select('id, customer_name')
          .eq('status', 'in_progress');
        
        if (companySchedules) {
          const matchingIds = companySchedules
            .filter(s => s.customer_name?.trim().toUpperCase() === normalizedCompanyName)
            .map(s => s.id);
          if (matchingIds.length > 0) {
            scheduleIds = matchingIds;
          }
        }
      }

      const { error } = await supabase
        .from('kit_schedules')
        .update({ status: 'completed' })
        .in('id', scheduleIds);

      if (error) {
        console.error('Error completing production:', error);
        toast({
          title: "Erro",
          description: "Erro ao concluir produção",
          variant: "destructive"
        });
        return false;
      }

      // Log each schedule movement
      for (const id of scheduleIds) {
        await logUpdate(
          "Logística",
          "status do pedido",
          id,
          "Status alterado de Em Produção para Aguardando Envio"
        );
      }

      toast({
        title: "Produção concluída",
        description: scheduleIds.length > 1 
          ? `${scheduleIds.length} pedidos movidos para Aguardando Envio`
          : "Pedido movido para Aguardando Envio"
      });
      
      onStatusChange?.();
      return true;
    } catch (error) {
      console.error('Error completing production:', error);
      toast({
        title: "Erro",
        description: "Erro ao concluir produção",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    if ((order || scheduleId) && isOpen) {
      loadProductionItems();
    }
  }, [order, scheduleId, isOpen]);

  return {
    productionItems,
    isLoading,
    isScanning,
    loadProductionItems,
    handleScanItem,
    handleStartProduction,
    handleCompleteProduction,
  };
};

// Standalone function to fetch production items by schedule ID
export const getProductionItemsByScheduleId = async (scheduleId: string): Promise<ProductionItem[]> => {
  const { data, error } = await supabase
    .from('production_items')
    .select('*')
    .eq('kit_schedule_id', scheduleId)
    .order('scanned_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching production items:', error);
    return [];
  }
  
  return data || [];
};
