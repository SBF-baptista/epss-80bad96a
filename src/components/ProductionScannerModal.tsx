
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
import { Scan, Plus, CheckCircle, Keyboard, AlertCircle } from "lucide-react";
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
  const [scannerError, setScannerError] = useState<string>("");

  useEffect(() => {
    if (order && isOpen) {
      loadProductionItems();
      // Reset form when modal opens
      setImei("");
      setProductionLineCode("");
      setScannerError("");
    }
  }, [order, isOpen]);

  // Clean up scanner when modal closes
  useEffect(() => {
    if (!isOpen) {
      setScannerActive(false);
    }
  }, [isOpen]);

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

  const handleScanResult = (result: string) => {
    console.log('Scan result received:', result);
    setScannerError("");
    
    // Auto-fill IMEI field with scanned result
    setImei(result.trim());
    
    toast({
      title: "Código escaneado com sucesso",
      description: `IMEI: ${result}`,
    });
    
    // Focus on production line code field after a short delay
    setTimeout(() => {
      const lineCodeInput = document.getElementById('lineCode');
      if (lineCodeInput) {
        lineCodeInput.focus();
      }
    }, 100);
  };

  const handleScanError = (error: string) => {
    console.error('Scanner error:', error);
    setScannerError(error);
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
        title: "Item adicionado com sucesso",
        description: `IMEI ${imei} adicionado à produção na linha ${productionLineCode}`
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
        description: "Erro ao adicionar item à produção",
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isScanning && imei.trim() && productionLineCode.trim()) {
      handleScanItem();
    }
  };

  if (!order) return null;

  const totalTrackers = order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0);
  const scannedCount = productionItems.length;
  const isProductionComplete = scannedCount >= totalTrackers;
  const progressPercentage = Math.round((scannedCount / totalTrackers) * 100);

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
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <h3 className="font-semibold text-blue-900">Status da Produção</h3>
              <p className="text-sm text-blue-700">
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
              <span className="font-medium">Progresso da Produção</span>
              <span className="font-bold text-blue-600">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
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
              <BarcodeScanner
                onScan={handleScanResult}
                onError={handleScanError}
                isActive={scannerActive}
                onToggle={() => setScannerActive(!scannerActive)}
              />
              
              {scannerError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm text-red-700">{scannerError}</p>
                </div>
              )}
              
              {/* Input fields for scanned data */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scanned-imei">IMEI Escaneado</Label>
                  <Input
                    id="scanned-imei"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    placeholder="Resultado do scanner aparecerá aqui"
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lineCode">Código da Linha</Label>
                  <Input
                    id="lineCode"
                    value={productionLineCode}
                    onChange={(e) => setProductionLineCode(e.target.value)}
                    placeholder="Ex: L001, L002"
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleScanItem} 
                    disabled={isScanning || !imei.trim() || !productionLineCode.trim()}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isScanning ? "Adicionando..." : "Adicionar Item"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <h3 className="font-semibold">Entrada Manual de Dados</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-imei">IMEI</Label>
                  <Input
                    id="manual-imei"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    placeholder="Digite o IMEI manualmente"
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-lineCode">Código da Linha</Label>
                  <Input
                    id="manual-lineCode"
                    value={productionLineCode}
                    onChange={(e) => setProductionLineCode(e.target.value)}
                    placeholder="Ex: L001, L002"
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleScanItem} 
                    disabled={isScanning || !imei.trim() || !productionLineCode.trim()}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isScanning ? "Adicionando..." : "Adicionar Item"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Scanned Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Itens Processados</h3>
              <Badge variant="outline" className="font-mono">
                {productionItems.length} / {totalTrackers}
              </Badge>
            </div>
            
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Carregando itens...</p>
              </div>
            ) : productionItems.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg">
                {productionItems.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono text-xs">
                        #{index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium font-mono">{item.imei}</p>
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
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Nenhum item processado ainda</p>
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
