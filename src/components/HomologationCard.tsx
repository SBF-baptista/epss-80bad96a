
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HomologationCard } from "@/services/homologationService";

interface HomologationCardProps {
  card: HomologationCard;
  onClick: () => void;
  onDragStart: () => void;
}

const HomologationCardComponent = ({ card, onClick, onDragStart }: HomologationCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "homologar":
        return "bg-red-100 text-red-800 border-red-200";
      case "em_homologacao":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "em_testes_finais":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "homologado":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "homologar":
        return "A Homologar";
      case "em_homologacao":
        return "Em Homologação";
      case "em_testes_finais":
        return "Em Testes Finais";
      case "homologado":
        return "Homologado";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-gray-900">
              {card.brand} {card.model}
            </h4>
            <Badge className={`text-xs ${getStatusColor(card.status)}`}>
              {getStatusLabel(card.status)}
            </Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Marca:</span>
              <span className="font-medium text-gray-900">{card.brand}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Modelo:</span>
              <span className="font-medium text-gray-900">{card.model}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Criado em:</span>
              <span className="font-medium text-gray-900">{formatDate(card.created_at)}</span>
            </div>
          </div>

          {card.notes && (
            <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-xs text-gray-700">{card.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HomologationCardComponent;
