import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Package, Wrench, Droplets } from "lucide-react";

interface KitItemsListProps {
  homologationStatus?: {
    isFullyHomologated: boolean;
    homologatedEquipment: Array<{ item_name: string; quantity: number }>;
    homologatedAccessories: Array<{ item_name: string; quantity: number }>;
    homologatedSupplies: Array<{ item_name: string; quantity: number }>;
    pendingEquipment: Array<{ item_name: string; quantity: number }>;
    pendingAccessories: Array<{ item_name: string; quantity: number }>;
    pendingSupplies: Array<{ item_name: string; quantity: number }>;
  };
  kit?: {
    equipment: Array<{ item_name: string; quantity: number }>;
    accessories: Array<{ item_name: string; quantity: number }>;
    supplies: Array<{ item_name: string; quantity: number }>;
  };
  showHomologationStatus?: boolean;
}

export const KitItemsList = ({ 
  homologationStatus, 
  kit, 
  showHomologationStatus = true 
}: KitItemsListProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'equipment':
        return <Package className="h-4 w-4" />;
      case 'accessory':
        return <Wrench className="h-4 w-4" />;
      case 'supply':
        return <Droplets className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const renderItemsList = (items: Array<{ item_name: string; quantity: number }>, type: string, isHomologated?: boolean) => {
    if (items.length === 0) return null;

    return (
      <div key={type} className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {getIcon(type)}
          <span className="capitalize">
            {type === 'equipment' ? 'Equipamentos' : 
             type === 'accessory' ? 'Acessórios' : 'Insumos'}
          </span>
        </div>
        <div className="space-y-1 ml-6">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span>{item.item_name} (Qtd: {item.quantity})</span>
              {showHomologationStatus && (
                <Badge 
                  variant={isHomologated ? "default" : "destructive"}
                  className="text-xs"
                >
                  {isHomologated ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Homologado
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pendente
                    </>
                  )}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (showHomologationStatus && homologationStatus) {
    return (
      <div className="space-y-4">
        {renderItemsList(homologationStatus.homologatedEquipment, 'equipment', true)}
        {renderItemsList(homologationStatus.homologatedAccessories, 'accessory', true)}
        {renderItemsList(homologationStatus.homologatedSupplies, 'supply', true)}
        {renderItemsList(homologationStatus.pendingEquipment, 'equipment', false)}
        {renderItemsList(homologationStatus.pendingAccessories, 'accessory', false)}
        {renderItemsList(homologationStatus.pendingSupplies, 'supply', false)}
      </div>
    );
  }

  if (kit) {
    return (
      <div className="space-y-4">
        {renderItemsList(kit.equipment || [], 'equipment')}
        {renderItemsList(kit.accessories || [], 'accessory')}
        {renderItemsList(kit.supplies || [], 'supply')}
      </div>
    );
  }

  return (
    <div className="text-center py-4 text-gray-500">
      <p>Nenhum item encontrado para este kit.</p>
    </div>
  );
};