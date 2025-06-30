
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scan, Plus, Keyboard, AlertCircle } from "lucide-react";
import BarcodeScanner from "../BarcodeScanner";

interface ProductionScannerTabsProps {
  imei: string;
  productionLineCode: string;
  scannerActive: boolean;
  scannerError: string;
  isScanning: boolean;
  onImeiChange: (value: string) => void;
  onProductionLineCodeChange: (value: string) => void;
  onScannerToggle: () => void;
  onScanResult: (result: string) => void;
  onScanError: (error: string) => void;
  onScanItem: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

const ProductionScannerTabs = ({
  imei,
  productionLineCode,
  scannerActive,
  scannerError,
  isScanning,
  onImeiChange,
  onProductionLineCodeChange,
  onScannerToggle,
  onScanResult,
  onScanError,
  onScanItem,
  onKeyPress,
}: ProductionScannerTabsProps) => {
  const [activeTab, setActiveTab] = useState("scanner");

  return (
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
          onScan={onScanResult}
          onError={onScanError}
          isActive={scannerActive}
          onToggle={onScannerToggle}
        />
        
        {scannerError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-700">{scannerError}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="scanned-imei">IMEI Escaneado</Label>
            <Input
              id="scanned-imei"
              value={imei}
              onChange={(e) => onImeiChange(e.target.value)}
              placeholder="Resultado do scanner aparecerá aqui"
              onKeyPress={onKeyPress}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lineCode">Código da Linha</Label>
            <Input
              id="lineCode"
              value={productionLineCode}
              onChange={(e) => onProductionLineCodeChange(e.target.value)}
              placeholder="Ex: L001, L002"
              onKeyPress={onKeyPress}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={onScanItem} 
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
              onChange={(e) => onImeiChange(e.target.value)}
              placeholder="Digite o IMEI manualmente"
              onKeyPress={onKeyPress}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-lineCode">Código da Linha</Label>
            <Input
              id="manual-lineCode"
              value={productionLineCode}
              onChange={(e) => onProductionLineCodeChange(e.target.value)}
              placeholder="Ex: L001, L002"
              onKeyPress={onKeyPress}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={onScanItem} 
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
  );
};

export default ProductionScannerTabs;
