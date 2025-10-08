import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Image, Link, Package, Trash2, User, MapPin } from "lucide-react";
import { HomologationCard, softDeleteHomologationCard } from "@/services/homologationService";
import ConfigurationSelector from "./ConfigurationSelector";
import { useQuery } from "@tanstack/react-query";
import { fetchVehicleAccessories, VehicleAccessory } from "@/services/vehicleAccessoryService";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HomologationCardProps {
  card: HomologationCard;
  onClick: () => void;
  onDragStart: () => void;
  onUpdate: () => void;
}

const HomologationCardComponent = ({ card, onClick, onDragStart, onUpdate }: HomologationCardProps) => {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  
  // Fetch vehicle accessories if there's a linked incoming vehicle
  const { data: vehicleAccessories = [] } = useQuery({
    queryKey: ['vehicle-accessories', card.incoming_vehicle_id],
    queryFn: () => fetchVehicleAccessories(card.incoming_vehicle_id!),
    enabled: !!card.incoming_vehicle_id,
  });

  // Fetch incoming vehicle data (includes customer info and address)
  const { data: incomingVehicle } = useQuery({
    queryKey: ['incoming-vehicle', card.incoming_vehicle_id],
    queryFn: async () => {
      if (!card.incoming_vehicle_id) return null;
      const { data, error } = await supabase
        .from('incoming_vehicles')
        .select('*')
        .eq('id', card.incoming_vehicle_id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!card.incoming_vehicle_id,
  });

  const handleDelete = async () => {
    try {
      await softDeleteHomologationCard(card.id);
      toast({
        title: "Card deletado",
        description: "O card de homologação foi removido com sucesso.",
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting homologation card:', error);
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível deletar o card de homologação.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "homologar":
        return "bg-red-100 text-red-800 border-red-200";
      case "em_homologacao":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "agendamento_teste":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "execucao_teste":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "em_testes_finais":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "armazenamento_plataforma":
        return "bg-teal-100 text-teal-800 border-teal-200";
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
      case "agendamento_teste":
        return "Agendamento";
      case "execucao_teste":
        return "Em Teste";
      case "em_testes_finais":
        return "Testes Finais";
      case "armazenamento_plataforma":
        return "Armazenamento";
      case "homologado":
        return "Homologado";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isConfigurationEditable = card.status === 'homologar' || card.status === 'em_homologacao';

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] touch-manipulation"
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      <CardContent className="p-3 md:p-4">
        <div className="space-y-2 md:space-y-3">
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-semibold text-gray-900 text-sm md:text-base leading-tight flex-1 min-w-0">
              <span className="block truncate">{card.brand} {card.model}</span>
              {card.year && (
                <span className="text-xs md:text-sm text-gray-600">({card.year})</span>
              )}
            </h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`text-xs ${getStatusColor(card.status)}`}>
                {getStatusLabel(card.status)}
              </Badge>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja deletar este card de homologação? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Deletar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-1 items-center">
              <span className="text-gray-600 flex-shrink-0 text-xs">Marca:</span>
              <span className="font-medium text-gray-900 truncate text-xs">{card.brand}</span>
            </div>
            
            <div className="flex justify-between gap-1 items-center">
              <span className="text-gray-600 flex-shrink-0 text-xs">Modelo:</span>
              <span className="font-medium text-gray-900 truncate text-xs">{card.model}</span>
            </div>

            {card.year && (
              <div className="flex justify-between gap-1 items-center">
                <span className="text-gray-600 flex-shrink-0 text-xs">Ano:</span>
                <span className="font-medium text-gray-900 text-xs">{card.year}</span>
              </div>
            )}
            
            <div className="flex justify-between gap-2">
              <span className="text-gray-600 flex-shrink-0">Criado:</span>
              <span className="font-medium text-gray-900 text-right">{formatDate(card.created_at)}</span>
            </div>
          </div>

          <Separator />

          {/* Configuration Selector */}
          <div onClick={(e) => e.stopPropagation()}>
            <ConfigurationSelector
              cardId={card.id}
              currentConfiguration={card.configuration}
              brand={card.brand}
              model={card.model}
              isEditable={isConfigurationEditable}
              onUpdate={onUpdate}
            />
          </div>

          {/* Workflow status indicators */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            {card.incoming_vehicle_id && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Link className="h-3 w-3" />
                <span>Vinculado</span>
              </div>
            )}
            {card.created_order_id && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Package className="h-3 w-3" />
                <span>Pedido criado</span>
              </div>
            )}
          </div>

          {/* Customer Information */}
          {incomingVehicle && (
            <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
              <h5 className="text-xs font-semibold text-purple-800 mb-1.5 flex items-center gap-1">
                <User className="h-3 w-3" />
                Cliente
              </h5>
              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-purple-600 font-medium">Nome:</span>
                  <span className="text-purple-900 font-semibold truncate">{incomingVehicle.company_name || 'Não informado'}</span>
                </div>
                {incomingVehicle.cpf && (
                  <div className="flex justify-between gap-2">
                    <span className="text-purple-600 font-medium">CPF/CNPJ:</span>
                    <span className="text-purple-900">{incomingVehicle.cpf}</span>
                  </div>
                )}
                {incomingVehicle.phone && (
                  <div className="flex justify-between gap-2">
                    <span className="text-purple-600 font-medium">Telefone:</span>
                    <span className="text-purple-900">{incomingVehicle.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Address Information */}
          {incomingVehicle && (incomingVehicle.address_street || incomingVehicle.address_city) && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
              <h5 className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Endereço
              </h5>
              <div className="space-y-0.5 text-xs">
                {incomingVehicle.address_street && (
                  <div className="text-amber-900">
                    <span className="font-medium">{incomingVehicle.address_street}</span>
                    {incomingVehicle.address_number && <span>, {incomingVehicle.address_number}</span>}
                  </div>
                )}
                {incomingVehicle.address_district && (
                  <div className="text-amber-900">
                    <span>{incomingVehicle.address_district}</span>
                  </div>
                )}
                {incomingVehicle.address_city && (
                  <div className="text-amber-900 font-medium">
                    <span>{incomingVehicle.address_city}</span>
                    {incomingVehicle.address_zip_code && <span> - CEP: {incomingVehicle.address_zip_code}</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vehicle Accessories */}
          {vehicleAccessories.length > 0 && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <h5 className="text-xs font-medium text-blue-800 mb-1">Acessórios do Veículo:</h5>
              <div className="space-y-1">
                {vehicleAccessories.map((accessory) => (
                  <div key={accessory.id} className="flex justify-between items-center text-xs">
                    <span className="text-blue-700 truncate">{accessory.accessory_name}</span>
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {accessory.quantity}x
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {card.notes && (
            <div className="mt-2 md:mt-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-xs text-gray-700 line-clamp-2">{card.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Image className="h-3 w-3 flex-shrink-0" />
              <span className="hidden md:inline">Clique para ver fotos</span>
              <span className="md:hidden">Toque para detalhes</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HomologationCardComponent;
