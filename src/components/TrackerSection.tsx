
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, X } from "lucide-react";
import { Tracker, configurationTypes, trackerModels } from "@/types/order";

interface TrackerSectionProps {
  trackers: Tracker[];
  setTrackers: (trackers: Tracker[]) => void;
  configurationType: string;
  setConfigurationType: (value: string) => void;
  trackerModel: string;
  setTrackerModel: (value: string) => void;
  trackerQuantity: number;
  setTrackerQuantity: (value: number) => void;
}

const TrackerSection = ({
  trackers,
  setTrackers,
  configurationType,
  setConfigurationType,
  trackerModel,
  setTrackerModel,
  trackerQuantity,
  setTrackerQuantity
}: TrackerSectionProps) => {
  const addTracker = () => {
    if (trackerModel && trackerQuantity > 0) {
      setTrackers([...trackers, { model: trackerModel, quantity: trackerQuantity }]);
      setTrackerModel("");
      setTrackerQuantity(1);
    }
  };

  const removeTracker = (index: number) => {
    setTrackers(trackers.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rastreadores e Configuração</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Modelo do Rastreador</Label>
            <Select value={trackerModel} onValueChange={setTrackerModel}>
              <SelectTrigger>
                <SelectValue placeholder="Modelo" />
              </SelectTrigger>
              <SelectContent>
                {trackerModels.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min="1"
              value={trackerQuantity}
              onChange={(e) => setTrackerQuantity(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="configurationType">Tipo de Configuração*</Label>
            <Select value={configurationType} onValueChange={setConfigurationType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a configuração" />
              </SelectTrigger>
              <SelectContent>
                {configurationTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={addTracker} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        {trackers.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium">Rastreadores Adicionados:</h4>
              <div className="space-y-2">
                {trackers.map((tracker, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">
                      {tracker.model} - {tracker.quantity}x
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeTracker(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {configurationType && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Configuração Selecionada</Badge>
              <span className="text-sm font-medium">{configurationType}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackerSection;
