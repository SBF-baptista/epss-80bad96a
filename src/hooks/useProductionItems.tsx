
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
  const [isValidPedido, setIsValidPedido] = useState(false);

  // Check if order.id is a valid pedido in the database
  const checkPedidoExists = async () => {
    if (!order) {
      setIsValidPedido(false);
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id')
        .eq('id', order.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking pedido existence:', error);
        setIsValidPedido(false);
        return false;
      }
      
      const exists = !!data;
      setIsValidPedido(exists);
      return exists;
    } catch (error) {
      console.error('Error checking pedido existence:', error);
      setIsValidPedido(false);
      return false;
    }
  };

  const loadProductionItems = async () => {
    if (!order) return;
    
    // Only load if it's a valid pedido
    const exists = await checkPedidoExists();
    if (!exists) return;
    
    try {
      setIsLoading(true);
      const items = await getProductionItems(order.id);
      setProductionItems(items);
    } catch (error) {
      console.error('Error loading production items:', error);
      // Silently fail if pedido doesn't exist
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

    // Check if pedido exists before trying to insert
    if (!isValidPedido) {
      toast({
        title: "Pedido não encontrado",
        description: "Este agendamento não possui um pedido de produção associado. O scanner está disponível apenas para pedidos reais.",
        variant: "destructive"
      });
      return false;
    }

    try {
      setIsScanning(true);
      await addProductionItem(order.id, imei.trim(), productionLineCode.trim());
      
      toast({
        title: "Item adicionado com sucesso",
        description: `IMEI ${imei} adicionado à produção na linha ${productionLineCode}`
      });

      // Reload items
      await loadProductionItems();
      return true;
    } catch (error: any) {
      console.error('Error scanning item:', error);
      
      // Provide a better error message for FK constraint violations
      if (error?.code === '23503') {
        toast({
          title: "Pedido não encontrado",
          description: "Este agendamento não possui um pedido de produção associado.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao adicionar item à produção",
          variant: "destructive"
        });
      }
      return false;
    } finally {
      setIsScanning(false);
    }
  };

  const handleStartProduction = async () => {
    if (!order) return;
    
    if (!isValidPedido) {
      toast({
        title: "Pedido não encontrado",
        description: "Este agendamento não possui um pedido de produção associado.",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      await updateProductionStatus(order.id, 'started');
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
    
    if (!isValidPedido) {
      toast({
        title: "Pedido não encontrado",
        description: "Este agendamento não possui um pedido de produção associado.",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      await updateProductionStatus(order.id, 'completed');
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
    isValidPedido,
    loadProductionItems,
    handleScanItem,
    handleStartProduction,
    handleCompleteProduction,
  };
};

