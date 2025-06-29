
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrderBasicInfoProps {
  orderNumber: string;
  setOrderNumber: (value: string) => void;
  priority: "high" | "medium" | "low" | undefined;
  setPriority: (value: "high" | "medium" | "low" | undefined) => void;
  estimatedDelivery: string;
  setEstimatedDelivery: (value: string) => void;
}

const OrderBasicInfo = ({
  orderNumber,
  setOrderNumber,
  priority,
  setPriority,
  estimatedDelivery,
  setEstimatedDelivery
}: OrderBasicInfoProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="orderNumber">Número do Pedido*</Label>
            <Input
              id="orderNumber"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Ex: 007"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select value={priority || ""} onValueChange={(value) => setPriority(value as "high" | "medium" | "low")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimatedDelivery">Previsão de Entrega</Label>
          <Input
            id="estimatedDelivery"
            type="date"
            value={estimatedDelivery}
            onChange={(e) => setEstimatedDelivery(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderBasicInfo;
