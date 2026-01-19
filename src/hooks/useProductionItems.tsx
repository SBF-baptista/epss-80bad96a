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
  production_line_code: string;
  scanned_at: string;
  created_by?: string;
}

export const useProductionItems = (
  order: Order | null, 
  isOpen: boolean, 
  scheduleId?: string,
  onStatusChange?: () => void
) => {
  const { toast } = useToast();
  const [productionItems, setProductionItems] = useState<ProductionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Get the schedule ID - either passed directly or from order.id
  const getScheduleId = () => scheduleId || order?.id || null;

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

  const handleScanItem = async (imei: string, productionLineCode: string) => {
    const currentScheduleId = getScheduleId();
    
    if (!currentScheduleId || !imei.trim() || !productionLineCode.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o IMEI e código da linha de produção",
        variant: "destructive"
      });
      return false;
    }

    try {
      setIsScanning(true);
      
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('production_items')
        .insert({
          kit_schedule_id: currentScheduleId,
          imei: imei.trim(),
          production_line_code: productionLineCode.trim(),
          created_by: user.user?.id
        });
      
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
        description: `IMEI ${imei} adicionado à produção na linha ${productionLineCode}`
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

  // Start production: update status from 'scheduled' to 'in_progress'
  const handleStartProduction = async () => {
    const currentScheduleId = getScheduleId();
    if (!currentScheduleId) return false;

    try {
      const { error } = await supabase
        .from('kit_schedules')
        .update({ status: 'in_progress' })
        .eq('id', currentScheduleId);

      if (error) {
        console.error('Error starting production:', error);
        toast({
          title: "Erro",
          description: "Erro ao iniciar produção",
          variant: "destructive"
        });
        return false;
      }

      await logUpdate(
        "Logística",
        "status do pedido",
        currentScheduleId,
        "Status alterado de Pedidos para Em Produção"
      );

      toast({
        title: "Produção iniciada",
        description: "Pedido movido para Em Produção"
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

  // Complete production: update status from 'in_progress' to 'completed' (Aguardando Envio)
  const handleCompleteProduction = async () => {
    const currentScheduleId = getScheduleId();
    if (!currentScheduleId) return false;

    try {
      const { error } = await supabase
        .from('kit_schedules')
        .update({ status: 'completed' })
        .eq('id', currentScheduleId);

      if (error) {
        console.error('Error completing production:', error);
        toast({
          title: "Erro",
          description: "Erro ao concluir produção",
          variant: "destructive"
        });
        return false;
      }

      await logUpdate(
        "Logística",
        "status do pedido",
        currentScheduleId,
        "Status alterado de Em Produção para Aguardando Envio"
      );

      toast({
        title: "Produção concluída",
        description: "Pedido movido para Aguardando Envio"
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
