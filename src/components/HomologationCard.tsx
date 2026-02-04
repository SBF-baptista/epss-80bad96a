import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Link, Package, Trash2, Calendar } from "lucide-react";
import { HomologationCard, softDeleteHomologationCard } from "@/services/homologationService";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

interface HomologationCardProps {
  card: HomologationCard;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onUpdate: () => void;
}

const HomologationCardComponent = ({ card, onClick, onDragStart, onUpdate }: HomologationCardProps) => {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isAdminUser = isAdmin();

  const handleDragStart = (e: React.DragEvent) => {
    if (!isAdminUser) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
    onDragStart(e);
  };

  return (
    <Card
      className="cursor-pointer bg-white border-border/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl touch-manipulation active:scale-[0.98]"
      onClick={onClick}
      draggable={isAdminUser}
      onDragStart={isAdminUser ? handleDragStart : undefined}
    >
      <CardContent className="p-3 md:p-4">
        <div className="space-y-2">
          {/* Header: Vehicle Name + Delete */}
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-bold text-foreground text-sm md:text-base leading-tight flex-1 min-w-0">
              {card.model}
            </h4>
            {isAdminUser && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Deletar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          {/* Body: Brand, Model, Year */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-medium text-foreground">{card.brand}</span>
            <span className="text-foreground/70">•</span>
            <span className="text-foreground">{card.model}</span>
            {card.year && (
              <>
                <span className="text-foreground/70">•</span>
                <span className="text-foreground">{card.year}</span>
              </>
            )}
          </div>

          {/* Configuration - only displayed when homologated */}
          {card.status === 'homologado' && card.configuration && (
            <div className="text-xs bg-muted/50 px-2 py-1.5 rounded-lg">
              <span className="text-muted-foreground">Config: </span>
              <span className="font-medium text-foreground">{card.configuration}</span>
            </div>
          )}

          {/* Footer: Date + Status Badges */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="flex items-center gap-1 text-[11px] text-foreground">
              <Calendar className="h-3 w-3" />
              <span>Criado em {formatDate(card.created_at)}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {card.incoming_vehicle_id && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                  <Link className="h-2.5 w-2.5 mr-0.5" />
                  Vinculado
                </Badge>
              )}
              {card.created_order_id && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15">
                  <Package className="h-2.5 w-2.5 mr-0.5" />
                  Pedido
                </Badge>
              )}
            </div>
          </div>

          {/* Notes */}
          {card.notes && (
            <div className="mt-2 p-2 bg-muted/50 border border-border/30 rounded-lg">
              <p className="text-[11px] text-foreground/80 line-clamp-2">{card.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HomologationCardComponent;
