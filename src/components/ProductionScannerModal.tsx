
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Scan, Plus, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";
import { addProductionItem, getProductionItems, updateProductionStatus, ProductionItem } from "@/services/productionService";
import { useEffect } from "react";

interface ProductionScannerModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const ProductionScannerModal = ({ order, isOpen, onClose, onUpdate }: ProductionScannerModalProps) => {
  const { toast } = useToast();
  const [imei, setImei] = useState("");
  const [productionLineCode, setProductionLineCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [productionItems, setProductionItems] = useState<ProductionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (order && isOpen) {
      loadProductionItems();
    }
  }, [order, isOpen]);

  const loadProductionItems = async () => {
    if (!order) return;
    
    try {
      setIsLoading(true);
      const items = await getProductionItems(order.id);
      setProductionItems(items);
    } catch (error) {
      console.error('Error loading production items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanItem = async () => {
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
        title: "Item escaneado",
        description: `IMEI ${imei} adicionado à produção`
      });

      // Clear form
      setImei("");
      setProductionLineCode("");
      
      // Reload items
      await loadProductionItems();
    } catch (error) {
      console.error('Error scanning item:', error);
      toast({
        title: "Erro",
        description: "Erro ao escanear item",
        variant: "destructive"
      });
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
      onUpdate();
    } catch (error) {
      console.error('Error starting production:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar produção",
        variant: "destructive"
      });
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
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error completing production:', error);
      toast({
        title: "Erro",
        description: "Erro ao concluir produção",
        variant: "destructive"
      });
    }
  };

  if (!order) return null;

  const totalTrackers = order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0);
  const scannedCount = productionItems.length;
  const isProductionComplete = scannedCount >= totalTrackers;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Scanner de Produção - {order.number}
          </DialogTitle>
          <DialogDescription>
            Escaneie os rastreadores durante o processo de produção
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Production Status */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h3 className="font-semibold">Status da Produção</h3>
              <p className="text-sm text-gray-600">
                {scannedCount} de {totalTrackers} rastreadores escaneados
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleStartProduction} variant="outline" size="sm">
                Iniciar Produção
              </Button>
              {isProductionComplete && (
                <Button onClick={handleCompleteProduction} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Concluir Produção
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{Math.round((scannedCount / totalTrackers) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(scannedCount / totalTrackers) * 100}%` }}
              />
            </div>
          </div>

          <Separator />

          {/* Scanner Form */}
          <div className="space-y-4">
            <h3 className="font-semibold">Escanear Novo Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imei">IMEI</Label>
                <Input
                  id="imei"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  placeholder="Digite ou escaneie o IMEI"
                  onKeyPress={(e) => e.key === 'Enter' && handleScanItem()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lineCode">Código da Linha</Label>
                <Input
                  id="lineCode"
                  value={productionLineCode}
                  onChange={(e) => setProductionLineCode(e.target.value)}
                  placeholder="Ex: L001, L002"
                  onKeyPress={(e) => e.key === 'Enter' && handleScanItem()}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleScanItem} 
                  disabled={isScanning || !imei.trim() || !productionLineCode.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isScanning ? "Escaneando..." : "Adicionar"}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Scanned Items List */}
          <div className="space-y-4">
            <h3 className="font-semibold">Itens Escaneados ({productionItems.length})</h3>
            {isLoading ? (
              <div className="text-center py-4">Carregando...</div>
            ) : productionItems.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {productionItems.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        #{index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{item.imei}</p>
                        <p className="text-sm text-gray-600">Linha: {item.production_line_code}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(item.scanned_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum item escaneado ainda</p>
                <p className="text-sm">Use o formulário acima para começar</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductionScannerModal;
