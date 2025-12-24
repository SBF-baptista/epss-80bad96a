
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";
import { addProductionItem, getProductionItems, updateProductionStatus, ProductionItem } from "@/services/productionService";
import { supabase } from "@/integrations/supabase/client";

export const useProductionItems = (order: Order | null, isOpen: boolean) => {
  const { toast } = useToast();
  const [productionItems, setProductionItems] = useState<ProductionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [realPedidoId, setRealPedidoId] = useState<string | null>(null);

  // Ensure a pedido exists for this order/schedule, create one if needed
  const ensurePedidoExists = async (): Promise<string | null> => {
    if (!order) return null;
    
    try {
      // First check if order.id is already a valid pedido
      const { data: existingPedido } = await supabase
        .from('pedidos')
        .select('id')
        .eq('id', order.id)
        .maybeSingle();
      
      if (existingPedido) {
        setRealPedidoId(existingPedido.id);
        return existingPedido.id;
      }
      
      // If not, create a new pedido for this schedule
      const { data: user } = await supabase.auth.getUser();
      
      const { data: newPedido, error } = await supabase
        .from('pedidos')
        .insert({
          numero_pedido: `PROD-${order.number || order.id.slice(0, 8)}`,
          configuracao: order.configurationType || 'Padrão',
          company_name: order.company_name,
          status: 'producao',
          usuario_id: user.user?.id || null
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating pedido:', error);
        return null;
      }
      
      setRealPedidoId(newPedido.id);
      return newPedido.id;
    } catch (error) {
      console.error('Error ensuring pedido exists:', error);
      return null;
    }
  };

  const loadProductionItems = async () => {
    if (!order) return;
    
    try {
      setIsLoading(true);
      const pedidoId = await ensurePedidoExists();
      if (pedidoId) {
        const items = await getProductionItems(pedidoId);
        setProductionItems(items);
      }
    } catch (error) {
      console.error('Error loading production items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanItem = async (imei: string, productionLineCode: string) => {
    if (!order || !imei.trim() || !productionLineCode.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o IMEI e código da linha de produção",
        variant: "destructive"
      });
      return false;
    }

    try {
      setIsScanning(true);
      
      // Ensure we have a valid pedido_id
      const pedidoId = realPedidoId || await ensurePedidoExists();
      if (!pedidoId) {
        toast({
          title: "Erro",
          description: "Não foi possível criar o pedido de produção",
          variant: "destructive"
        });
        return false;
      }
      
      await addProductionItem(pedidoId, imei.trim(), productionLineCode.trim());
      
      toast({
        title: "Item adicionado com sucesso",
        description: `IMEI ${imei} adicionado à produção na linha ${productionLineCode}`
      });

      // Reload items
      const items = await getProductionItems(pedidoId);
      setProductionItems(items);
      return true;
    } catch (error: any) {
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

  const handleStartProduction = async () => {
    if (!order) return;
    
    try {
      const pedidoId = realPedidoId || await ensurePedidoExists();
      if (!pedidoId) return false;
      
      await updateProductionStatus(pedidoId, 'started');
      toast({
        title: "Produção iniciada",
        description: `Produção do pedido ${order.number} foi iniciada`
      });
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

  const handleCompleteProduction = async () => {
    if (!order) return;
    
    try {
      const pedidoId = realPedidoId || await ensurePedidoExists();
      if (!pedidoId) return false;
      
      await updateProductionStatus(pedidoId, 'completed');
      toast({
        title: "Produção concluída",
        description: `Produção do pedido ${order.number} foi concluída`
      });
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
    if (order && isOpen) {
      loadProductionItems();
    }
  }, [order, isOpen]);

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
