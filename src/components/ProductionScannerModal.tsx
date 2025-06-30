
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scan, Plus, CheckCircle, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";
import { addProductionItem, getProductionItems, updateProductionStatus, ProductionItem } from "@/services/productionService";
import { useEffect } from "react";
import BarcodeScanner from "./BarcodeScanner";

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
  const [scannerActive, setScannerActive] = useState(false);
  const [activeTab, setActiveTab] = useState("scanner");

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

  const handleScanResult = (result: string) => {
    // Auto-fill IMEI field with scanned result
    setImei(result);
    setScannerActive(false);
    
    toast({
      title: "Código escaneado",
      description: `IMEI: ${result}`,
    });
    
    // Focus on production line code field
    const lineCodeInput = document.getElementById('lineCode');
    if (lineCodeInput) {
      lineCodeInput.focus();
    }
  };

  const handleScanError = (error: string) => {
    toast({
      title: "Erro no scanner",
      description: error,
      variant: "destructive"
    });
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

          {/* Scanner/Manual Input Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scanner" className="flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Scanner
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scanner" className="space-y-4">
              <h3 className="font-semibold">Escanear Código de Barras</h3>
              <BarcodeScanner
                onScan={handleScanResult}
                onError={handleScanError}
                isActive={scannerActive}
                onToggle={() => setScannerActive(!scannerActive)}
              />
              
              {/* Input fields for scanned data */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scanned-imei">IMEI Escaneado</Label>
                  <Input
                    id="scanned-imei"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    placeholder="Resultado do scanner"
                    readOnly={scannerActive}
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
                    {isScanning ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <h3 className="font-semibold">Entrada Manual</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-imei">IMEI</Label>
                  <Input
                    id="manual-imei"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    placeholder="Digite o IMEI"
                    onKeyPress={(e) => e.key === 'Enter' && handleScanItem()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-lineCode">Código da Linha</Label>
                  <Input
                    id="manual-lineCode"
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
                    {isScanning ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

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
                <p className="text-sm">Use o scanner ou entrada manual para começar</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductionScannerModal;
