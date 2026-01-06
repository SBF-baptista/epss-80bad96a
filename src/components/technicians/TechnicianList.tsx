import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getTechnicians, deleteTechnician, type Technician } from "@/services/technicianService";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Edit, Trash2, User, Phone } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TechnicianListProps {
  onEdit?: (technician: Technician) => void;
  onAdd?: () => void;
  refreshKey?: number;
}

export const TechnicianList = ({ onEdit, onAdd, refreshKey }: TechnicianListProps) => {
  const { toast } = useToast();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [filteredTechnicians, setFilteredTechnicians] = useState<Technician[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTechnicians = async () => {
    try {
      const data = await getTechnicians();
      setTechnicians(data);
      setFilteredTechnicians(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao carregar técnicos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTechnicians();
  }, [refreshKey]);

  useEffect(() => {
    const filtered = technicians.filter((technician) =>
      technician.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      technician.address_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      technician.address_state?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTechnicians(filtered);
  }, [searchTerm, technicians]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTechnician(id);
      toast({
        title: "Sucesso",
        description: "Técnico excluído com sucesso",
      });
      loadTechnicians();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao excluir técnico",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <span className="text-muted-foreground">Carregando técnicos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cidade ou estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onAdd} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Novo Técnico
        </Button>
      </div>

      {filteredTechnicians.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              {searchTerm ? "Nenhum técnico encontrado para a busca." : "Nenhum técnico cadastrado ainda."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTechnicians.map((technician) => (
            <Card key={technician.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{technician.name}</CardTitle>
                      {technician.address_city && technician.address_state && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {technician.address_city} - {technician.address_state}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-muted-foreground">
                  {technician.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <strong>Telefone:</strong> {technician.phone}
                    </p>
                  )}
                  
                  {technician.postal_code && (
                    <p>
                      <strong>CEP:</strong> {technician.postal_code}
                    </p>
                  )}
                  
                  {technician.address_street && (
                    <p>
                      <strong>Endereço:</strong> {technician.address_street}
                      {technician.address_number && `, ${technician.address_number}`}
                    </p>
                  )}
                  
                  {technician.address_neighborhood && (
                    <p>
                      <strong>Bairro:</strong> {technician.address_neighborhood}
                    </p>
                  )}
                </div>
                

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(technician)}
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletingId === technician.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o técnico "{technician.name}"? 
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(technician.id!)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};