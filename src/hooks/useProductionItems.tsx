
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";
import { addProductionItem, getProductionItems, updateProductionStatus, ProductionItem } from "@/services/productionService";

export const useProductionItems = (order: Order | null, isOpen: boolean) => {
  const { toast } = useToast();
  const [productionItems, setProductionItems] = useState<ProductionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const loadProductionItems = async () => {
    if (!order) return;
    
    try {
      setIsLoading(true);
      const items = await getProductionItems(order.id);
      setProductionItems(items);
    } catch (error) {
      console.error('Error loading production items:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar itens de produção",
        variant: "destructive"
      });
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
      return;
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

  const handleStartProduction = async () => {
    if (!order) return;
    
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
    loadProductionItems,
    handleScanItem,
    handleStartProduction,
    handleCompleteProduction,
  };
};
