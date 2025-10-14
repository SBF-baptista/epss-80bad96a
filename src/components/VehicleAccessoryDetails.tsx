import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VehicleAccessory {
  id: string;
  name: string;
  quantity: number;
  company_name?: string;
  usage_type?: string;
  categories?: string;
}

interface VehicleAccessoryDetailsProps {
  accessories: VehicleAccessory[];
  vehicleName: string;
}

const VehicleAccessoryDetails = ({ accessories, vehicleName }: VehicleAccessoryDetailsProps) => {
  if (!accessories || accessories.length === 0) {
    return null;
  }

  return (
    <Card className="mt-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Acessórios - {vehicleName}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {accessories.map((accessory) => (
            <div key={accessory.id} className="flex items-center justify-between py-1">
              <div className="flex flex-col gap-1">
                <span className="text-sm">{accessory.name}</span>
                {accessory.categories && (
                  <span className="text-xs text-muted-foreground">{accessory.categories}</span>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                {accessory.quantity}x
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleAccessoryDetails;